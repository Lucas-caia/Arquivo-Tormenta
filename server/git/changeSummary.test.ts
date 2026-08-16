import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGitPreview } from "./changeSummary.js";
import type { GitSettingsInternal } from "./types.js";

const settings: GitSettingsInternal = {
  remoteUrl: "git@github.com:arquivo/tormenta.git",
  branch: "main",
  escopos: { fichas: true, revisoes: true },
  estiloCommit: "descritivo",
  templates: {
    novaFicha: "ficha: adiciona {nome}",
    fichaAtualizada: "ficha: atualiza {nome} para v{versao}",
    multiplasAlteracoes: "fichas: sincroniza {quantidade} alterações"
  },
  autor: { nome: "Arquivo Tormenta", email: "arquivo-tormenta@local" }
};

test("gera mensagem específica para ficha atualizada", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tormenta-git-preview-"));
  try {
    await fs.mkdir(path.join(root, "fichas"), { recursive: true });
    await fs.writeFile(path.join(root, "fichas", "blek.json"), JSON.stringify({
      nome: "Blek",
      historico: { versao: 5 }
    }));

    const preview = await buildGitPreview(settings, [
      { status: "M", path: "data/fichas/blek.json" }
    ], root);

    assert.equal(preview.mensagemCommit, "ficha: atualiza Blek para v5");
    assert.equal(preview.fichasAtualizadas, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});


test("fingerprint muda quando o conteúdo preparado muda, mesmo com os mesmos caminhos", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tormenta-git-fingerprint-"));
  try {
    await fs.mkdir(path.join(root, "fichas"), { recursive: true });
    await fs.writeFile(path.join(root, "fichas", "blek.json"), JSON.stringify({
      nome: "Blek",
      historico: { versao: 5 }
    }));

    const changes = [{ status: "M", path: "data/fichas/blek.json" }];
    const first = await buildGitPreview(settings, changes, root, "base-a\\nblob-1");
    const second = await buildGitPreview(settings, changes, root, "base-a\\nblob-2");

    assert.notEqual(first.fingerprint, second.fingerprint);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
