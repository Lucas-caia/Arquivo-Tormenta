import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { UploadResponse } from "../../shared/types.js";
import type { DiscordSubmission } from "../submissions/types.js";

export const IMPORT_BUTTON_PREFIX = "submission:import:";
export const DISCARD_BUTTON_PREFIX = "submission:discard:";

function safeInlineCode(value: string) {
  return value.replace(/[\r\n`]/g, "_");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pendingActions(submission: DiscordSubmission) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IMPORT_BUTTON_PREFIX}${submission.id}`)
      .setLabel("Importar ficha")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${DISCARD_BUTTON_PREFIX}${submission.id}`)
      .setLabel("Descartar")
      .setStyle(ButtonStyle.Danger)
  );
}

export function pendingReviewMessage(submission: DiscordSubmission) {
  return {
    content: [
      `📥 **Nova submissão — ${submission.protocol}**`,
      "",
      `Enviado por: <@${submission.submittedBy.id}>`,
      `Arquivo: \`${safeInlineCode(submission.originalFilename)}\``,
      `Tamanho: ${formatBytes(submission.size)}`,
      `Expira em: <t:${Math.floor(new Date(submission.expiresAt).getTime() / 1000)}:R>`,
      "",
      "🛡️ **Segurança:** aguardando aprovação. O PDF está em quarentena e ainda não foi enviado ao parser.",
      "",
      "Somente administradores configurados podem usar os botões abaixo."
    ].join("\n"),
    components: [pendingActions(submission)]
  };
}

function resultDescription(result: UploadResponse) {
  switch (result.tipo) {
    case "nova":
      return `Nova ficha **${result.ficha.nome}** criada como pendente de aprovação.`;
    case "revisao":
      return `Revisão de **${result.revisao.nome}** criada com sucesso.`;
    case "sem-alteracoes":
      return `**${result.ficha.nome}** já estava atualizada; nenhuma alteração foi encontrada.`;
  }
}

export function importedReviewMessage(
  submission: DiscordSubmission,
  result: UploadResponse
) {
  return {
    content: [
      `✅ **${submission.protocol} — importada**`,
      "",
      `Arquivo: \`${safeInlineCode(submission.originalFilename)}\``,
      "🛡️ ClamAV: arquivo limpo.",
      resultDescription(result),
      submission.decision?.decidedBy
        ? `Avaliada por: <@${submission.decision.decidedBy.id}>`
        : ""
    ].filter(Boolean).join("\n"),
    components: []
  };
}

export function blockedReviewMessage(
  submission: DiscordSubmission,
  signature: string
) {
  return {
    content: [
      `🚫 **${submission.protocol} — bloqueada**`,
      "",
      `Arquivo: \`${safeInlineCode(submission.originalFilename)}\``,
      "O ClamAV detectou uma ameaça. O arquivo não foi enviado ao parser e foi removido da quarentena.",
      `Detecção: \`${safeInlineCode(signature)}\``
    ].join("\n"),
    components: []
  };
}

export function discardedReviewMessage(submission: DiscordSubmission) {
  return {
    content: [
      `🗑️ **${submission.protocol} — descartada**`,
      "",
      `Arquivo: \`${safeInlineCode(submission.originalFilename)}\``,
      "Nenhum dado foi importado e o arquivo em quarentena foi removido.",
      submission.decision?.decidedBy
        ? `Descartada por: <@${submission.decision.decidedBy.id}>`
        : ""
    ].filter(Boolean).join("\n"),
    components: []
  };
}

export function submissionIdFromButton(customId: string) {
  if (customId.startsWith(IMPORT_BUTTON_PREFIX)) {
    return { action: "import" as const, id: customId.slice(IMPORT_BUTTON_PREFIX.length) };
  }
  if (customId.startsWith(DISCARD_BUTTON_PREFIX)) {
    return { action: "discard" as const, id: customId.slice(DISCARD_BUTTON_PREFIX.length) };
  }
  return null;
}
