const PROXY_FALLBACK = (r2Key: string) => `/api/files/${r2Key}`;

const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolve a download URL for a given r2Key. Prefers a presigned R2 URL
 * (direct browser → R2, one network hop). Falls back to the Next.js proxy
 * if signing fails or the browser is offline.
 */
export async function getFileUrl(r2Key: string): Promise<string> {
  const hit = cache.get(r2Key);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url;

  try {
    const res = await fetch("/api/files/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r2Key, op: "get" }),
    });
    if (!res.ok) throw new Error("sign failed");
    const { url, expiresIn } = (await res.json()) as { url: string; expiresIn: number };
    cache.set(r2Key, { url, expiresAt: Date.now() + expiresIn * 1000 });
    return url;
  } catch {
    return PROXY_FALLBACK(r2Key);
  }
}

export async function getUploadUrlFor(r2Key: string, contentType: string): Promise<string> {
  const res = await fetch("/api/files/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r2Key, op: "put", contentType }),
  });
  if (!res.ok) throw new Error(`Failed to sign upload: ${res.status}`);
  const { url } = (await res.json()) as { url: string };
  return url;
}
