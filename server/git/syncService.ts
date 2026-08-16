import fs from "node:fs/promises";
import path from "node:path";
import type {
  GitActionResponse,
  GitConnectionResponse,
  GitPreview,
  GitStatus
} from "../../shared/types.js";
import { AppError, badRequest, conflict } from "../errors.js";
import { buildGitPreview } from "./changeSummary.js";
import { isDeployKeyConfigured, runGit, withSshEnvironment } from "./command.js";
import { markGitVerified, publicGitSettings, readGitSettings, saveGitSettings } from "./settings.js";
import { compareRemoteScopeChanges } from "./syncPlan.js";
import type { GitSettingsInternal, GitSyncScope, PreparedGitChange } from "./types.js";

const root = process.cwd();
const dataRoot = path.join(root, "data");
const runtimeRoot = path.join(root, "runtime");
const syncRepo = path.join(runtimeRoot, "git-sync");
const syncBranch = "arquivo-tormenta-sync";
const remoteTrackingRef = "refs/remotes/origin/arquivo-tormenta-target";

const scopePaths: Record<GitSyncScope, string> = {
  fichas: "data/fichas",
  revisoes: "data/revisoes"
};

function selectedPaths(settings: GitSettingsInternal) {
  return (Object.keys(scopePaths) as GitSyncScope[])
    .filter((scope) => settings.escopos[scope])
    .map((scope) => scopePaths[scope]);
}

function requireConfigured(settings: GitSettingsInternal) {
  if (!settings.remoteUrl) {
    throw badRequest(
      "GIT_REMOTE_NOT_CONFIGURED",
      "Configure a URL SSH do repositório antes de sincronizar."
    );
  }
}

