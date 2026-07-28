import { Router } from "express";
import type { StatusFicha } from "../../shared/types.js";
import { diffObjects } from "../diff.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadPdf } from "../middleware/upload.js";
import { parseTormentaPdf } from "../parser.js";
import {
  approveAllReview,
  listFichas,
  readFicha,
  readRevision,
  saveNewFicha,
  saveRevision,
  summarizeFichas,
  updateFichaStatus
} from "../storage.js";
import { nowIso } from "../utils.js";
import { assertValidFichaId, validatePdfUpload } from "../validation.js";
import { config } from "../config.js";

export const fichasRouter = Router();

fichasRouter.get("/", asyncHandler(async (_request, response) => {
  const fichas = await listFichas();
  response.json({ fichas, estatisticas: summarizeFichas(fichas) });
}));

fichasRouter.post("/upload", uploadPdf, asyncHandler(async (request, response) => {
  if (!request.file) {
    throw badRequest("PDF_REQUIRED", "Envie um arquivo PDF no campo pdf.");
  }

  validatePdfUpload(request.file, config.maxPdfBytes);
  const fichaExtraida = await parseTormentaPdf(request.file.buffer);
  const atual = await readFicha(fichaExtraida.id);

  if (!atual) {
    const ficha = await saveNewFicha(fichaExtraida);
    response.status(201).json({ tipo: "nova", ficha });
    return;
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
    ...fichaExtraida,
    status: atual.status,
    atualizadoEm: atual.atualizadoEm,
    historico: atual.historico
  };
  const diferencas = diffObjects(atual, nova);

  if (!diferencas.length) {
    response.json({ tipo: "sem-alteracoes", ficha: atual });
    return;
  }

  const revisao = {
    id: atual.id,
    fichaId: atual.id,
    nome: atual.nome,
    criadaEm: nowIso(),
    atual,
    nova,
    diferencas
  };
  await saveRevision(revisao);
  response.json({ tipo: "revisao", revisao });
}));

fichasRouter.post("/aprovar-todas", asyncHandler(async (_request, response) => {
  const total = await approveAllReview();
  response.json({ total });
}));

fichasRouter.get("/:id", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  const ficha = await readFicha(id);
  if (!ficha) throw notFound("FICHA_NOT_FOUND", "Ficha não encontrada.");
  response.json(ficha);
}));

fichasRouter.post("/:id/status", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  const status = request.body?.status as StatusFicha;
  if (status !== "aprovado" && status !== "em-revisao") {
    throw badRequest("INVALID_STATUS", "Status inválido.");
  }
  response.json(await updateFichaStatus(id, status));
}));
