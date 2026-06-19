import { PDFCheckBox, PDFDocument, PDFDropdown, PDFField, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import type { Ataque, Ficha, Pericia, Poder } from "./types.js";
import { compact, normalizeClassLevel, nowIso, slugify } from "./utils.js";

const pericias = [
  "Acrobacia",
  "Adestramento",
  "Atletismo",
  "Atuação",
  "Cavalgar",
  "Conhecimento",
  "Cura",
  "Diplomacia",
  "Enganação",
  "Fortitude",
  "Furtividade",
  "Guerra",
  "Iniciativa",
  "Intimidação",
  "Intuição",
  "Investigação",
  "Jogatina",
  "Ladinagem",
  "Luta",
  "Misticismo",
  "Nobreza",
  "Ofício 1",
  "Ofício 2",
  "Percepção",
  "Pilotagem",
  "Pontaria",
  "Reflexos",
  "Religião",
  "Sobrevivência",
  "Vontade"
];

const atributos: Record<string, string> = {
  modFor: "Força",
  modDes: "Destreza",
  modCon: "Constituição",
  modInt: "Inteligência",
  modSab: "Sabedoria",
  modCar: "Carisma"
};

function readField(field: PDFField) {
  try {
    if (field instanceof PDFTextField) return compact(field.getText());
    if (field instanceof PDFDropdown) return field.getSelected().join(", ");
    if (field instanceof PDFOptionList) return field.getSelected().join(", ");
    if (field instanceof PDFRadioGroup) return compact(field.getSelected());
    if (field instanceof PDFCheckBox) return field.isChecked() ? "sim" : "";
    return "";
  } catch {
    return "";
  }
}

function extractFields(pdf: PDFDocument) {
  const values: Record<string, string> = {};
  const form = pdf.getForm();
  for (const field of form.getFields()) {
    values[field.getName()] = readField(field);
  }
  return values;
}

function value(fields: Record<string, string>, key: string) {
  return compact(fields[key]);
}

function splitLines(text: string) {
  return text
    .split(/\r?\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitPoderes(text: string): Poder[] {
  return text
    .split(/(?:^|\n)\s*-\s+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf(":");
      if (index === -1) return { nome: item, descricao: "" };
      return {
        nome: item.slice(0, index).trim(),
        descricao: item.slice(index + 1).trim()
      };
    });
}

function parseAtaques(fields: Record<string, string>) {
  const ataques: Ataque[] = [];
  for (let index = 1; index <= 5; index += 1) {
    const ataque = {
      nome: value(fields, `ataque${index}`),
      teste: value(fields, `tAtak${index}`),
      dano: value(fields, `dano${index}`),
      critico: value(fields, `critico${index}`),
      tipo: value(fields, `tipo${index}`),
      alcance: value(fields, `alcance${index}`)
    };
    if (Object.values(ataque).some(Boolean)) ataques.push(ataque);
  }
  return ataques;
}

function parsePericias(fields: Record<string, string>) {
  return pericias.map((nome, index): Pericia => {
    const totalKey = index + 1 === 23 ? "tota23" : `total${index + 1}`;
    return {
      nome,
      total: value(fields, totalKey),
      atributo: atributos[value(fields, `modSelect${index}`)] || value(fields, `modSelect${index}`),
      treino: value(fields, `treino${index}`),
      outros: value(fields, `outros${index + 1}`),
      treinado: value(fields, `treinado${index + 1}`) === "sim"
    };
  });
}

function parseArmadurasEscudos(fields: Record<string, string>) {
  const items: Array<Record<string, string>> = [];
  for (let index = 1; index <= 2; index += 1) {
    const item = {
      nome: value(fields, `armadura${index}`),
      defesa: value(fields, `defesa${index}`),
      penalidade: value(fields, `penalidade${index}`)
    };
    if (Object.values(item).some(Boolean)) items.push(item);
  }
  return items;
}

export async function parseTormentaPdf(buffer: Buffer): Promise<Ficha> {
  const pdf = await PDFDocument.load(buffer);
  const fields = extractFields(pdf);
  const nome = value(fields, "Nome");
  if (!nome) throw new Error("O PDF não possui o campo Nome preenchido. Esse campo é obrigatório para identificar a ficha.");
  const classeNivel = normalizeClassLevel(value(fields, "Classe"));
  const data = nowIso();
  const id = slugify(nome);
  return {
    id,
    nome,
    jogador: value(fields, "Jogador"),
    raca: value(fields, "Raca"),
    origem: value(fields, "Origem"),
    classe: classeNivel.classe,
    nivel: value(fields, "nivel") || classeNivel.nivel,
    divindade: value(fields, "Divindade"),
    status: "em-revisao",
    atualizadoEm: data,
    temRevisao: false,
    atributos: {
      força: value(fields, "modFor"),
      destreza: value(fields, "modDes"),
      constituição: value(fields, "modCon"),
      inteligência: value(fields, "modInt"),
      sabedoria: value(fields, "modSab"),
      carisma: value(fields, "modCar")
    },
    recursos: {
      vidaMaxima: value(fields, "vidaMax"),
      vidaAtual: value(fields, "vidaAtual"),
      manaMaxima: value(fields, "manaMax"),
      manaAtual: value(fields, "manaAtual"),
      deslocamento: value(fields, "deslocamento"),
      tamanho: value(fields, "modTamanho"),
      cargaAtual: value(fields, "cargaAtual"),
      cargaMaxima: value(fields, "cargaMaxima"),
      levantar: value(fields, "levantar"),
      resistencia: value(fields, "Resistencia")
    },
    defesa: {
      total: value(fields, "Texto13"),
      base: "10",
      atributo: atributos[value(fields, "modDef")] || value(fields, "modDef"),
      armadura: value(fields, "defesa1"),
      escudo: value(fields, "defesa2"),
      outros: value(fields, "defesaOutros"),
      limiteAtributo: value(fields, "attLimit"),
      penalidadeArmadura: value(fields, "penalidadeDeArmadura"),
      manobras: value(fields, "manobras"),
      furtividade: value(fields, "tFurtividade")
    },
    armadurasEscudos: parseArmadurasEscudos(fields),
    ataques: parseAtaques(fields),
    pericias: parsePericias(fields),
    proficiencias: splitLines(value(fields, "caracteristicas")),
    equipamentos: splitLines(value(fields, "item1")).concat(splitLines(value(fields, "item2"))),
    poderes: splitPoderes(value(fields, "Historico") || value(fields, "Habilidades de classe e poderes") || value(fields, "Habilidades de Raça e Origem")),
    magias: splitLines(value(fields, "Magias")),
    historico: {
      criadoEm: data,
      atualizadoEm: data,
      versao: 1
    },
    camposOriginais: fields
  };
}
