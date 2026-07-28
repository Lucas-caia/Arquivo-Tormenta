import type {
  ApiErrorPayload,
  Ficha,
  GitActionResponse,
  GitStatus,
  ListaFichasResponse,
  Revisao,
  StatusFicha,
  UploadResponse
} from "../../shared/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: string[];

  constructor(message: string, status: number, code?: string, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    return text || null;
  }
  return response.json().catch(() => null);
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique se a aplicação está em execução.",
      0,
      "NETWORK_ERROR"
    );
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const apiPayload = payload && typeof payload === "object" ? payload as ApiErrorPayload : null;
    const fallback = typeof payload === "string" && payload.trim()
      ? payload.trim()
      : "Não foi possível concluir a operação.";
    throw new ApiError(
      apiPayload?.erro || fallback,
      response.status,
      apiPayload?.codigo,
      apiPayload?.detalhes ?? []
    );
  }

  return payload as T;
}

export function listarFichas() {
  return request<ListaFichasResponse>("/api/fichas");
}

export function obterFicha(id: string) {
  return request<Ficha>(`/api/fichas/${encodeURIComponent(id)}`);
}

export function enviarPdf(file: File) {
  const data = new FormData();
  data.append("pdf", file);
  return request<UploadResponse>("/api/fichas/upload", {
    method: "POST",
    body: data
  });
}

export function atualizarStatus(id: string, status: StatusFicha) {
  return request<Ficha>(`/api/fichas/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

export function aprovarTodas() {
  return request<{ total: number }>("/api/fichas/aprovar-todas", { method: "POST" });
}

export function obterRevisao(id: string) {
  return request<Revisao>(`/api/revisoes/${encodeURIComponent(id)}`);
}

export function descartarRevisao(id: string) {
  return request<{ sucesso: true }>(`/api/revisoes/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export function aplicarRevisao(id: string, status: StatusFicha) {
  return request<Ficha>(`/api/revisoes/${encodeURIComponent(id)}/aplicar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

export function gitStatus() {
  return request<GitStatus>("/api/git/status");
}

export function gitPull() {
  return request<GitActionResponse>("/api/git/pull", { method: "POST" });
}

export function gitPush() {
  return request<GitActionResponse>("/api/git/push", { method: "POST" });
}
