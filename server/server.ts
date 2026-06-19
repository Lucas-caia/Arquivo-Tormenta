import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diffObjects } from "./diff.js";
import { getGitStatus, pullRepository, pushRepository } from "./git.js";
import { parseTormentaPdf } from "./parser.js";
import { applyRevision, approveAllReview, listFichas, readFicha, readRevision, saveNewFicha, saveRevision, stats, updateFichaStatus } from "./storage.js";
import type { StatusFicha } from "./types.js";
import { nowIso } from "./utils.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});
const port = Number(process.env.PORT || 3333);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, data: nowIso() });
});

app.get("/api/fichas", async (_request, response, next) => {
  try {
    response.json({ fichas: await listFichas(), estatisticas: await stats() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/fichas/:id", async (request, response, next) => {
  try {
    const ficha = await readFicha(request.params.id);
    if (!ficha) return response.status(404).json({ erro: "Ficha não encontrada." });
    response.json(ficha);
  } catch (error) {
    next(error);
  }
});

app.post("/api/fichas/upload", upload.single("pdf"), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ erro: "Envie um arquivo PDF." });
    const fichaExtraida = await parseTormentaPdf(request.file.buffer);
    const atual = await readFicha(fichaExtraida.id);
    if (!atual) {
      const ficha = await saveNewFicha(fichaExtraida);
      return response.status(201).json({ tipo: "nova", ficha });
    }
    const nova = {
      ...fichaExtraida,
      status: atual.status,
      atualizadoEm: atual.atualizadoEm,
      historico: atual.historico
    };
    const diferencas = diffObjects(atual, nova);
    if (!diferencas.length) return response.json({ tipo: "sem-alteracoes", ficha: atual });
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
  } catch (error) {
    next(error);
  }
});

app.post("/api/fichas/aprovar-todas", async (_request, response, next) => {
  try {
    const total = await approveAllReview();
    response.json({ total });
  } catch (error) {
    next(error);
  }
});

app.post("/api/fichas/:id/status", async (request, response, next) => {
  try {
    const status = request.body?.status as StatusFicha;
    if (status !== "aprovado" && status !== "em-revisao") return response.status(400).json({ erro: "Status inválido." });
    response.json(await updateFichaStatus(request.params.id, status));
  } catch (error) {
    next(error);
  }
});

app.get("/api/revisoes/:id", async (request, response, next) => {
  try {
    const revisao = await readRevision(request.params.id);
    if (!revisao) return response.status(404).json({ erro: "Revisão não encontrada." });
    response.json(revisao);
  } catch (error) {
    next(error);
  }
});

app.post("/api/revisoes/:id/aplicar", async (request, response, next) => {
  try {
    const status = request.body?.status as StatusFicha;
    if (status !== "aprovado" && status !== "em-revisao") return response.status(400).json({ erro: "Status inválido." });
    response.json(await applyRevision(request.params.id, status));
  } catch (error) {
    next(error);
  }
});

app.get("/api/git/status", async (_request, response) => {
  response.json(await getGitStatus());
});

app.post("/api/git/pull", async (_request, response) => {
  response.json(await pullRepository());
});

app.post("/api/git/push", async (_request, response) => {
  response.json(await pushRepository());
});

app.get("/api/export", async (_request, response, next) => {
  try {
    const fichas = await listFichas();
    const completas = await Promise.all(fichas.map((ficha) => readFicha(ficha.id)));
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=arquivo-tormenta-fichas.json");
    response.send(JSON.stringify(completas.filter(Boolean), null, 2));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(distPath));

app.get("*", (_request, response) => {
  response.sendFile(path.join(distPath, "index.html"));
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  response.status(500).json({ erro: message });
});

app.listen(port, () => {
  console.log(`Arquivo Tormenta RPG em http://localhost:${port}`);
});