async function gitAvailable() {
  try {
    await runGit(["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function isSyncRepoInitialized() {
  try {
    const stats = await fs.stat(path.join(syncRepo, ".git"));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function readSyncMarker(key: string) {
  if (!(await isSyncRepoInitialized())) return "";
  try {
    return await runGit(["config", "--get", key], { cwd: syncRepo });
  } catch {
    return "";
  }
}

async function writeSyncMarker(settings: GitSettingsInternal) {
  await runGit(["config", "arquivo-tormenta.remote-url", settings.remoteUrl], { cwd: syncRepo });
  await runGit(["config", "arquivo-tormenta.remote-branch", settings.branch], { cwd: syncRepo });
  await runGit(["config", "user.name", settings.autor.nome], { cwd: syncRepo });
  await runGit(["config", "user.email", settings.autor.email], { cwd: syncRepo });
}

async function createSyncRepository(settings: GitSettingsInternal, env: NodeJS.ProcessEnv) {
  await fs.rm(syncRepo, { recursive: true, force: true });
  await fs.mkdir(syncRepo, { recursive: true });
  await runGit(["init"], { cwd: syncRepo });
  await runGit(["remote", "add", "origin", settings.remoteUrl], { cwd: syncRepo });
  await fetchTargetBranch(settings, env);
  await runGit(["checkout", "-B", syncBranch, "FETCH_HEAD"], { cwd: syncRepo });
  await writeSyncMarker(settings);
}

async function initializeRepository(settings: GitSettingsInternal, env: NodeJS.ProcessEnv) {
  requireConfigured(settings);
  await fs.mkdir(runtimeRoot, { recursive: true });

  const initialized = await isSyncRepoInitialized();
  const [storedRemote, storedBranch] = initialized
    ? await Promise.all([
      readSyncMarker("arquivo-tormenta.remote-url"),
      readSyncMarker("arquivo-tormenta.remote-branch")
    ])
    : ["", ""];

  if (!initialized || storedRemote !== settings.remoteUrl || storedBranch !== settings.branch) {
    await createSyncRepository(settings, env);
    return;
  }

  try {
    // runtime/git-sync é apenas um espelho operacional. Se o estado interno ficar
    // inconsistente, preferimos reconstruí-lo a propagar um deadlock para a interface.
    await runGit(["rev-parse", "--verify", "HEAD"], { cwd: syncRepo });
    await runGit(["reset", "--hard", "HEAD"], { cwd: syncRepo });
    await runGit(["clean", "-fd"], { cwd: syncRepo });
    await runGit(["remote", "set-url", "origin", settings.remoteUrl], { cwd: syncRepo });
    await writeSyncMarker(settings);
  } catch {
    await createSyncRepository(settings, env);
  }
}

async function fetchTargetBranch(settings: GitSettingsInternal, env: NodeJS.ProcessEnv) {
  await runGit(
    ["fetch", "--no-tags", "--depth", "1", "origin", `refs/heads/${settings.branch}`],
    { cwd: syncRepo, env }
  );
  await runGit(["update-ref", remoteTrackingRef, "FETCH_HEAD"], { cwd: syncRepo });
}

async function remoteBranches(settings: GitSettingsInternal, env: NodeJS.ProcessEnv) {
  const output = await runGit(["ls-remote", "--heads", settings.remoteUrl], { env });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[1] ?? "")
    .filter((ref) => ref.startsWith("refs/heads/"))
    .map((ref) => ref.replace("refs/heads/", ""))
    .sort((a, b) => a.localeCompare(b));
}

async function copyLocalScopesIntoRepo(settings: GitSettingsInternal) {
  for (const scope of Object.keys(scopePaths) as GitSyncScope[]) {
    if (!settings.escopos[scope]) continue;
    const relativePath = scopePaths[scope];
    const source = path.join(root, relativePath);
    const destination = path.join(syncRepo, relativePath);
    await fs.rm(destination, { recursive: true, force: true });
    await fs.mkdir(destination, { recursive: true });
    await fs.cp(source, destination, { recursive: true, force: true }).catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }
}

async function stageSelectedScopes(settings: GitSettingsInternal) {
  const paths = selectedPaths(settings);
  // -A inclui adições, alterações e remoções. -f evita que uma regra de ignore
  // local/global esconda uma ficha que faz parte explicitamente do escopo de sync.
  await runGit(["add", "-A", "-f", "--", ...paths], { cwd: syncRepo });
}

async function stagedChanges(settings: GitSettingsInternal): Promise<PreparedGitChange[]> {
  const paths = selectedPaths(settings);
  const output = await runGit(
    ["diff", "--cached", "--name-status", "--no-renames", "--", ...paths],
    { cwd: syncRepo }
  );

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status = "M", ...pathParts] = line.split("\t");
      return {
        status: status.trim(),
        path: pathParts.join("\t").trim().replace(/\\/g, "/")
      };
    })
    .filter((change) => Boolean(change.path));
}


async function applyRepoPathsIntoLocal(pathsToApply: string[]) {
  for (const relativePath of pathsToApply) {
    const normalized = relativePath.replace(/\\/g, "/");
    const source = path.join(syncRepo, normalized);
    const destination = path.join(root, normalized);
    const exists = await fs.stat(source).then(() => true).catch(() => false);

    if (!exists) {
      await fs.rm(destination, { recursive: true, force: true });
      continue;
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, { recursive: true, force: true });
  }
}

async function stagedFingerprintContext(settings: GitSettingsInternal, baseRef: string) {
  const paths = selectedPaths(settings);
  const raw = await runGit(
    ["diff", "--cached", "--raw", "--full-index", "--no-renames", "--", ...paths],
    { cwd: syncRepo }
  );
  return `${baseRef}\n${raw}`;
}


function isRemoteRace(error: unknown) {
  if (!(error instanceof AppError) || error.code !== "GIT_COMMAND_FAILED") return false;
  const detail = [error.message, ...error.details].join("\n");
  return /non-fast-forward|fetch first|rejected|stale info/i.test(detail);
}

async function resetToRef(ref: string) {
  await runGit(["reset", "--hard", ref], { cwd: syncRepo });
  await runGit(["clean", "-fd"], { cwd: syncRepo });
}

async function changedSelectedPathsBetweenRefs(
  settings: GitSettingsInternal,
  fromRef: string,
  toRef: string
) {
  if (fromRef === toRef) return [];
  const paths = selectedPaths(settings);
  const output = await runGit(
    ["diff", "--name-only", "--no-renames", fromRef, toRef, "--", ...paths],
    { cwd: syncRepo }
  );

  return output
    .split("\n")
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

async function localChangesAgainstRef(settings: GitSettingsInternal, ref: string) {
  await resetToRef(ref);
  await copyLocalScopesIntoRepo(settings);
  await stageSelectedScopes(settings);
  return stagedChanges(settings);
}

async function preparePushInternal(
  settings: GitSettingsInternal,
  env: NodeJS.ProcessEnv,
  keepPrepared: boolean
) {
  await initializeRepository(settings, env);
  const baseline = await runGit(["rev-parse", "HEAD"], { cwd: syncRepo });

  let localChanges: PreparedGitChange[];
  try {
    localChanges = await localChangesAgainstRef(settings, baseline);
  } finally {
    await resetToRef(baseline);
  }

  await fetchTargetBranch(settings, env);
  const remoteHead = await runGit(["rev-parse", remoteTrackingRef], { cwd: syncRepo });
  let baseForPush = baseline;

  if (remoteHead !== baseline) {
    const remoteScopeChanges = await changedSelectedPathsBetweenRefs(
      settings,
      baseline,
      remoteHead
    );

    if (remoteScopeChanges.length) {
      let changesAgainstRemote: PreparedGitChange[];
      try {
        changesAgainstRemote = await localChangesAgainstRef(settings, remoteHead);
      } finally {
        await resetToRef(baseline);
      }

      if (!changesAgainstRemote.length) {
        // O conteúdo local já é exatamente igual ao acervo remoto. Isso recupera
        // situações em que o Push terminou, mas a referência operacional ficou antiga.
        await resetToRef(remoteHead);
        return buildGitPreview(settings, [], dataRoot, remoteHead);
      }

      const { conflicts, remotePendingLocally } = compareRemoteScopeChanges(
        remoteScopeChanges,
        localChanges,
        changesAgainstRemote
      );

      if (conflicts.length) {
        throw conflict(
          "GIT_DATA_DIVERGED",
          "O acervo local e o remoto alteraram os mesmos arquivos.",
          [
            "Nenhum lado foi sobrescrito.",
            `Arquivos em conflito: ${conflicts.slice(0, 5).join(", ")}${conflicts.length > 5 ? "…" : ""}`
          ]
        );
      }

      if (remotePendingLocally.length) {
        // Há alterações remotas reais em arquivos que o usuário não modificou localmente.
        // O Pull seguro consegue mesclá-las sem descartar as mudanças locais em outros
        // arquivos; por isso não criamos um deadlock Push <-> Pull.
        throw conflict(
          "GIT_REMOTE_DATA_CHANGED",
          "Há alterações remotas que ainda precisam ser incorporadas ao acervo local.",
          [
            "Use Pull seguro. Alterações locais em outros arquivos serão preservadas.",
            `Arquivos remotos: ${remotePendingLocally.slice(0, 5).join(", ")}${remotePendingLocally.length > 5 ? "…" : ""}`
          ]
        );
      }

      // Todas as alterações de dados feitas remotamente já estão presentes no acervo
      // local. Avançamos a base e preparamos somente as mudanças adicionais locais.
      baseForPush = remoteHead;
    } else {
      // O repositório avançou apenas em código, documentação ou outros arquivos fora
      // dos escopos do Arquivo Tormenta. Isso nunca deve bloquear o Push das fichas.
      baseForPush = remoteHead;
    }
  }

  const changes = await localChangesAgainstRef(settings, baseForPush);
  if (!changes.length) {
    await resetToRef(baseForPush);
    return buildGitPreview(settings, [], dataRoot, baseForPush);
  }

  const fingerprintContext = await stagedFingerprintContext(settings, baseForPush);
  const preview = await buildGitPreview(
    settings,
    changes,
    dataRoot,
    fingerprintContext
  );

  if (!keepPrepared) await resetToRef(baseForPush);
  return preview;
}

export async function getGitStatus(): Promise<GitStatus> {
  const settings = await readGitSettings();
  const [available, keyConfigured, repoInitialized] = await Promise.all([
    gitAvailable(),
    isDeployKeyConfigured(),
    isSyncRepoInitialized()
  ]);
  const configured = Boolean(settings.remoteUrl && settings.branch);
  const connected = available && keyConfigured && configured && Boolean(settings.verificadoEm);

  return {
    conectado: connected,
    gitDisponivel: available,
    chaveConfigurada: keyConfigured,
    configurado: configured,
    repositorioInicializado: repoInitialized,
    remoteUrl: settings.remoteUrl,
    branch: settings.branch,
    alterados: [],
    mensagem: !available
      ? "Git não está disponível neste ambiente."
      : !keyConfigured
        ? "Configure a Deploy Key para habilitar a sincronização."
        : !configured
          ? "Informe o repositório SSH e a branch."
          : settings.verificadoEm
            ? "Configuração verificada e pronta para sincronizar."
            : "Configuração salva. Verifique a conexão antes de sincronizar.",
    verificadoEm: settings.verificadoEm,
    atualizadoEm: new Date().toISOString()
  };
}

export async function updateGitSettings(input: Parameters<typeof saveGitSettings>[0]) {
  const settings = await saveGitSettings(input);
  return {
    settings: publicGitSettings(settings),
    status: await getGitStatus()
  };
}

export async function getGitSettings() {
  return publicGitSettings(await readGitSettings());
}

export async function verifyGitConnection(): Promise<GitConnectionResponse> {
  const settings = await readGitSettings();
  requireConfigured(settings);

  return withSshEnvironment(async (env) => {
    const branches = await remoteBranches(settings, env);
    if (!branches.includes(settings.branch)) {
      throw badRequest(
        "GIT_BRANCH_NOT_FOUND",
        `A branch ${settings.branch} não existe no repositório remoto.`,
        branches.length ? [`Branches disponíveis: ${branches.join(", ")}`] : []
      );
    }
    await markGitVerified();
    return {
      sucesso: true,
      mensagem: "Conexão SSH verificada com sucesso.",
      branches,
      status: await getGitStatus()
    };
  });
}

export async function listGitBranches() {
  const settings = await readGitSettings();
  requireConfigured(settings);
  return withSshEnvironment((env) => remoteBranches(settings, env));
}

export async function previewPush(): Promise<GitPreview> {
  const settings = await readGitSettings();
  requireConfigured(settings);
  return withSshEnvironment((env) => preparePushInternal(settings, env, false));
}

export async function pushRepository(expectedFingerprint: string): Promise<GitActionResponse> {
  if (!expectedFingerprint) {
    throw badRequest("GIT_PREVIEW_REQUIRED", "Prepare e confirme a prévia antes de enviar alterações.");
  }

  const settings = await readGitSettings();
  requireConfigured(settings);

  return withSshEnvironment(async (env) => {
    await initializeRepository(settings, env);
    const initialBase = await runGit(["rev-parse", "HEAD"], { cwd: syncRepo });
    let recoveryBase = initialBase;

    try {
      const preview = await preparePushInternal(settings, env, true);
      // preparePushInternal pode avançar a base quando o remoto mudou apenas fora dos
      // escopos sincronizados. Em qualquer falha posterior, voltamos para essa base
      // segura, e não para um commit antigo.
      recoveryBase = await runGit(["rev-parse", "HEAD"], { cwd: syncRepo });

      if (!preview.total) {
        return {
          sucesso: true,
          mensagem: "Não há alterações selecionadas para enviar.",
          detalhes: "O acervo local já corresponde à última versão sincronizada.",
          status: await getGitStatus()
        };
      }
      if (preview.fingerprint !== expectedFingerprint) {
        await resetToRef(recoveryBase);
        throw conflict(
          "GIT_PREVIEW_STALE",
          "As alterações mudaram depois da prévia.",
          ["Prepare o Push novamente para revisar os arquivos e a mensagem de commit atualizados."]
        );
      }

      await runGit(["commit", "-m", preview.mensagemCommit], { cwd: syncRepo });
      const details = await runGit(
        ["push", "origin", `HEAD:refs/heads/${settings.branch}`],
        { cwd: syncRepo, env }
      );
      await markGitVerified();
      return {
        sucesso: true,
        mensagem: "Push concluído com sucesso.",
        detalhes: details || `${preview.total} arquivo(s) enviado(s).`,
        status: await getGitStatus()
      };
    } catch (error) {
      await runGit(["reset", "--hard", recoveryBase], { cwd: syncRepo }).catch(() => undefined);
      await runGit(["clean", "-fd"], { cwd: syncRepo }).catch(() => undefined);

      if (isRemoteRace(error)) {
        throw conflict(
          "GIT_REMOTE_CHANGED_DURING_PUSH",
          "O repositório remoto mudou enquanto o Push estava sendo preparado.",
          ["Atualize a prévia e confirme novamente. Nenhuma alteração local foi descartada."]
        );
      }

      throw error;
    }
  });
}

export async function pullRepository(): Promise<GitActionResponse> {
  const settings = await readGitSettings();
  requireConfigured(settings);

  return withSshEnvironment(async (env) => {
    await initializeRepository(settings, env);
    const baseline = await runGit(["rev-parse", "HEAD"], { cwd: syncRepo });

    let localChanges: PreparedGitChange[];
    try {
      localChanges = await localChangesAgainstRef(settings, baseline);
    } finally {
      await resetToRef(baseline);
    }

    await fetchTargetBranch(settings, env);
    const remoteHead = await runGit(["rev-parse", remoteTrackingRef], { cwd: syncRepo });

    if (remoteHead === baseline) {
      if (localChanges.length) {
        throw conflict(
          "GIT_LOCAL_CHANGES",
          "Existem alterações locais ainda não sincronizadas.",
          ["Prepare um Push antes do Pull. O remoto não possui mudanças novas para incorporar."]
        );
      }

      return {
        sucesso: true,
        mensagem: "O acervo já está atualizado.",
        detalhes: "Nenhuma alteração remota encontrada.",
        status: await getGitStatus()
      };
    }

    const remoteScopeChanges = await changedSelectedPathsBetweenRefs(
      settings,
      baseline,
      remoteHead
    );

    if (!remoteScopeChanges.length) {
      // Commits de código/documentação não devem interferir na sincronização das fichas.
      await resetToRef(remoteHead);
      await markGitVerified();
      return {
        sucesso: true,
        mensagem: localChanges.length
          ? "Referência do GitHub atualizada sem alterar o acervo local."
          : "O acervo já está atualizado.",
        detalhes: localChanges.length
          ? "As alterações locais de fichas/revisões foram preservadas e continuam prontas para Push."
          : "O repositório remoto mudou apenas fora dos dados sincronizados.",
        status: await getGitStatus()
      };
    }

    let changesAgainstRemote: PreparedGitChange[];
    try {
      changesAgainstRemote = await localChangesAgainstRef(settings, remoteHead);
    } finally {
      await resetToRef(baseline);
    }

    if (!changesAgainstRemote.length) {
      await resetToRef(remoteHead);
      await markGitVerified();
      return {
        sucesso: true,
        mensagem: "Sincronização reconciliada com o GitHub.",
        detalhes: "O acervo local já contém os mesmos dados da branch remota.",
        status: await getGitStatus()
      };
    }

    const { conflicts } = compareRemoteScopeChanges(
      remoteScopeChanges,
      localChanges,
      changesAgainstRemote
    );

    if (conflicts.length) {
      throw conflict(
        "GIT_DATA_DIVERGED",
        "O acervo local e o remoto alteraram os mesmos arquivos.",
        [
          "O Pull foi cancelado para não sobrescrever nenhuma ficha.",
          `Arquivos em conflito: ${conflicts.slice(0, 5).join(", ")}${conflicts.length > 5 ? "…" : ""}`
        ]
      );
    }

    // Não existe conflito nos mesmos arquivos. Aplicamos somente os caminhos que
    // mudaram remotamente, preservando quaisquer fichas/revisões locais alteradas em
    // outros arquivos. Depois avançamos a base interna para o HEAD remoto atual.
    await resetToRef(remoteHead);
    await applyRepoPathsIntoLocal(remoteScopeChanges);
    await markGitVerified();

    return {
      sucesso: true,
      mensagem: "Pull concluído com segurança.",
      detalhes: localChanges.length
        ? "Alterações remotas foram incorporadas sem descartar mudanças locais em outros arquivos."
        : `Dados atualizados a partir de ${settings.branch}.`,
      status: await getGitStatus()
    };
  });
}

export function explainGitError(error: unknown) {
  if (error instanceof AppError) return error;
  return new AppError(
    500,
    "GIT_SYNC_ERROR",
    "A sincronização Git falhou.",
    [error instanceof Error ? error.message : String(error)]
  );
}
