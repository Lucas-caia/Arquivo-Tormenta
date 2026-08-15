import type { Attachment, Client, Message } from "discord.js";
import { AppError } from "../../server/errors.js";
import type { DiscordBotConfig } from "../config.js";
import { downloadAttachment } from "../downloadAttachment.js";
import {
  readSubmissionInboxState,
  writeSubmissionInboxCheckpoint
} from "./inboxState.js";
import { announceSubmissionForReview } from "./reviewChannel.js";
import {
  cancelUnannouncedSubmission,
  receiveDiscordSubmission
} from "./submissionService.js";
import { findSubmissionBySource } from "./submissionStore.js";

const HISTORY_PAGE_SIZE = 100;
const MAX_HISTORY_MESSAGES = 5_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type MessageResult =
  | { kind: "accepted"; protocol: string }
  | { kind: "rejected"; reason: string }
  | { kind: "ignored" }
  | { kind: "retry" };

export type SubmissionSyncResult = {
  discovered: number;
  processed: number;
  accepted: number;
  rejected: number;
  retryPending: boolean;
};

function compareSnowflakes(left: string, right: string) {
  const leftValue = BigInt(left);
  const rightValue = BigInt(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function isPdfAttachment(attachment: Attachment) {
  const contentType = attachment.contentType?.toLowerCase() ?? "";
  return contentType.startsWith("application/pdf")
    || attachment.name.toLowerCase().endsWith(".pdf");
}

function appErrorText(error: AppError) {
  const details = error.details.length ? ` ${error.details.join(" ")}` : "";
  return `${error.message}${details}`;
}

async function safeReply(message: Message, content: string) {
  try {
    await message.reply({
      content,
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    console.warn(
      `Não foi possível responder à mensagem ${message.id} no canal de submissões:`,
      error
    );
  }
}

async function processPdfMessage(
  message: Message,
  attachment: Attachment,
  client: Client,
  config: DiscordBotConfig
): Promise<MessageResult> {
  const existing = await findSubmissionBySource(message.id, attachment.id);
  if (existing) {
    if (existing.status === "pending" && !existing.reviewMessageId) {
      try {
        await announceSubmissionForReview(client, existing, config);
      } catch (error) {
        console.error(
          `Falha ao recuperar anúncio da submissão ${existing.protocol}:`,
          error
        );
        return { kind: "retry" };
      }
    }

    return { kind: "accepted", protocol: existing.protocol };
  }

  let arquivo;
  try {
    arquivo = await downloadAttachment(attachment);
  } catch (error) {
    if (error instanceof AppError && error.code !== "DISCORD_DOWNLOAD_FAILED") {
      return { kind: "rejected", reason: appErrorText(error) };
    }

    console.error(
      `Falha temporária ao baixar o anexo ${attachment.id} da mensagem ${message.id}:`,
      error
    );
    return { kind: "retry" };
  }

  let submission;
  try {
    submission = await receiveDiscordSubmission({
      arquivo,
      submitter: {
        id: message.author.id,
        name: message.author.globalName ?? message.author.username
      },
      guildId: message.guildId!,
      submissionChannelId: message.channelId,
      submittedAt: message.createdAt.toISOString(),
      sourceMessageId: message.id,
      sourceAttachmentId: attachment.id,
      config
    });
  } catch (error) {
    if (error instanceof AppError) {
      return { kind: "rejected", reason: appErrorText(error) };
    }

    console.error(
      `Falha ao registrar o anexo ${attachment.id} da mensagem ${message.id}:`,
      error
    );
    return { kind: "retry" };
  }

  try {
    await announceSubmissionForReview(client, submission, config);
  } catch (error) {
    await cancelUnannouncedSubmission(submission.id).catch((cleanupError) => {
      console.error(
        `Falha ao limpar a submissão ${submission.protocol} sem anúncio administrativo:`,
        cleanupError
      );
    });
    console.error(
      `Falha ao anunciar a submissão ${submission.protocol} no canal administrativo:`,
      error
    );
    return { kind: "retry" };
  }

  return { kind: "accepted", protocol: submission.protocol };
}

async function processSubmissionMessage(
  message: Message,
  client: Client,
  config: DiscordBotConfig
): Promise<MessageResult> {
  if (message.author.bot) return { kind: "ignored" };

  if (Date.now() - message.createdTimestamp > config.submissionTtlDays * DAY_MS) {
    return {
      kind: "rejected",
      reason: `A mensagem ficou mais de ${config.submissionTtlDays} dias aguardando sincronização. Envie o PDF novamente.`
    };
  }

  const pdfAttachments = [...message.attachments.values()].filter(isPdfAttachment);
  if (!pdfAttachments.length) {
    if (!message.attachments.size) return { kind: "ignored" };
    return {
      kind: "rejected",
      reason: "Nenhum PDF foi encontrado. Envie a ficha como anexo `.pdf`."
    };
  }

  if (pdfAttachments.length > 1) {
    return {
      kind: "rejected",
      reason: "Envie apenas uma ficha PDF por mensagem para que cada submissão tenha um protocolo próprio."
    };
  }

  return processPdfMessage(message, pdfAttachments[0], client, config);
}

async function fetchMessagesToSynchronize(
  client: Client,
  config: DiscordBotConfig
) {
  const channel = await client.channels.fetch(config.submissionChannelId);
  if (!channel?.isTextBased() || !("messages" in channel)) {
    throw new Error(
      "DISCORD_SUBMISSION_CHANNEL_ID não aponta para um canal de texto com histórico."
    );
  }

  const state = await readSubmissionInboxState(config.submissionChannelId);
  const cutoff = Date.now() - config.submissionTtlDays * DAY_MS;
  const messages: Message[] = [];
  let before: string | undefined;
  let baselineMessageId: string | undefined;
  let reachedBoundary = false;
  let inspected = 0;

  while (!reachedBoundary) {
    const batch = await channel.messages.fetch({
      limit: HISTORY_PAGE_SIZE,
      ...(before ? { before } : {})
    });
    if (!batch.size) break;

    const page = [...batch.values()].sort((left, right) =>
      compareSnowflakes(right.id, left.id)
    );

    for (const message of page) {
      inspected += 1;
      if (inspected > MAX_HISTORY_MESSAGES) {
        throw new Error(
          `A sincronização excedeu ${MAX_HISTORY_MESSAGES} mensagens sem alcançar o último checkpoint.`
        );
      }

      if (state.lastProcessedMessageId) {
        if (compareSnowflakes(message.id, state.lastProcessedMessageId) <= 0) {
          reachedBoundary = true;
          break;
        }
      } else if (message.createdTimestamp < cutoff) {
        baselineMessageId = message.id;
        reachedBoundary = true;
        break;
      }

      messages.push(message);
    }

    if (reachedBoundary || batch.size < HISTORY_PAGE_SIZE) break;
    before = page.at(-1)?.id;
    if (!before) break;
  }

  messages.sort((left, right) => compareSnowflakes(left.id, right.id));

  return {
    messages,
    baselineMessageId,
    hasCheckpoint: Boolean(state.lastProcessedMessageId)
  };
}

function acceptedReply(protocol: string) {
  return [
    "✅ **Ficha recebida!**",
    "",
    "Ela foi enviada para a fila de avaliação dos administradores.",
    "Aguarde a análise; você não precisa enviar o arquivo novamente.",
    "",
    `Protocolo: \`${protocol}\``
  ].join("\n");
}

export async function syncSubmissionChannel(
  client: Client,
  config: DiscordBotConfig
): Promise<SubmissionSyncResult> {
  const { messages, baselineMessageId, hasCheckpoint } =
    await fetchMessagesToSynchronize(client, config);

  if (!hasCheckpoint && baselineMessageId) {
    await writeSubmissionInboxCheckpoint(
      config.submissionChannelId,
      baselineMessageId
    );
  }

  const result: SubmissionSyncResult = {
    discovered: messages.length,
    processed: 0,
    accepted: 0,
    rejected: 0,
    retryPending: false
  };

  for (const message of messages) {
    const messageResult = await processSubmissionMessage(message, client, config);
    if (messageResult.kind === "retry") {
      result.retryPending = true;
      break;
    }

    await writeSubmissionInboxCheckpoint(config.submissionChannelId, message.id);
    result.processed += 1;

    if (messageResult.kind === "accepted") {
      result.accepted += 1;
      await safeReply(message, acceptedReply(messageResult.protocol));
    } else if (messageResult.kind === "rejected") {
      result.rejected += 1;
      await safeReply(message, `❌ ${messageResult.reason}`);
    }
  }

  return result;
}
