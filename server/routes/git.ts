import { Router } from "express";
import { getGitStatus, pullRepository, pushRepository } from "../git.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const gitRouter = Router();

gitRouter.get("/status", asyncHandler(async (_request, response) => {
  response.json(await getGitStatus());
}));

gitRouter.post("/pull", asyncHandler(async (_request, response) => {
  response.json(await pullRepository());
}));

gitRouter.post("/push", asyncHandler(async (_request, response) => {
  response.json(await pushRepository());
}));
