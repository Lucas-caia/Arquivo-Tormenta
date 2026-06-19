export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "personagem-sem-nome";
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function compact(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeClassLevel(value: string) {
  const text = compact(value);
  const match = text.match(/^(.*?)(?:\s+(\d+))?$/);
  if (!match) return { classe: text, nivel: "" };
  return {
    classe: compact(match[1]) || text,
    nivel: compact(match[2])
  };
}
