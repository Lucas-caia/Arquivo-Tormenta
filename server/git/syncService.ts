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
    await fs.rm(syncRepo, { recursive: true, force: true });
    await fs.mkdir(syncRepo, { recursive: true });
    await runGit(["init"], { cwd: syncRepo });
    await runGit(["remote", "add", "origin", settings.remoteUrl], { cwd: syncRepo });
    await fetchTargetBranch(settings, env);
    await runGit(["checkout", "-B", syncBranch, "FETCH_HEAD"], { cwd: syncRepo });
    await writeSyncMarker(settings);
    return;
  }

  await runGit(["reset", "--hard", "HEAD"], { cwd: syncRepo });
  await runGit(["clean", "-fd"], { cwd: syncRepo });
  await runGit(["remote", "set-url", "origin", settings.remoteUrl], { cwd: syncRepo });
  await writeSyncMarker(settings);
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

async function replaceDirectory(source: string, destination: string) {
  const temporary = `${destination}.git-sync-${process.pid}-${Date.now()}`;
  const backup = `${destination}.git-backup-${process.pid}-${Date.now()}`;
  await fs.rm(temporary, { recursive: true, force: true });
  await fs.mkdir(temporary, { recursive: true });

  try {
    await fs.cp(source, temporary, { recursive: true, force: true }).catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
    await fs.rename(destination, backup).catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
    await fs.rename(temporary, destination);
    await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true }).catch(() => undefined);
    const destinationExists = await fs.stat(destination).then(() => true).catch(() => false);
    const backupExists = await fs.stat(backup).then(() => true).catch(() => false);
    if (!destinationExists && backupExists) {
      await fs.rename(backup, destination).catch(() => undefined);
    }
    throw error;
  }
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

async function copyRepoScopesIntoLocal(settings: GitSettingsInternal) {
  for (const scope of Object.keys(scopePaths) as GitSyncScope[]) {
    if (!settings.escopos[scope]) continue;
    const relativePath = scopePaths[scope];
    await replaceDirectory(path.join(syncRepo, relativePath), path.join(root, relativePath));
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

async function resetWorkingTree() {
  await runGit(["reset", "--hard", "HEAD"], { cwd: syncRepo });
  await runGit(["clean", "-fd"], { cwd: syncRepo });
}

async function preparePushInternal(settings: GitSettingsInternal, env: NodeJS.ProcessEnv, keepPrepared: boolean) {
  await initializeRepository(settings, env);
  const baseline = await runGit(["rev-parse", "HEAD"], { cwd: syncRepo });
  await copyLocalScopesIntoRepo(settings);
  await stageSelectedScopes(settings);
  const changes = await stagedChanges(settings);
  await fetchTargetBranch(settings, env);
  const remoteHead = await runGit(["rev-parse", remoteTrackingRef], { cwd: syncRepo });

  if (remoteHead !== baseline) {
    await resetWorkingTree();
    throw conflict(
      "GIT_REMOTE_CHANGED",
      "O repositório remoto mudou desde a última sincronização.",
      ["Faça Pull antes de preparar um novo Push. Se houver mudanças locais, resolva-as antes de substituir dados."]
    );
  }

  if (!changes.length) {
    await resetWorkingTree();
    return buildGitPreview(settings, [], dataRoot);
  }

  const preview = await buildGitPreview(settings, changes, dataRoot);
  if (!keepPrepared) await resetWorkingTree();
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
    const baseline = await (async () => {
      await initializeRepository(settings, env);
      return runGit(["rev-parse", "HEAD"], { cwd: syncRepo });
    })();

    try {
      const preview = await preparePushInternal(settings, env, true);
      if (!preview.total) {
        return {
          sucesso: true,
          mensagem: "Não há alterações selecionadas para enviar.",
          detalhes: "O acervo local já corresponde à última versão sincronizada.",
          status: await getGitStatus()
        };
      }
      if (preview.fingerprint !== expectedFingerprint) {
        await resetWorkingTree();
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
      await runGit(["reset", "--hard", baseline], { cwd: syncRepo }).catch(() => undefined);
      await runGit(["clean", "-fd"], { cwd: syncRepo }).catch(() => undefined);
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
    await copyLocalScopesIntoRepo(settings);
    await stageSelectedScopes(settings);
    const localChanges = await stagedChanges(settings);
    await resetWorkingTree();

    if (localChanges.length) {
      throw conflict(
        "GIT_LOCAL_CHANGES",
        "Existem alterações locais ainda não sincronizadas.",
        ["Prepare um Push antes do Pull. O Arquivo Tormenta não sobrescreve alterações locais automaticamente."]
      );
    }

    await fetchTargetBranch(settings, env);
    const remoteHead = await runGit(["rev-parse", remoteTrackingRef], { cwd: syncRepo });
    if (remoteHead === baseline) {
      return {
        sucesso: true,
        mensagem: "O acervo já está atualizado.",
        detalhes: "Nenhuma alteração remota encontrada.",
        status: await getGitStatus()
      };
    }

    await runGit(["reset", "--hard", remoteHead], { cwd: syncRepo });
    await copyRepoScopesIntoLocal(settings);
    await markGitVerified();
    return {
      sucesso: true,
      mensagem: "Pull concluído com sucesso.",
      detalhes: `Dados atualizados a partir de ${settings.branch}.`,
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
