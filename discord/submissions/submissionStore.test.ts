import assert from "node:assert/strict";
import test from "node:test";
import { createProtocol, sha256 } from "./submissionStore.js";

test("gera protocolo estável a partir do ID e da data", () => {
  const protocol = createProtocol(
    "12345678-1234-4123-8123-123456789abc",
    new Date("2026-08-09T12:00:00.000Z")
  );
  assert.equal(protocol, "AT-20260809-12345678");
});

test("calcula SHA-256 do conteúdo recebido", () => {
  assert.equal(
    sha256(Buffer.from("arquivo-tormenta")),
    "0c97d4a8bccfae843891e4b4770a42961736c5083dc0a19ac6b3e32d70caa07f"
  );
});
