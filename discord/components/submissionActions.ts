import { MessageFlags, type ButtonInteraction } from "discord.js";
import { AppError } from "../../server/errors.js";
import { getAdminAuthorizationError } from "../authorization.js";
import type { DiscordBotConfig } from "../config.js";
import {
  blockedReviewMessage,
  discardedReviewMessage,
  importedReviewMessage,
  submissionIdFromButton
} from "./submissionMessages.js";
import {
  discardDiscordSubmission,
  importDiscordSubmission
} from "../submissions/submissionService.js";

function actor(interaction: ButtonInteraction) {
  return {
    id: interaction.user.id,
    name: interaction.user.globalName ?? interaction.user.username
  };
}

function errorMessage(error: unknown) {
  if (error instanceof AppError) {
    const details = error.details.length
      ? `\n${error.details.map((detail) => `• ${detail}`).join("\n")}`
      : "";
    return `❌ ${error.message}${details}`;
  }

  console.error("Erro inesperado ao avaliar submissão:", error);
  return "❌ Não foi possível concluir esta ação. Nenhuma ficha foi alterada.";
}

export async function handleSubmissionButton(
  interaction: ButtonInteraction,
  config: DiscordBotConfig
) {
  const action = submissionIdFromButton(interaction.customId);
  if (!action) return false;

  const authorizationError = getAdminAuthorizationError(interaction, config);
  if (authorizationError) {
    await interaction.reply({
      content: `❌ ${authorizationError}`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (action.action === "discard") {
      const submission = await discardDiscordSubmission(action.id, actor(interaction));
      await interaction.message.edit(discardedReviewMessage(submission));
      await interaction.editReply(`✅ ${submission.protocol} foi descartada.`);
      return true;
    }

    const outcome = await importDiscordSubmission(action.id, actor(interaction), config);
    if (outcome.kind === "blocked") {
      await interaction.message.edit(
        blockedReviewMessage(outcome.submission, outcome.signature)
      );
      await interaction.editReply(
        `🚫 ${outcome.submission.protocol} foi bloqueada pelo antivírus e não foi importada.`
      );
      return true;
    }

    await interaction.message.edit(
      importedReviewMessage(outcome.submission, outcome.result)
    );
    await interaction.editReply(
      `✅ ${outcome.submission.protocol} passou pelo antivírus e foi processada pelo Arquivo Tormenta.`
    );
    return true;
  } catch (error) {
    await interaction.editReply(errorMessage(error));
    return true;
  }
}
