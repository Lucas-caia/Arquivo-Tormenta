import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGitSettings } from "./settings.js";

test("aceita apenas URL SSH do GitHub", () => {
  const settings = normalizeGitSettings({
    remoteUrl: "git@github.com:arquivo/tormenta",
    branch: "main"
  });
  assert.equal(settings.remoteUrl, "git@github.com:arquivo/tormenta.git");
  assert.throws(() => normalizeGitSettings({ remoteUrl: "https://github.com/arquivo/tormenta" }));
});

test("exige ao menos um escopo de sincronização", () => {
  assert.throws(() => normalizeGitSettings({
    escopos: { fichas: false, revisoes: false }
  }));
});
