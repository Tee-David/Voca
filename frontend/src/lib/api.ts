/**
 * Platform-aware fetch wrapper for Voca.
 *
 * On web: NEXT_PUBLIC_API_BASE_URL is empty → requests stay same-origin (cookies work).
 * On mobile (Capacitor): NEXT_PUBLIC_API_BASE_URL = https://voca.vercel.app → cross-origin.
 *   Cookies won't cross; a JWT bearer token (set via setAuthToken) is attached instead.
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
 * Build pdfjs getDocument() options that include the Bearer token on mobile
 * (cross-origin — where proxy routes reject unauthenticated requests).
 */
export function pdfDocumentOptions(url: string): { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean } {
  if (!API_BASE || !authToken) return { url };
  return {
    url,
    httpHeaders: { Authorization: `Bearer ${authToken}` },
    withCredentials: false,
  };
}
