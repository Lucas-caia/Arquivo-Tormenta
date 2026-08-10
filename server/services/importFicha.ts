import type {
  ImportacaoMetadata,
  OrigemImportacao,
  UploadResponse
} from "../../shared/types.js";
import { config } from "../config.js";
import { diffObjects } from "../diff.js";
import { conflict } from "../errors.js";
import { parseTormentaPdf } from "../parser.js";
import {
  readFicha,
  readRevision,
  saveNewFicha,
  saveRevision,
  withFichaLock
} from "../storage.js";
import { nowIso } from "../utils.js";
import { validatePdfUpload, type PdfUpload } from "../validation.js";

export type ImportacaoContexto = {
  origem: OrigemImportacao;
  enviadoPor?: {
    id: string;
    nome: string;
  };
};

export type ImportarFichaInput = {
  arquivo: PdfUpload;
  contexto: ImportacaoContexto;
};

function criarMetadata(
  arquivo: PdfUpload,
  contexto: ImportacaoContexto
): ImportacaoMetadata {
  return {
    origem: contexto.origem,
    arquivoOriginal: arquivo.originalname,
    recebidaEm: nowIso(),
    enviadoPor: contexto.enviadoPor
  };
}

export async function importarFichaPdf({
  arquivo,
  contexto
}: ImportarFichaInput): Promise<UploadResponse> {
  validatePdfUpload(arquivo, config.maxPdfBytes);

  const fichaExtraida = await parseTormentaPdf(arquivo.buffer);
  const importacao = criarMetadata(arquivo, contexto);
  const fichaImportada = {
    ...fichaExtraida,
    importacao
  };

  return withFichaLock<UploadResponse>(fichaImportada.id, async () => {
    const atual = await readFicha(fichaImportada.id);
    if (!atual) {
      const ficha = await saveNewFicha(fichaImportada);
      return { tipo: "nova", ficha };
    }

    const pendingRevision = await readRevision(atual.id);
    if (pendingRevision) {
      throw conflict(
        "REVISION_ALREADY_PENDING",
        `A ficha ${atual.nome} já possui uma revisão pendente.`,
        ["Compare e resolva a revisão atual antes de enviar outra versão."]
      );
    }

    const nova = {
      ...fichaImportada,
      status: atual.status,
      atualizadoEm: atual.atualizadoEm,
      historico: atual.historico
    };
    const diferencas = diffObjects(atual, nova);

    if (!diferencas.length) {
      return { tipo: "sem-alteracoes", ficha: atual };
    }

    const revisao = {
      id: atual.id,
      fichaId: atual.id,
      nome: atual.nome,
      criadaEm: nowIso(),
      importacao,
      atual,
      nova,
      diferencas
    };

    await saveRevision(revisao);
    return { tipo: "revisao", revisao };
  });
}
