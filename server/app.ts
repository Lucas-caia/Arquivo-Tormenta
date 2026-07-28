import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { apiNotFound, errorHandler } from "./middleware/errorHandler.js";
import { fichasRouter } from "./routes/fichas.js";
import { gitRouter } from "./routes/git.js";
import { revisoesRouter } from "./routes/revisoes.js";
import { systemRouter } from "./routes/system.js";

const distPath = path.resolve(process.cwd(), "dist");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: config.jsonBodyLimit }));

  app.use("/api", systemRouter);
  app.use("/api/fichas", fichasRouter);
  app.use("/api/revisoes", revisoesRouter);
  app.use("/api/git", gitRouter);
  app.use("/api", apiNotFound);

  app.use(express.static(distPath));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(distPath, "index.html"));
  });

  app.use(errorHandler);
  return app;
}
