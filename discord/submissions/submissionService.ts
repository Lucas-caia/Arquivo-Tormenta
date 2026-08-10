import type { UploadResponse } from "../../shared/types.js";
import { config as appConfig } from "../../server/config.js";
import { conflict } from "../../server/errors.js";
import { importarFichaPdf } from "../../server/services/importFicha.js";
import { nowIso } from "../../server/utils.js";
import { validatePdfUpload, type PdfUpload } from "../../server/validation.js";
import type { DiscordBotConfig } from "../config.js";
import { scanBufferWithClamav } from "../security/clamdClient.js";
import {
  createProtocol,
  createSubmissionId,
  deleteQuarantinedFile,
  deleteSubmissionMetadata,
  findPendingSubmissionByHash,
  listSubmissions,
  readQuarantinedFile,
  readSubmission,
  saveSubmissionWithQuarantine,
  sha256,
  updateSubmission,
  withSubmissionLock
} from "./submissionStore.js";
import type { DiscordSubmission } from "./types.js";

export type Submitter = {
  id: string;
  name: string;
};

export type ReceiveSubmissionInput = {
  arquivo: PdfUpload;
  submitter: Submitter;
  guildId: string;
  submissionChannelId: string;
  config: DiscordBotConfig;
};

export type AdminActor = {
  id: string;
  name: string;
};

export type ImportSubmissionResult =
  | { kind: "imported"; submission: DiscordSubmission; result: UploadResponse }
  | { kind: "blocked"; submission: DiscordSubmission; signature: string };

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function ensurePending(submission: DiscordSubmission) {
  if (submission.status !== "pending") {
    throw conflict(
      "SUBMISSION_ALREADY_RESOLVED",
      `A submissão ${submission.protocol} já foi finalizada.`,
      [`Status atual: ${submission.status}.`]
    );
  }
}

export async function receiveDiscordSubmission({
  arquivo,
  submitter,
  guildId,
  submissionChannelId,
  config
}: ReceiveSubmissionInput) {
  validatePdfUpload(arquivo, appConfig.maxPdfBytes);

  const fileHash = sha256(arquivo.buffer);
  const duplicate = await findPendingSubmissionByHash(fileHash);
  if (duplicate) {
    throw conflict(
      "DUPLICATE_SUBMISSION",
      "Este mesmo arquivo já está aguardando avaliação.",
      [`Protocolo existente: ${duplicate.protocol}.`]
    );
  }

  const id = createSubmissionId();
  const submittedAt = nowIso();
  const submission: DiscordSubmission = {
    id,
    protocol: createProtocol(id, new Date(submittedAt)),
    status: "pending",
    originalFilename: arquivo.originalname,
    contentType: arquivo.mimetype,
    size: arquivo.size,
    sha256: fileHash,
    submittedAt,
    expiresAt: addDays(submittedAt, config.submissionTtlDays),
    submittedBy: submitter,
    guildId,
    submissionChannelId,
    reviewChannelId: config.reviewChannelId,
    security: { status: "not-scanned" }
  };

  return saveSubmissionWithQuarantine(submission, arquivo.buffer);
}


export async function cancelUnannouncedSubmission(submissionId: string) {
  return withSubmissionLock(submissionId, async () => {
    await deleteQuarantinedFile(submissionId);
    await deleteSubmissionMetadata(submissionId);
  });
}

export async function attachReviewMessage(submissionId: string, messageId: string) {
  return withSubmissionLock(submissionId, async () => {
    const submission = await readSubmission(submissionId);
    const updated = { ...submission, reviewMessageId: messageId };
    return updateSubmission(updated);
  });
}

export async function importDiscordSubmission(
  submissionId: string,
  admin: AdminActor,
  config: DiscordBotConfig
): Promise<ImportSubmissionResult> {
  return withSubmissionLock(submissionId, async () => {
    const submission = await readSubmission(submissionId);
    ensurePending(submission);

    const buffer = await readQuarantinedFile(submission.id);
    const scan = await scanBufferWithClamav(buffer, config.clamav);
    const scannedAt = nowIso();

    if (scan.status === "infected") {
      const blocked: DiscordSubmission = {
        ...submission,
        status: "blocked",
        security: {
          status: "infected",
          scannedAt,
          signature: scan.signature
        },
        decision: {
          action: "blocked",
          decidedAt: scannedAt,
          decidedBy: admin
        }
      };
      await updateSubmission(blocked);
      await deleteQuarantinedFile(submission.id);
      return { kind: "blocked", submission: blocked, signature: scan.signature };
    }

    const cleanSubmission: DiscordSubmission = {
      ...submission,
      security: { status: "clean", scannedAt }
    };
    await updateSubmission(cleanSubmission);

    const result = await importarFichaPdf({
      arquivo: {
        buffer,
        size: submission.size,
        originalname: submission.originalFilename,
        mimetype: submission.contentType
      },
      contexto: {
        origem: "discord",
        enviadoPor: {
          id: submission.submittedBy.id,
          nome: submission.submittedBy.name
        }
      }
    });

    const decidedAt = nowIso();
    const imported: DiscordSubmission = {
      ...cleanSubmission,
      status: "imported",
      decision: {
        action: "imported",
        decidedAt,
        decidedBy: admin,
        result: result.tipo
      }
    };

    await updateSubmission(imported);
    await deleteQuarantinedFile(submission.id);
    return { kind: "imported", submission: imported, result };
  });
}

export async function discardDiscordSubmission(
  submissionId: string,
  admin: AdminActor
) {
  return withSubmissionLock(submissionId, async () => {
    const submission = await readSubmission(submissionId);
    ensurePending(submission);
    const decidedAt = nowIso();
    const discarded: DiscordSubmission = {
      ...submission,
      status: "discarded",
      decision: {
        action: "discarded",
        decidedAt,
        decidedBy: admin
      }
    };
    await updateSubmission(discarded);
    await deleteQuarantinedFile(submission.id);
    return discarded;
  });
}

export async function expireOldSubmissions(now = new Date()) {
  const submissions = await listSubmissions();
  let expired = 0;

  for (const submission of submissions) {
    if (submission.status !== "pending") continue;
    if (new Date(submission.expiresAt).getTime() > now.getTime()) continue;

    await withSubmissionLock(submission.id, async () => {
      const current = await readSubmission(submission.id);
      if (current.status !== "pending") return;

      const expiredAt = nowIso();
      await updateSubmission({
        ...current,
        status: "expired",
        decision: {
          action: "expired",
          decidedAt: expiredAt
        }
      });
      await deleteQuarantinedFile(current.id);
      expired += 1;
    });
  }

  return expired;
}