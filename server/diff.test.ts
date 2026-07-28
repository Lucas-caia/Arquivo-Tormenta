import assert from "node:assert/strict";
import test from "node:test";
import { diffObjects } from "./diff.js";

test("ignora metadados operacionais e detecta mudanças de ficha", () => {
  const before = {
    nome: "Ayla",
    nivel: "3",
    status: "em-revisao",
    atualizadoEm: "antes",
    historico: { atualizadoEm: "antes", versao: 1 },
    camposOriginais: { Nome: "Ayla" }
  };
  const after = {
    nome: "Ayla",
    nivel: "4",
    status: "aprovado",
    atualizadoEm: "depois",
    historico: { atualizadoEm: "depois", versao: 2 },
    camposOriginais: { Nome: "Ayla alterada" }
  };

  assert.deepEqual(diffObjects(before, after), [{
    caminho: "nivel",
    rotulo: "Nível",
    antes: "3",
    depois: "4",
    tipo: "alterado"
  }]);
});
