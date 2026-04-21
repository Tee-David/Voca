import { apiFetch, apiUrl } from "@/lib/api";
import { getOfflineBookBlobUrl } from "@/lib/offline";

/**
 * Resolve a download URL for a given r2Key.
 *
 * On mobile we first check whether the book has been downloaded for offline —
 * if so, we return a blob URL backed by the local file. Otherwise we fall back
 * to the same-origin proxy (`/api/files/<key>`) which streams bytes from R2
 * with HTTP Range support.
 */
export async function getFileUrl(r2Key: string, bookId?: string): Promise<string> {
  if (bookId) {
    const local = await getOfflineBookBlobUrl(bookId);
    if (local) return local;
  }
  const encodedPath = r2Key.split("/").map(encodeURIComponent).join("/");
  return apiUrl(`/api/files/${encodedPath}`);
}

export async function getUploadUrlFor(r2Key: string, contentType: string): Promise<string> {
  const res = await apiFetch("/api/files/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r2Key, op: "put", contentType }),
  });
  if (!res.ok) throw new Error(`Failed to sign upload: ${res.status}`);
  const { url } = (await res.json()) as { url: string };
  return url;
}
