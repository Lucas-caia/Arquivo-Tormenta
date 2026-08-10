import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { conflict, notFound } from "../../server/errors.js";
import { nowIso } from "../../server/utils.js";
import type { DiscordSubmission } from "./types.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const submissionsDir = path.join(dataDir, "submissions");
const quarantineDir = path.join(dataDir, "quarantine");
const locksDir = path.join(dataDir, ".submission-locks");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCK_TIMEOUT_MS = 5_000;
const STALE_LOCK_MS = 30_000;
const LOCK_RETRY_MS = 75;

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(submissionsDir, { recursive: true }),
    fs.mkdir(quarantineDir, { recursive: true }),
    fs.mkdir(locksDir, { recursive: true })
  ]);
}

function assertSubmissionId(id: string) {
  if (!UUID_PATTERN.test(id)) {
    throw notFound("SUBMISSION_NOT_FOUND", "Submissão não encontrada.");
  }
  return id;
}

function submissionPath(id: string) {
  return path.join(submissionsDir, `${assertSubmissionId(id)}.json`);
}

function quarantinePath(id: string) {
  return path.join(quarantineDir, `${assertSubmissionId(id)}.pending`);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function readJson<T>(filePath: string) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function createSubmissionId() {
  return randomUUID();
}

export function createProtocol(id: string, date = new Date()) {
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `AT-${day}-${id.slice(0, 8).toUpperCase()}`;
}

export async function saveSubmissionWithQuarantine(
  submission: DiscordSubmission,
  buffer: Buffer
) {
  await ensureDirectories();
  const metadataPath = submissionPath(submission.id);
  const filePath = quarantinePath(submission.id);

  try {
    await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o600 });
    await writeJsonAtomic(metadataPath, submission);
  } catch (error) {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
    throw error;
  }

  return submission;
}

export async function readSubmission(id: string) {
  await ensureDirectories();
  try {
    return await readJson<DiscordSubmission>(submissionPath(id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw notFound("SUBMISSION_NOT_FOUND", "Submissão não encontrada.");
    }
    throw error;
  }
}

export async function updateSubmission(submission: DiscordSubmission) {
  await ensureDirectories();
  await writeJsonAtomic(submissionPath(submission.id), submission);
  return submission;
}

export async function readQuarantinedFile(id: string) {
  await ensureDirectories();
  try {
    return await fs.readFile(quarantinePath(id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw notFound(
        "QUARANTINE_FILE_NOT_FOUND",
        "O arquivo em quarentena desta submissão não existe mais."
      );
    }
    throw error;
  }
}

export async function deleteQuarantinedFile(id: string) {
  await ensureDirectories();
  await fs.rm(quarantinePath(id), { force: true });
}

export async function deleteSubmissionMetadata(id: string) {
  await ensureDirectories();
  await fs.rm(submissionPath(id), { force: true });
}

export async function listSubmissions() {
  await ensureDirectories();
  const files = await fs.readdir(submissionsDir);
  const ids = files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5))
    .filter((id) => UUID_PATTERN.test(id));

  return Promise.all(ids.map((id) => readJson<DiscordSubmission>(submissionPath(id))));
}

export async function findPendingSubmissionByHash(hash: string) {
  const submissions = await listSubmissions();
  return submissions.find(
    (submission) => submission.status === "pending" && submission.sha256 === hash
  ) ?? null;
}

export async function withSubmissionLock<T>(
  id: string,
  operation: () => Promise<T>
) {
  await ensureDirectories();
  const safeId = assertSubmissionId(id);
  const lockPath = path.join(locksDir, `${safeId}.lock`);
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      const handle = await fs.open(lockPath, "wx");
      try {
        await handle.writeFile(`${process.pid}:${nowIso()}\n`, "utf8");
        return await operation();
      } finally {
        await handle.close().catch(() => undefined);
        await fs.rm(lockPath, { force: true }).catch(() => undefined);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;

      const stats = await fs.stat(lockPath).catch(() => null);
      if (stats && Date.now() - stats.mtimeMs > STALE_LOCK_MS) {
        await fs.rm(lockPath, { force: true }).catch(() => undefined);
        continue;
      }

      if (Date.now() >= deadline) {
        throw conflict(
          "SUBMISSION_BUSY",
          "Esta submissão já está sendo processada por outro administrador.",
          ["Aguarde alguns segundos e tente novamente."]
        );
      }

      await sleep(LOCK_RETRY_MS);
    }
  }
}
