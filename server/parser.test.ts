import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { AppError } from "./errors.js";
import { parseTormentaPdf } from "./parser.js";

async function createFormPdf(fields: Record<string, string>) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 800]);
  const form = pdf.getForm();
  let y = 750;

  for (const [name, value] of Object.entries(fields)) {
    const field = form.createTextField(name);
    field.setText(value);
    field.addToPage(page, { x: 40, y, width: 220, height: 20 });
    y -= 28;
  }

  return Buffer.from(await pdf.save());
}

test("mantém o mapeamento principal do modelo preenchível", async () => {
  const buffer = await createFormPdf({
    Nome: "Ayla Ventobravo",
    Jogador: "Laysa",
    Raca: "Humana",
    Origem: "Nômade",
    Classe: "Guerreira 4",
    modFor: "+5",
    vidaMax: "42",
    ataque1: "Espada",
    tAtak1: "+9",
    dano1: "1d8+5"
  });

  const ficha = await parseTormentaPdf(buffer);
  assert.equal(ficha.id, "ayla-ventobravo");
  assert.equal(ficha.nome, "Ayla Ventobravo");
  assert.equal(ficha.classe, "Guerreira");
  assert.equal(ficha.nivel, "4");
  assert.equal(ficha.atributos.força, "+5");
  assert.equal(ficha.recursos.vidaMaxima, "42");
  assert.deepEqual(ficha.ataques[0], {
    nome: "Espada",
    teste: "+9",
    dano: "1d8+5",
    critico: "",
    tipo: "",
    alcance: ""
  });
});

test("rejeita PDF preenchível sem o campo Nome", async () => {
  const buffer = await createFormPdf({ Jogador: "Laysa" });

  await assert.rejects(
    () => parseTormentaPdf(buffer),
    (error: unknown) => error instanceof AppError && error.code === "MISSING_CHARACTER_NAME" && error.status === 422
  );
});

test("rejeita PDF sem formulário preenchível", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const buffer = Buffer.from(await pdf.save());

  await assert.rejects(
    () => parseTormentaPdf(buffer),
    (error: unknown) => error instanceof AppError && error.code === "PDF_WITHOUT_FORM" && error.status === 422
  );
});
