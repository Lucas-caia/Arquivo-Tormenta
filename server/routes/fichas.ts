import { Router } from "express";
import type { StatusFicha } from "../../shared/types.js";
import { badRequest, notFound } from "../errors.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  approveAllReview,
  deleteFicha,
  listFichas,
  readFicha,
  summarizeFichas,
  updateFichaStatus
} from "../storage.js";
import { assertValidFichaId } from "../validation.js";
import { importarFichaPdf } from "../services/importFicha.js";

export const fichasRouter = Router();

fichasRouter.get("/", asyncHandler(async (_request, response) => {
  const fichas = await listFichas();
  response.json({ fichas, estatisticas: summarizeFichas(fichas) });
}));

fichasRouter.post("/upload", uploadPdf, asyncHandler(async (request, response) => {
  if (!request.file) {
    throw badRequest("PDF_REQUIRED", "Envie um arquivo PDF no campo pdf.");
  }

  const result = await importarFichaPdf({
    arquivo: request.file,
    contexto: { origem: "web" }
  });

  response.status(result.tipo === "nova" ? 201 : 200).json(result);
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

fichasRouter.delete("/:id", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  response.json(await deleteFicha(id));
}));

fichasRouter.post("/:id/status", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  const status = request.body?.status as StatusFicha;
  if (status !== "aprovado" && status !== "em-revisao") {
    throw badRequest("INVALID_STATUS", "Status inválido.");
  }
  response.json(await updateFichaStatus(id, status));
}));
