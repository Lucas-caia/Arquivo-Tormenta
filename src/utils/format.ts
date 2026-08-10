export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value
      .map((item) => typeof item === "object" ? JSON.stringify(item) : String(item))
      .join("; ");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function importSourceLabel(source: "web" | "discord") {
  return source === "discord" ? "Discord" : "Interface web";
}
