export type ClamavConfig = {
  host: string;
  port: number;
  timeoutMs: number;
};

export type DiscordBotConfig = {
  token: string;
  guildId: string;
  submissionChannelId: string;
  reviewChannelId: string;
  adminUserIds: ReadonlySet<string>;
  submissionTtlDays: number;
  clamav: ClamavConfig;
};

function requiredEnv(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function requiredEnvWithLegacy(
  env: NodeJS.ProcessEnv,
  name: string,
  legacyName: string
) {
  const value = env[name]?.trim() || env[legacyName]?.trim();
  if (!value) {
    throw new Error(
      `Variável obrigatória ausente: ${name} (compatibilidade: ${legacyName}).`
    );
  }
  return value;
}

function parseIds(value: string, variableName: string) {
  const ids = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!ids.length) {
    throw new Error(`${variableName} precisa conter pelo menos um ID.`);
  }

  return new Set(ids);
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} precisa ser um número inteiro positivo.`);
  }
  return parsed;
}

export function loadClamavConfig(env: NodeJS.ProcessEnv = process.env): ClamavConfig {
  return {
    host: env.CLAMAV_HOST?.trim() || "127.0.0.1",
    port: parsePositiveInteger(env.CLAMAV_PORT, 3310, "CLAMAV_PORT"),
    timeoutMs: parsePositiveInteger(
      env.CLAMAV_TIMEOUT_MS,
      15_000,
      "CLAMAV_TIMEOUT_MS"
    )
  };
}

export function loadDiscordBotConfig(
  env: NodeJS.ProcessEnv = process.env
): DiscordBotConfig {
  const adminIdsRaw = env.DISCORD_ADMIN_USER_IDS?.trim()
    || env.DISCORD_ALLOWED_USER_IDS?.trim();

  if (!adminIdsRaw) {
    throw new Error(
      "Variável obrigatória ausente: DISCORD_ADMIN_USER_IDS (compatibilidade: DISCORD_ALLOWED_USER_IDS)."
    );
  }

  return {
    token: requiredEnv(env, "DISCORD_TOKEN"),
    guildId: requiredEnv(env, "DISCORD_GUILD_ID"),
    submissionChannelId: requiredEnvWithLegacy(
      env,
      "DISCORD_SUBMISSION_CHANNEL_ID",
      "DISCORD_CHANNEL_ID"
    ),
    reviewChannelId: requiredEnv(env, "DISCORD_REVIEW_CHANNEL_ID"),
    adminUserIds: parseIds(adminIdsRaw, "DISCORD_ADMIN_USER_IDS"),
    submissionTtlDays: parsePositiveInteger(
      env.DISCORD_SUBMISSION_TTL_DAYS,
      14,
      "DISCORD_SUBMISSION_TTL_DAYS"
    ),
    clamav: loadClamavConfig(env)
  };
}
