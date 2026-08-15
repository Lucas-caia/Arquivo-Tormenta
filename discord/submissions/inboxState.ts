import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { nowIso } from "../../server/utils.js";

const submissionsDir = path.join(process.cwd(), "data", "submissions");
const statePath = path.join(submissionsDir, ".inbox-state.json");

export type SubmissionInboxState = {
  version: 1;
  channelId: string;
  lastProcessedMessageId?: string;
  updatedAt: string;
};

function emptyState(channelId: string): SubmissionInboxState {
  return {
    version: 1,
    channelId,
    updatedAt: nowIso()
  };
}

async function ensureDirectory() {
  await fs.mkdir(submissionsDir, { recursive: true });
}

async function writeStateAtomic(state: SubmissionInboxState) {
  await ensureDirectory();
  const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    await fs.rename(temporaryPath, statePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readSubmissionInboxState(channelId: string) {
  await ensureDirectory();

  try {
    const raw = await fs.readFile(statePath, "utf8");
    const state = JSON.parse(raw) as SubmissionInboxState;

    if (state.version !== 1 || state.channelId !== channelId) {
      return emptyState(channelId);
    }

    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyState(channelId);
    }
    throw error;
  }
}

export async function writeSubmissionInboxCheckpoint(
  channelId: string,
  messageId: string
) {
  const state: SubmissionInboxState = {
    version: 1,
    channelId,
    lastProcessedMessageId: messageId,
    updatedAt: nowIso()
  };

  await writeStateAtomic(state);
  return state;
}
