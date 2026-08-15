import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client
} from "discord.js";
import { AppError } from "../../server/errors.js";
import { getSubmissionAuthorizationError } from "../authorization.js";
import type { DiscordBotConfig } from "../config.js";
import { downloadAttachment } from "../downloadAttachment.js";
import { announceSubmissionForReview } from "../submissions/reviewChannel.js";
import {
  cancelUnannouncedSubmission,
  receiveDiscordSubmission
} from "../submissions/submissionService.js";

export const enviarFichaCommand = new SlashCommandBuilder()
  .setName("enviar-ficha")
  .setDescription("Envia uma ficha em PDF para a fila de avaliação.")
  .addAttachmentOption((option) =>
    option
      .setName("arquivo")
      .setDescription("Ficha preenchível em PDF")
      .setRequired(true)
  );

function errorMessage(error: unknown) {
  if (error instanceof AppError) {
    const details = error.details.length
      ? `\n${error.details.map((detail) => `• ${detail}`).join("\n")}`
      : "";
    return `❌ ${error.message}${details}`;
  }

  console.error("Erro inesperado ao receber ficha pelo Discord:", error);
  return "❌ Não foi possível receber a ficha. Tente novamente mais tarde.";
}

export async function handleEnviarFicha(
  interaction: ChatInputCommandInteraction,
  client: Client,
  config: DiscordBotConfig
) {
  const authorizationError = getSubmissionAuthorizationError(interaction, config);
  if (authorizationError) {
    await interaction.reply({
      content: `❌ ${authorizationError}`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const attachment = interaction.options.getAttachment("arquivo", true);
    const arquivo = await downloadAttachment(attachment);
    const submission = await receiveDiscordSubmission({
      arquivo,
      submitter: {
        id: interaction.user.id,
        name: interaction.user.globalName ?? interaction.user.username
      },
      guildId: interaction.guildId!,
      submissionChannelId: interaction.channelId,
      config
    });
    try {
      await announceSubmissionForReview(client, submission, config);
    } catch (error) {
      await cancelUnannouncedSubmission(submission.id).catch((cleanupError) => {
        console.error("Falha ao limpar submissão sem mensagem de revisão:", cleanupError);
      });
      throw error;
    }
    await interaction.editReply([
      "✅ **Ficha recebida!**",
      "",
      "Ela foi enviada para a fila de avaliação dos administradores.",
      "Aguarde a análise; você não precisa enviar o arquivo novamente.",
      "",
      `Protocolo: \`${submission.protocol}\``
    ].join("\n"));
  } catch (error) {
    await interaction.editReply(errorMessage(error));
  }
}
