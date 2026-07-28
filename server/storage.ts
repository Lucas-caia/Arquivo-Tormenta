import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Estatisticas, Ficha, FichaResumo, Revisao, StatusFicha } from "../shared/types.js";
import { AppError, conflict, notFound } from "./errors.js";
import { formatDateTime, nowIso } from "./utils.js";
import { assertValidFichaId } from "./validation.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const fichasDir = path.join(dataDir, "fichas");
const revisoesDir = path.join(dataDir, "revisoes");

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(fichasDir, { recursive: true }),
    fs.mkdir(revisoesDir, { recursive: true })
  ]);
}

function fichaPath(id: string) {
  return path.join(fichasDir, `${assertValidFichaId(id)}.json`);
}

function revisaoPath(id: string) {
  return path.join(revisoesDir, `${assertValidFichaId(id)}.json`);
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError(
        500,
        "CORRUPTED_JSON",
        "Um arquivo JSON armazenado está corrompido.",
        [path.relative(root, filePath)]
      );
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await fs.writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function listJsonIds(directory: string) {
  await ensureDirectories();
  const files = await fs.readdir(directory);
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .filter((id) => {
      try {
        assertValidFichaId(id);
        return true;
      } catch {
        return false;
      }
    });
}

export function summarizeFichas(fichas: FichaResumo[]): Estatisticas {
  const latestTimestamp = fichas.reduce(
    (latest, ficha) => Math.max(latest, new Date(ficha.atualizadoEm).getTime() || 0),
    0
  );

  return {
    total: fichas.length,
    aprovadas: fichas.filter((ficha) => ficha.status === "aprovado").length,
    emRevisao: fichas.filter((ficha) => ficha.status === "em-revisao" && !ficha.temRevisao).length,
    revisoesPendentes: fichas.filter((ficha) => ficha.temRevisao).length,
    ultimaAtualizacao: latestTimestamp
      ? formatDateTime(new Date(latestTimestamp).toISOString())
      : "Sem registros"
  };
}

export function listFichaIds() {
  return listJsonIds(fichasDir);
}

export function listRevisaoIds() {
  return listJsonIds(revisoesDir);
}

export async function readFicha(id: string) {
  await ensureDirectories();
  const file = fichaPath(id);
  if (!(await exists(file))) return null;
  return readJson<Ficha>(file);
}

export async function saveFicha(ficha: Ficha) {
  await ensureDirectories();
  await writeJsonAtomic(fichaPath(ficha.id), ficha);
  return ficha;
}

export async function listStoredFichas() {
  const ids = await listFichaIds();
  const fichas = await Promise.all(ids.map((id) => readFicha(id)));
  return fichas.filter((ficha): ficha is Ficha => Boolean(ficha));
}

export async function listFichas() {
  const [fichas, revisaoIds] = await Promise.all([listStoredFichas(), listRevisaoIds()]);
  const revisoes = new Set(revisaoIds);

  return fichas
    .map((ficha): FichaResumo => ({
      id: ficha.id,
      nome: ficha.nome,
      jogador: ficha.jogador,
      raca: ficha.raca,
      origem: ficha.origem,
      classe: ficha.classe,
      nivel: ficha.nivel,
      status: ficha.status,
      atualizadoEm: ficha.atualizadoEm,
      temRevisao: revisoes.has(ficha.id)
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function saveNewFicha(ficha: Ficha) {
  const data = nowIso();
  const normalized: Ficha = {
    ...ficha,
    status: "em-revisao",
    atualizadoEm: data,
    temRevisao: false,
    historico: {
      criadoEm: data,
      atualizadoEm: data,
      versao: 1
    }
  };
  return saveFicha(normalized);
}

export async function updateFichaStatus(id: string, status: StatusFicha) {
  const ficha = await readFicha(id);
  if (!ficha) throw notFound("FICHA_NOT_FOUND", "Ficha não encontrada.");

  if (status === "aprovado" && await readRevision(id)) {
    throw conflict(
      "PENDING_REVISION",
      "Esta ficha possui uma atualização pendente.",
      ["Compare e aplique a revisão antes de aprovar a ficha oficial."]
    );
  }

  const data = nowIso();
  const updated: Ficha = {
    ...ficha,
    status,
    atualizadoEm: data,
    historico: {
      ...ficha.historico,
      atualizadoEm: data
    }
  };
  return saveFicha(updated);
}

export async function saveRevision(revisao: Revisao) {
  await ensureDirectories();
  const file = revisaoPath(revisao.id);
  if (await exists(file)) {
    throw conflict(
      "REVISION_ALREADY_PENDING",
      `A ficha ${revisao.nome} já possui uma revisão pendente.`,
      ["Resolva a revisão atual antes de enviar outra versão do mesmo personagem."]
    );
  }
  await writeJsonAtomic(file, revisao);
  return revisao;
}

export async function readRevision(id: string) {
  await ensureDirectories();
  const file = revisaoPath(id);
  if (!(await exists(file))) return null;
  return readJson<Revisao>(file);
}

export async function deleteRevision(id: string) {
  const file = revisaoPath(id);
  if (await exists(file)) await fs.unlink(file);
}

export async function applyRevision(id: string, status: StatusFicha) {
  const revisao = await readRevision(id);
  if (!revisao) throw notFound("REVISION_NOT_FOUND", "Revisão não encontrada.");

  const atual = await readFicha(revisao.fichaId);
  if (!atual) {
    throw notFound("FICHA_NOT_FOUND", "A ficha original desta revisão não existe mais.");
  }

  if (atual.historico.versao !== revisao.atual.historico.versao) {
    throw conflict(
      "STALE_REVISION",
      "A ficha oficial mudou depois que esta revisão foi criada.",
      ["Descarte a revisão pendente e envie novamente o PDF para gerar uma comparação atualizada."]
    );
  }

  const data = nowIso();
  const ficha: Ficha = {
    ...revisao.nova,
    status,
    atualizadoEm: data,
    temRevisao: false,
    historico: {
      criadoEm: atual.historico.criadoEm,
      atualizadoEm: data,
      versao: atual.historico.versao + 1
    }
  };

  await saveFicha(ficha);
  await deleteRevision(id);
  return ficha;
}

export async function approveAllReview() {
  const ids = await listFichaIds();
  let total = 0;

  for (const id of ids) {
    const [ficha, revisao] = await Promise.all([readFicha(id), readRevision(id)]);
    if (ficha?.status === "em-revisao" && !revisao) {
      await updateFichaStatus(id, "aprovado");
      total += 1;
    }
  }

  return total;
}
