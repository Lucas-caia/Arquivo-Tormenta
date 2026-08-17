import assert from "node:assert/strict";
import test from "node:test";
import { compareRemoteScopeChanges } from "./syncPlan.js";

test("mudança remota em arquivo diferente pode ser incorporada sem conflito", () => {
  const result = compareRemoteScopeChanges(
    ["data/fichas/a.json"],
    [{ status: "A", path: "data/fichas/b.json" }],
    [
      { status: "M", path: "data/fichas/a.json" },
      { status: "A", path: "data/fichas/b.json" }
    ]
  );

  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.remotePendingLocally, ["data/fichas/a.json"]);
});

test("alteração diferente no mesmo arquivo é conflito real", () => {
  const result = compareRemoteScopeChanges(
    ["data/fichas/a.json"],
    [{ status: "M", path: "data/fichas/a.json" }],
    [{ status: "M", path: "data/fichas/a.json" }]
  );

  assert.deepEqual(result.conflicts, ["data/fichas/a.json"]);
  assert.deepEqual(result.remotePendingLocally, []);
});

test("mudança remota já incorporada localmente não bloqueia mudanças adicionais", () => {
  const result = compareRemoteScopeChanges(
    ["data/fichas/a.json"],
    [
      { status: "M", path: "data/fichas/a.json" },
      { status: "A", path: "data/fichas/b.json" }
    ],
    [{ status: "A", path: "data/fichas/b.json" }]
  );

  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.remotePendingLocally, []);
});
