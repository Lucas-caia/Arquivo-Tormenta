import type {
  ButtonInteraction,
  ChatInputCommandInteraction
} from "discord.js";
import type { DiscordBotConfig } from "./config.js";

export function getSubmissionAuthorizationError(
  interaction: ChatInputCommandInteraction,
  config: DiscordBotConfig
) {
  if (interaction.guildId !== config.guildId) {
    return "Este comando só pode ser usado no servidor configurado.";
  }

  if (interaction.channelId !== config.submissionChannelId) {
    return "Envie a ficha no canal configurado para submissões.";
  }

  return null;
}

export function getAdminAuthorizationError(
  interaction: ButtonInteraction,
  config: DiscordBotConfig
) {
  if (interaction.guildId !== config.guildId) {
    return "Esta ação só pode ser usada no servidor configurado.";
  }

  if (interaction.channelId !== config.reviewChannelId) {
    return "Esta ação só pode ser usada no canal privado de revisão.";
  }

  if (!config.adminUserIds.has(interaction.user.id)) {
    return "Você não tem permissão para avaliar fichas.";
  }

  return null;
}
