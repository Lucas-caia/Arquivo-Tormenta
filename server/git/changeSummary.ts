import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Ficha, GitPreview } from "../../shared/types.js";
import type { GitSettingsInternal, PreparedGitChange } from "./types.js";

function basenameId(filePath: string) {
  return path.basename(filePath, ".json");
}

async function readFichaMetadata(dataRoot: string, filePath: string) {
  const id = basenameId(filePath);
  try {
    const content = await fs.readFile(path.join(dataRoot, "fichas", `${id}.json`), "utf8");
    const ficha = JSON.parse(content) as Pick<Ficha, "nome" | "historico">;
    return {
      nome: ficha.nome || id,
      versao: ficha.historico?.versao ?? "?"
    };
  } catch {
    return { nome: id, versao: "?" };
  }
}

function applyTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

function presetTemplates(settings: GitSettingsInternal) {
  if (settings.estiloCommit === "conventional") {
    return {
      novaFicha: "feat(fichas): adiciona {nome}",
      fichaAtualizada: "chore(fichas): atualiza {nome} para v{versao}",
      multiplasAlteracoes: "chore(fichas): sincroniza {quantidade} alterações"
    };
  }
  if (settings.estiloCommit === "personalizado") return settings.templates;
  return {
    novaFicha: "ficha: adiciona {nome}",
    fichaAtualizada: "ficha: atualiza {nome} para v{versao}",
    multiplasAlteracoes: "fichas: sincroniza {quantidade} alterações"
  };
}

export async function buildGitPreview(
  settings: GitSettingsInternal,
  changes: PreparedGitChange[],
  dataRoot: string,
  fingerprintContext = ""
): Promise<GitPreview> {
  const fichaChanges = changes.filter((change) => change.path.startsWith("data/fichas/") && change.path.endsWith(".json"));
  const newFichas = fichaChanges.filter((change) => change.status.startsWith("A") || change.status === "??");
  const updatedFichas = fichaChanges.filter((change) => !newFichas.includes(change));
  const revisionChanges = changes.filter((change) => change.path.startsWith("data/revisoes/"));
  const templates = presetTemplates(settings);

  let message: string;
  if (changes.length === 1 && newFichas.length === 1) {
    const metadata = await readFichaMetadata(dataRoot, newFichas[0].path);
    message = applyTemplate(templates.novaFicha, {
      nome: metadata.nome,
      versao: metadata.versao,
      quantidade: 1
    });
  } else if (changes.length === 1 && updatedFichas.length === 1) {
    const metadata = await readFichaMetadata(dataRoot, updatedFichas[0].path);
    message = applyTemplate(templates.fichaAtualizada, {
      nome: metadata.nome,
      versao: metadata.versao,
      quantidade: 1
    });
  } else {
    message = applyTemplate(templates.multiplasAlteracoes, {
      quantidade: changes.length,
      nome: "múltiplas fichas",
      versao: "—"
    });
  }

  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      branch: settings.branch,
      remoteUrl: settings.remoteUrl,
      escopos: settings.escopos,
      changes,
      message,
      fingerprintContext
    }))
    .digest("hex");

  return {
    fingerprint,
    branch: settings.branch,
    remoteUrl: settings.remoteUrl,
    arquivos: changes.map((change) => ({ status: change.status, caminho: change.path })),
    total: changes.length,
    novasFichas: newFichas.length,
    fichasAtualizadas: updatedFichas.length,
    revisoesAlteradas: revisionChanges.length,
    mensagemCommit: message
  };
}
