import fs from "node:fs/promises";
import path from "node:path";
import type { GitSettings } from "../../shared/types.js";
import { badRequest } from "../errors.js";
import type { GitSettingsInternal } from "./types.js";

const runtimeDir = path.resolve(process.cwd(), "runtime");
const settingsPath = path.join(runtimeDir, "git-settings.json");

const defaultSettings: GitSettingsInternal = {
  remoteUrl: "",
  branch: "main",
  escopos: {
    fichas: true,
    revisoes: true
  },
  estiloCommit: "descritivo",
  templates: {
    novaFicha: "ficha: adiciona {nome}",
    fichaAtualizada: "ficha: atualiza {nome} para v{versao}",
    multiplasAlteracoes: "fichas: sincroniza {quantidade} alterações"
  },
  autor: {
    nome: "Arquivo Tormenta",
    email: "arquivo-tormenta@local"
  }
};

function normalizeRemoteUrl(value: unknown) {
  const remoteUrl = String(value ?? "").trim();
  if (!remoteUrl) return "";

  const githubSshPattern = /^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/;
  if (!githubSshPattern.test(remoteUrl)) {
    throw badRequest(
      "INVALID_GIT_REMOTE",
      "Use a URL SSH válida do GitHub.",
      ["Formato esperado: git@github.com:usuario-ou-org/repositorio.git"]
    );
  }
  return remoteUrl.endsWith(".git") ? remoteUrl : `${remoteUrl}.git`;
}

function normalizeBranch(value: unknown) {
  const branch = String(value ?? "").trim();
  const invalid = !branch
    || branch.length > 120
    || /[\s~^:?*\[\\]/.test(branch)
    || branch.includes("..")
    || branch.includes("@{")
    || branch.startsWith("/")
    || branch.endsWith("/")
    || branch.endsWith(".")
    || branch.endsWith(".lock")
    || branch.includes("//");

  if (invalid) {
    throw badRequest("INVALID_GIT_BRANCH", "O nome da branch é inválido.");
  }
  return branch;
}

function normalizeTemplate(value: unknown, label: string) {
  const template = String(value ?? "").trim();
  if (!template || template.length > 180 || /[\r\n]/.test(template)) {
    throw badRequest(
      "INVALID_COMMIT_TEMPLATE",
      `O modelo de commit para ${label} é inválido.`,
      ["Use uma única linha com até 180 caracteres."]
    );
  }
  return template;
}

function normalizeAuthorName(value: unknown) {
  const name = String(value ?? "").trim();
  if (!name || name.length > 100 || /[\r\n]/.test(name)) {
    throw badRequest("INVALID_GIT_AUTHOR", "O nome do autor do commit é inválido.");
  }
  return name;
}

function normalizeAuthorEmail(value: unknown) {
  const email = String(value ?? "").trim();
  if (!email || email.length > 254 || /[\s\r\n]/.test(email) || !email.includes("@")) {
    throw badRequest("INVALID_GIT_AUTHOR_EMAIL", "O e-mail do autor do commit é inválido.");
  }
  return email;
}

export function normalizeGitSettings(input: Partial<GitSettings>): GitSettingsInternal {
  const style = input.estiloCommit ?? defaultSettings.estiloCommit;
  if (!(["descritivo", "conventional", "personalizado"] as const).includes(style)) {
    throw badRequest("INVALID_COMMIT_STYLE", "O estilo de commit selecionado é inválido.");
  }

  const fichas = input.escopos?.fichas ?? defaultSettings.escopos.fichas;
  const revisoes = input.escopos?.revisoes ?? defaultSettings.escopos.revisoes;
  if (!fichas && !revisoes) {
    throw badRequest(
      "EMPTY_GIT_SCOPE",
      "Selecione pelo menos um grupo de arquivos para sincronizar."
    );
  }

  return {
    remoteUrl: normalizeRemoteUrl(input.remoteUrl ?? defaultSettings.remoteUrl),
    branch: normalizeBranch(input.branch ?? defaultSettings.branch),
    escopos: { fichas, revisoes },
    estiloCommit: style,
    templates: {
      novaFicha: normalizeTemplate(
        input.templates?.novaFicha ?? defaultSettings.templates.novaFicha,
        "nova ficha"
      ),
      fichaAtualizada: normalizeTemplate(
        input.templates?.fichaAtualizada ?? defaultSettings.templates.fichaAtualizada,
        "ficha atualizada"
      ),
      multiplasAlteracoes: normalizeTemplate(
        input.templates?.multiplasAlteracoes ?? defaultSettings.templates.multiplasAlteracoes,
        "múltiplas alterações"
      )
    },
    autor: {
      nome: normalizeAuthorName(input.autor?.nome ?? defaultSettings.autor.nome),
      email: normalizeAuthorEmail(input.autor?.email ?? defaultSettings.autor.email)
    }
  };
}

export async function readGitSettings(): Promise<GitSettingsInternal> {
  await fs.mkdir(runtimeDir, { recursive: true });
  try {
    const content = await fs.readFile(settingsPath, "utf8");
    const stored = JSON.parse(content) as Partial<GitSettingsInternal>;
    const normalized = normalizeGitSettings(stored);
    return {
      ...normalized,
      verificadoEm: stored.verificadoEm
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...defaultSettings };
    if (error instanceof SyntaxError) return { ...defaultSettings };
    throw error;
  }
}

export async function saveGitSettings(input: Partial<GitSettings>) {
  await fs.mkdir(runtimeDir, { recursive: true });
  const current = await readGitSettings();
  const normalized = normalizeGitSettings(input);
  const connectionChanged = current.remoteUrl !== normalized.remoteUrl || current.branch !== normalized.branch;
  const value: GitSettingsInternal = {
    ...normalized,
    verificadoEm: connectionChanged ? undefined : current.verificadoEm
  };
  await fs.writeFile(settingsPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return value;
}

export async function markGitVerified() {
  const settings = await readGitSettings();
  const value: GitSettingsInternal = {
    ...settings,
    verificadoEm: new Date().toISOString()
  };
  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return value;
}

export function publicGitSettings(settings: GitSettingsInternal): GitSettings {
  return {
    remoteUrl: settings.remoteUrl,
    branch: settings.branch,
    escopos: { ...settings.escopos },
    estiloCommit: settings.estiloCommit,
    templates: { ...settings.templates },
    autor: { ...settings.autor }
  };
}
