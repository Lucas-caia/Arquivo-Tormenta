import fs from "node:fs/promises";
import path from "node:path";
import type { Ficha, FichaResumo, Revisao, StatusFicha } from "./types.js";
import { formatDateTime, nowIso } from "./utils.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const fichasDir = path.join(dataDir, "fichas");
const revisoesDir = path.join(dataDir, "revisoes");

async function ensure() {
  await fs.mkdir(fichasDir, { recursive: true });
  await fs.mkdir(revisoesDir, { recursive: true });
}

function fichaPath(id: string) {
  return path.join(fichasDir, `${id}.json`);
}

function revisaoPath(id: string) {
  return path.join(revisoesDir, `${id}.json`);
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
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function listFichaIds() {
  await ensure();
  const files = await fs.readdir(fichasDir);
  return files.filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, ""));
}

export async function readFicha(id: string) {
  await ensure();
  const file = fichaPath(id);
  if (!(await exists(file))) return null;
  return readJson<Ficha>(file);
}

export async function saveFicha(ficha: Ficha) {
  await ensure();
  await writeJson(fichaPath(ficha.id), ficha);
  return ficha;
}

export async function listFichas() {
  const ids = await listFichaIds();
  const fichas = await Promise.all(ids.map((id) => readFicha(id)));
  const revisoes = new Set(await listRevisaoIds());
  return fichas
    .filter((ficha): ficha is Ficha => Boolean(ficha))
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
  ficha.status = "em-revisao";
  ficha.atualizadoEm = data;
  ficha.historico.criadoEm = data;
  ficha.historico.atualizadoEm = data;
  ficha.historico.versao = 1;
  return saveFicha(ficha);
}

export async function updateFichaStatus(id: string, status: StatusFicha) {
  const ficha = await readFicha(id);
  if (!ficha) throw new Error("Ficha não encontrada.");
  const data = nowIso();
  ficha.status = status;
  ficha.atualizadoEm = data;
  ficha.historico.atualizadoEm = data;
  await saveFicha(ficha);
  return ficha;
}

export async function saveRevision(revisao: Revisao) {
  await ensure();
  await writeJson(revisaoPath(revisao.id), revisao);
  return revisao;
}

export async function listRevisaoIds() {
  await ensure();
  const files = await fs.readdir(revisoesDir);
  return files.filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, ""));
}

export async function readRevision(id: string) {
  await ensure();
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
  if (!revisao) throw new Error("Revisão não encontrada.");
  const atual = await readFicha(revisao.fichaId);
  const data = nowIso();
  const version = (atual?.historico.versao || 1) + 1;
  const ficha: Ficha = {
    ...revisao.nova,
    status,
    atualizadoEm: data,
    temRevisao: false,
    historico: {
      criadoEm: atual?.historico.criadoEm || revisao.nova.historico.criadoEm,
      atualizadoEm: data,
      versao: version
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
    const ficha = await readFicha(id);
    if (ficha?.status === "em-revisao") {
      await updateFichaStatus(id, "aprovado");
      total += 1;
    }
  }
  return total;
}

export async function stats() {
  const fichas = await listFichas();
  const ultima = fichas.reduce((latest, ficha) => Math.max(latest, new Date(ficha.atualizadoEm).getTime() || 0), 0);
  return {
    total: fichas.length,
    aprovadas: fichas.filter((ficha) => ficha.status === "aprovado").length,
    emRevisao: fichas.filter((ficha) => ficha.status === "em-revisao").length,
    ultimaAtualizacao: ultima ? formatDateTime(new Date(ultima).toISOString()) : "Sem registros"
  };
}
