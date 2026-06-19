import type { Ficha, GitActionResponse, GitStatus, ListaFichasResponse, Revisao, StatusFicha, UploadResponse } from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.erro || payload?.mensagem || "Não foi possível concluir a operação.";
    throw new Error(message);
  }
  return payload as T;
}

export async function listarFichas() {
  const response = await fetch("/api/fichas");
  return parseResponse<ListaFichasResponse>(response);
}

export async function obterFicha(id: string) {
  const response = await fetch(`/api/fichas/${encodeURIComponent(id)}`);
  return parseResponse<Ficha>(response);
}

export async function enviarPdf(file: File) {
  const data = new FormData();
  data.append("pdf", file);
  const response = await fetch("/api/fichas/upload", {
    method: "POST",
    body: data
  });
  return parseResponse<UploadResponse>(response);
}

export async function atualizarStatus(id: string, status: StatusFicha) {
  const response = await fetch(`/api/fichas/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  return parseResponse<Ficha>(response);
}

export async function aprovarTodas() {
  const response = await fetch("/api/fichas/aprovar-todas", { method: "POST" });
  return parseResponse<{ total: number }>(response);
}

export async function obterRevisao(id: string) {
  const response = await fetch(`/api/revisoes/${encodeURIComponent(id)}`);
  return parseResponse<Revisao>(response);
}

export async function aplicarRevisao(id: string, status: StatusFicha) {
  const response = await fetch(`/api/revisoes/${encodeURIComponent(id)}/aplicar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  return parseResponse<Ficha>(response);
}

export async function gitStatus() {
  const response = await fetch("/api/git/status");
  return parseResponse<GitStatus>(response);
}

export async function gitPull() {
  const response = await fetch("/api/git/pull", { method: "POST" });
  return parseResponse<GitActionResponse>(response);
}

export async function gitPush() {
  const response = await fetch("/api/git/push", { method: "POST" });
  return parseResponse<GitActionResponse>(response);
}
