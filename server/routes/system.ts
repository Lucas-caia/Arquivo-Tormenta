import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { listStoredFichas } from "../storage.js";
import { nowIso } from "../utils.js";

export const systemRouter = Router();

systemRouter.get("/health", (_request, response) => {
  response.json({ ok: true, data: nowIso() });
});

systemRouter.get("/export", asyncHandler(async (_request, response) => {
  const fichas = await listStoredFichas();
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Disposition", "attachment; filename=arquivo-tormenta-fichas.json");
  response.send(JSON.stringify(fichas, null, 2));
}));
