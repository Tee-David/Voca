/**
 * Offline book downloads — Phase F.
 *
 * Stores book files in the native Filesystem and tracks them in a Preferences-backed
 * manifest. On web (or before any download), all functions no-op gracefully.
 */

import { apiFetch } from "./api";
import { isNative } from "./native";

const MANIFEST_KEY = "voca.offlineManifest";

type OfflineEntry = {
  bookId: string;
  fileType: string;
  path: string;
  size: number;
  downloadedAt: string;
};

type Manifest = Record<string, OfflineEntry>;

async function getPrefs() {
  if (!isNative()) return null;
  try {
    const mod = await import("@capacitor/preferences");
    return mod.Preferences;
  } catch {
    return null;
  }
}

async function getFs() {
  if (!isNative()) return null;
  try {
    return await import("@capacitor/filesystem");
  } catch {
    return null;
  }
}

type BlobWriteFn = (opts: {
  path: string;
  directory: string;
  blob: Blob;
  fast_mode?: boolean;
  recursive?: boolean;
  on_fallback?: (err: unknown) => void;
}) => Promise<string>;

async function getBlobWriter(): Promise<BlobWriteFn | null> {
  if (!isNative()) return null;
  try {
    const mod = await import("capacitor-blob-writer");
    const fn = (mod as unknown as { default?: unknown }).default ?? mod;
    return fn as unknown as BlobWriteFn;
  } catch {
    return null;
  }
}

async function readManifest(): Promise<Manifest> {
  const Prefs = await getPrefs();
  if (!Prefs) return {};
  try {
    const { value } = await Prefs.get({ key: MANIFEST_KEY });
    return value ? (JSON.parse(value) as Manifest) : {};
  } catch {
    return {};
  }
}

async function writeManifest(m: Manifest) {
  const Prefs = await getPrefs();
  if (!Prefs) return;
  await Prefs.set({ key: MANIFEST_KEY, value: JSON.stringify(m) });
}

export async function isBookOffline(bookId: string): Promise<boolean> {
  if (!isNative()) return false;
  const m = await readManifest();
  return Boolean(m[bookId]);
}

export async function listOfflineBooks(): Promise<OfflineEntry[]> {
  const m = await readManifest();
  return Object.values(m).sort(
    (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
  );
}

export async function getOfflineBookFile(bookId: string): Promise<string | null> {
  const m = await readManifest();
  const entry = m[bookId];
  if (!entry) return null;
  const fs = await getFs();
  if (!fs) return null;
  try {
    const { uri } = await fs.Filesystem.getUri({ directory: fs.Directory.Data, path: entry.path });
    return uri;
  } catch {
    return null;
  }
}

/**
 * Returns a blob URL for an offline book (or null if not downloaded).
 * Works with pdfjs / fetch / <img> regardless of Capacitor URI scheme quirks,
 * since the blob lives in the webview's origin.
 */
export async function getOfflineBookBlobUrl(bookId: string): Promise<string | null> {
  const m = await readManifest();
  const entry = m[bookId];
  if (!entry) return null;
  const fs = await getFs();
  if (!fs) return null;
  try {
    const { data } = await fs.Filesystem.readFile({
      path: entry.path,
      directory: fs.Directory.Data,
    });
    const base64 = typeof data === "string" ? data : "";
    const bytes = base64ToBytes(base64);
    const mime = entry.fileType === "pdf"
      ? "application/pdf"
      : entry.fileType === "epub"
        ? "application/epub+zip"
        : "application/octet-stream";
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function downloadBook(
  bookId: string,
  opts: { onProgress?: (pct: number) => void } = {}
): Promise<OfflineEntry> {
  if (!isNative()) throw new Error("Offline download only available on mobile");

  const metaRes = await apiFetch(`/api/library/${bookId}`);
  if (!metaRes.ok) throw new Error(`Book metadata failed: ${metaRes.status}`);
  const meta = (await metaRes.json()) as { r2Key: string; fileType: string };

  const signRes = await apiFetch("/api/files/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r2Key: meta.r2Key, op: "get" }),
  });
  if (!signRes.ok) throw new Error(`Sign failed: ${signRes.status}`);
  const { url } = (await signRes.json()) as { url: string };

  const fileRes = await fetch(url);
  if (!fileRes.ok) throw new Error(`Download failed: ${fileRes.status}`);
  const blob = await fileRes.blob();

  const fs = await getFs();
  if (!fs) throw new Error("Filesystem plugin unavailable");

  const path = `books/${bookId}.${meta.fileType}`;

  // Prefer capacitor-blob-writer (chunked writes, no base64 OOM on large books).
  // Falls back to Filesystem.writeFile(base64) if the plugin isn't available.
  const blobWrite = await getBlobWriter();
  if (blobWrite) {
    await blobWrite({
      path,
      directory: fs.Directory.Data,
      blob,
      recursive: true,
      fast_mode: true,
    });
  } else {
    const base64 = await blobToBase64(blob);
    await fs.Filesystem.writeFile({
      path,
      data: base64,
      directory: fs.Directory.Data,
      recursive: true,
    });
  }

  const entry: OfflineEntry = {
    bookId,
    fileType: meta.fileType,
    path,
    size: blob.size,
    downloadedAt: new Date().toISOString(),
  };
  const m = await readManifest();
  m[bookId] = entry;
  await writeManifest(m);
  opts.onProgress?.(100);
  return entry;
}

export async function deleteOfflineBook(bookId: string): Promise<void> {
  const m = await readManifest();
  const entry = m[bookId];
  if (!entry) return;
  const fs = await getFs();
  if (fs) {
    try {
      await fs.Filesystem.deleteFile({ path: entry.path, directory: fs.Directory.Data });
    } catch { /* file may already be gone */ }
  }
  delete m[bookId];
  await writeManifest(m);
}

export async function totalOfflineBytes(): Promise<number> {
  const entries = await listOfflineBooks();
  return entries.reduce((s, e) => s + e.size, 0);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const s = String(r.result);
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.readAsDataURL(blob);
  });
}
