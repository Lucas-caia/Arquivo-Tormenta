import assert from "node:assert/strict";
import test from "node:test";
import { loadDiscordBotConfig } from "./config.js";

test("carrega configuração nova do bot", () => {
  const config = loadDiscordBotConfig({
    DISCORD_TOKEN: "token",
    DISCORD_GUILD_ID: "guild",
    DISCORD_SUBMISSION_CHANNEL_ID: "submission",
    DISCORD_REVIEW_CHANNEL_ID: "review",
    DISCORD_ADMIN_USER_IDS: "1, 2,2, 3",
    DISCORD_SUBMISSION_TTL_DAYS: "21",
    CLAMAV_HOST: "127.0.0.1",
    CLAMAV_PORT: "3310",
    CLAMAV_TIMEOUT_MS: "12000"
  });

  assert.equal(config.token, "token");
  assert.equal(config.submissionChannelId, "submission");
  assert.equal(config.reviewChannelId, "review");
  assert.deepEqual([...config.adminUserIds], ["1", "2", "3"]);
  assert.equal(config.submissionTtlDays, 21);
  assert.equal(config.clamav.port, 3310);
});

test("aceita nomes antigos para canal e administradores", () => {
  const config = loadDiscordBotConfig({
    DISCORD_TOKEN: "token",
    DISCORD_GUILD_ID: "guild",
    DISCORD_CHANNEL_ID: "legacy-channel",
    DISCORD_REVIEW_CHANNEL_ID: "review",
    DISCORD_ALLOWED_USER_IDS: "1"
  });

  assert.equal(config.submissionChannelId, "legacy-channel");
  assert.deepEqual([...config.adminUserIds], ["1"]);
});

test("recusa configuração sem canal de revisão", () => {
  assert.throws(() => loadDiscordBotConfig({
    DISCORD_TOKEN: "token",
    DISCORD_GUILD_ID: "guild",
    DISCORD_SUBMISSION_CHANNEL_ID: "submission",
    DISCORD_ADMIN_USER_IDS: "1"
  }));
});
