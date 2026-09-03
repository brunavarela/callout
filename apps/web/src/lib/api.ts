export const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    let body: unknown;
    try {
      body = await res.json();
      if ((body as { error?: string })?.error) message = (body as { error: string }).error;
    } catch {
      // resposta sem corpo JSON — mantém a mensagem genérica
    }
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
