import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "./errors.js";
import { assertValidFichaId } from "./validation.js";

test("aceita identificadores derivados por slug", () => {
  assert.equal(assertValidFichaId("tempestade-rubra"), "tempestade-rubra");
  assert.equal(assertValidFichaId("blek2"), "blek2");
});

test("bloqueia identificadores que poderiam escapar da pasta de dados", () => {
  for (const id of ["../segredo", "a/b", "-invalido", "invalido-", "Ayla", ""]) {
    assert.throws(
      () => assertValidFichaId(id),
      (error: unknown) => error instanceof AppError && error.code === "INVALID_ID"
    );
  }
});
