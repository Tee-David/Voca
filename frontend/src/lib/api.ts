/**
 * Platform-aware fetch wrapper for Voca.
 *
 * Web builds use same-origin requests by default so browser session cookies work.
 * Capacitor builds can set NEXT_PUBLIC_API_BASE_URL to a self-hosted or managed
 * Voca API endpoint. Cross-origin mobile requests use the bearer token managed
 * by the native authentication flow instead of browser cookies.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const credentials: RequestCredentials = API_BASE ? "omit" : (init.credentials ?? "same-origin");

  return fetch(apiUrl(path), { ...init, headers, credentials });
}

/**
 * Build pdfjs getDocument() options that include the bearer token for an
 * authenticated cross-origin mobile API endpoint.
 */
export function pdfDocumentOptions(url: string): { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean } {
  if (!API_BASE || !authToken) return { url };
  return {
    url,
    httpHeaders: { Authorization: `Bearer ${authToken}` },
    withCredentials: false,
  };
}
