import type { Diferenca } from "./types.js";

const ignored = new Set([
  "status",
  "atualizadoEm",
  "temRevisao",
  "historico.atualizadoEm",
  "historico.versao",
  "camposOriginais"
]);

const labels: Record<string, string> = {
  nome: "Nome",
  jogador: "Jogador",
  raca: "Raça",
  origem: "Origem",
  classe: "Classe",
  nivel: "Nível",
  status: "Status",
  divindade: "Divindade",
  "atributos.força": "Força",
  "atributos.destreza": "Destreza",
  "atributos.constituição": "Constituição",
  "atributos.inteligência": "Inteligência",
  "atributos.sabedoria": "Sabedoria",
  "atributos.carisma": "Carisma",
  "recursos.vidaMaxima": "PV máximo",
  "recursos.vidaAtual": "PV atual",
  "recursos.manaMaxima": "PM máximo",
  "recursos.manaAtual": "PM atual",
  "recursos.deslocamento": "Deslocamento",
  "recursos.cargaAtual": "Carga atual",
  "recursos.cargaMaxima": "Carga máxima",
  "defesa.total": "Defesa total",
  "defesa.armadura": "Bônus de armadura",
  "defesa.escudo": "Bônus de escudo",
  ataques: "Ataques",
  pericias: "Perícias",
  poderes: "Poderes",
  equipamentos: "Equipamentos",
  magias: "Magias",
  proficiencias: "Proficiências"
};

function isPlainObject(value: unknown) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function label(path: string) {
  if (labels[path]) return labels[path];
  const arrayMatch = path.match(/^([a-zA-Zçãõáéíóúâêô]+)\.(\d+)\.(.+)$/);
  if (arrayMatch) {
    const base = labels[arrayMatch[1]] || arrayMatch[1];
    return `${base} ${Number(arrayMatch[2]) + 1}: ${arrayMatch[3]}`;
  }
  return path.replace(/\./g, " › ");
}

function walk(before: unknown, after: unknown, path: string, output: Diferenca[]) {
  if (ignored.has(path)) return;
  if (same(before, after)) return;
  if (Array.isArray(before) || Array.isArray(after)) {
    output.push({
      caminho: path,
      rotulo: label(path),
      antes: before ?? "",
      depois: after ?? "",
      tipo: before === undefined ? "adicionado" : after === undefined ? "removido" : "alterado"
    });
    return;
  }
  if (isPlainObject(before) || isPlainObject(after)) {
    const keys = new Set([...Object.keys((before as Record<string, unknown>) || {}), ...Object.keys((after as Record<string, unknown>) || {})]);
    for (const key of keys) {
      walk((before as Record<string, unknown>)?.[key], (after as Record<string, unknown>)?.[key], path ? `${path}.${key}` : key, output);
    }
    return;
  }
  output.push({
    caminho: path,
    rotulo: label(path),
    antes: before ?? "",
    depois: after ?? "",
    tipo: before === undefined ? "adicionado" : after === undefined ? "removido" : "alterado"
  });
}

export function diffObjects(before: unknown, after: unknown) {
  const output: Diferenca[] = [];
  walk(before, after, "", output);
  return output.filter((item) => item.caminho !== "");
}
