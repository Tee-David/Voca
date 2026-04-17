/**
 * Resolve a download URL for a given r2Key.
 *
 * We use the same-origin proxy (`/api/files/<key>`) rather than a presigned
 * direct-to-R2 URL. Direct R2 fetches require CORS configuration on the
 * bucket which our current token can't set. The proxy streams bytes from
 * R2 and supports HTTP Range requests, so pdfjs can still open pages
 * progressively without waiting for the whole PDF.
 */
export async function getFileUrl(r2Key: string): Promise<string> {
  return `/api/files/${r2Key}`;
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
