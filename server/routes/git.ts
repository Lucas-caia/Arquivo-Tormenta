import { Router } from "express";
import {
  getGitSettings,
  getGitStatus,
  listGitBranches,
  previewPush,
  pullRepository,
  pushRepository,
  updateGitSettings,
  verifyGitConnection
} from "../git.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const gitRouter = Router();

gitRouter.get("/status", asyncHandler(async (_request, response) => {
  response.json(await getGitStatus());
}));

gitRouter.get("/settings", asyncHandler(async (_request, response) => {
  response.json(await getGitSettings());
}));

gitRouter.put("/settings", asyncHandler(async (request, response) => {
  response.json(await updateGitSettings(request.body ?? {}));
}));

gitRouter.post("/verify", asyncHandler(async (_request, response) => {
  response.json(await verifyGitConnection());
}));

gitRouter.get("/branches", asyncHandler(async (_request, response) => {
  response.json({ branches: await listGitBranches() });
}));

gitRouter.post("/preview", asyncHandler(async (_request, response) => {
  response.json(await previewPush());
}));

gitRouter.post("/pull", asyncHandler(async (_request, response) => {
  response.json(await pullRepository());
}));

gitRouter.post("/push", asyncHandler(async (request, response) => {
  response.json(await pushRepository(String(request.body?.fingerprint ?? "")));
}));
