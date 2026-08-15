import type { Client } from "discord.js";
import { pendingReviewMessage } from "../components/submissionMessages.js";
import type { DiscordBotConfig } from "../config.js";
import { attachReviewMessage } from "./submissionService.js";
import type { DiscordSubmission } from "./types.js";

export async function announceSubmissionForReview(
  client: Client,
  submission: DiscordSubmission,
  config: DiscordBotConfig
) {
  const channel = await client.channels.fetch(config.reviewChannelId);
  if (!channel?.isTextBased() || !("send" in channel)) {
    throw new Error("DISCORD_REVIEW_CHANNEL_ID não aponta para um canal de texto.");
  }

  const message = await channel.send(pendingReviewMessage(submission));
  await attachReviewMessage(submission.id, message.id).catch((error) => {
    console.warn("Não foi possível registrar o ID da mensagem de revisão:", error);
  });

  return submission;
}
