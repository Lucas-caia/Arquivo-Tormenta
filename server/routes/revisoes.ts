import { Router } from "express";
import type { StatusFicha } from "../../shared/types.js";
import { badRequest, notFound } from "../errors.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { applyRevision, deleteRevision, readRevision } from "../storage.js";
import { assertValidFichaId } from "../validation.js";

export const revisoesRouter = Router();

revisoesRouter.get("/:id", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  const revisao = await readRevision(id);
  if (!revisao) throw notFound("REVISION_NOT_FOUND", "Revisão não encontrada.");
  response.json(revisao);
}));

revisoesRouter.delete("/:id", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  const revisao = await readRevision(id);
  if (!revisao) throw notFound("REVISION_NOT_FOUND", "Revisão não encontrada.");
  await deleteRevision(id);
  response.json({ sucesso: true });
}));

revisoesRouter.post("/:id/aplicar", asyncHandler(async (request, response) => {
  const id = assertValidFichaId(request.params.id);
  const status = request.body?.status as StatusFicha;
  if (status !== "aprovado" && status !== "em-revisao") {
    throw badRequest("INVALID_STATUS", "Status inválido.");
  }
  response.json(await applyRevision(id, status));
}));
