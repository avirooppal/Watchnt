import i18n from "../i18n";
export const API = "http://localhost:8000";
export async function api<T = any>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, {
      ...options,
      signal: options?.signal || AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new Error(
      i18n.t(
        error instanceof DOMException &&
          (error.name === "TimeoutError" || error.name === "AbortError")
          ? "requestTimeout"
          : "backendUnavailable",
      ),
    );
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      typeof detail.detail === "string"
        ? detail.detail
        : `HTTP ${response.status}`,
    );
  }
  return response.json();
}
export function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
