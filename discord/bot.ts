import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleSubmissionButton } from "./components/submissionActions.js";
import { handleEnviarFicha, enviarFichaCommand } from "./commands/enviarFicha.js";
import { loadDiscordBotConfig } from "./config.js";
import { pingClamav } from "./security/clamdClient.js";
import { syncSubmissionChannel } from "./submissions/channelInbox.js";
import { expireOldSubmissions } from "./submissions/submissionService.js";

async function registerGuildCommands(client: Client, guildId: string) {
  const guild = await client.guilds.fetch(guildId);
  await guild.commands.set([enviarFichaCommand.toJSON()]);
  console.log(`Comando /enviar-ficha registrado em ${guild.name}.`);
}

function loadLocalEnv() {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function logClamavStatus(config: ReturnType<typeof loadDiscordBotConfig>) {
  try {
    await pingClamav(config.clamav);
    console.log(
      `ClamAV disponível em ${config.clamav.host}:${config.clamav.port}.`
    );
  } catch (error) {
    console.warn(
      "ClamAV ainda não está disponível. O bot receberá submissões, mas bloqueará importações até o antivírus responder.",
      error
    );
  }
}

async function startBot() {
  loadLocalEnv();
  const config = loadDiscordBotConfig();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  let inboxQueue = Promise.resolve();
  function enqueueInboxSync(reason: string) {
    const run = inboxQueue.then(async () => {
      const result = await syncSubmissionChannel(client, config);
      if (result.discovered || result.retryPending) {
        console.log(
          `[Discord inbox:${reason}] ${result.processed}/${result.discovered} mensagem(ns) processada(s)`
          + (result.retryPending ? "; nova tentativa ficará pendente." : ".")
        );
      }
      return result;
    });

    inboxQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Bot conectado como ${readyClient.user.tag}.`);

    await registerGuildCommands(client, config.guildId).catch((error) => {
      console.error("Falha ao registrar os comandos do Discord:", error);
    });

    await expireOldSubmissions()
      .then((expired) => {
        if (expired) console.log(`${expired} submissão(ões) antiga(s) expiraram.`);
      })
      .catch((error) => {
        console.error("Falha ao expirar submissões antigas na inicialização:", error);
      });

    await logClamavStatus(config);

    await enqueueInboxSync("startup").catch((error) => {
      console.error(
        "A sincronização assíncrona do canal está indisponível. Slash commands e botões administrativos continuam ativos:",
        error
      );
    });

    const cleanupTimer = setInterval(() => {
      expireOldSubmissions().catch((error) => {
        console.error("Falha ao expirar submissões antigas:", error);
      });
    }, 6 * 60 * 60 * 1000);
    cleanupTimer.unref();

    const reconciliationTimer = setInterval(() => {
      enqueueInboxSync("reconciliation").catch((error) => {
        console.error("Falha ao reconciliar o canal de submissões:", error);
      });
    }, 15 * 60 * 1000);
    reconciliationTimer.unref();

    console.log("Arquivo Tormenta Discord está pronto para receber fichas.");
  });

  client.on(Events.MessageCreate, (message) => {
    if (
      message.author.bot
      || message.guildId !== config.guildId
      || message.channelId !== config.submissionChannelId
    ) {
      return;
    }

    enqueueInboxSync("message-create").catch((error) => {
      console.error("Falha ao sincronizar nova mensagem de submissão:", error);
    });
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === enviarFichaCommand.name) {
        await handleEnviarFicha(interaction, client, config);
      }
      return;
    }

    if (interaction.isButton()) {
      await handleSubmissionButton(interaction, config);
    }
  });

  function shutdown() {
    client.destroy();
    process.exit(0);
  }
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await client.login(config.token);
}

startBot().catch((error) => {
  console.error("Falha ao iniciar o bot do Arquivo Tormenta:", error);
  process.exitCode = 1;
});
