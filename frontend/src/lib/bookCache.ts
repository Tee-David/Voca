"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Chapter } from "./extract";

type AudioCacheEntry = {
  key: string;
  bookId: string;
  chapterIdx: number;
  voice: string;
  speed: number;
  blobs: Blob[];
  sentences: string[];
  createdAt: number;
  lastPlayedAt: number;
  byteSize: number;
};

interface VocaDB extends DBSchema {
  chapters: {
    key: string;
    value: { bookId: string; chapters: Chapter[]; savedAt: number };
  };
  audioCache: {
    key: string;
    value: AudioCacheEntry;
    indexes: { "by-book": string; "by-lastPlayed": number };
  };
  embeddings: {
    key: string; // bookId
    value: { bookId: string; paragraphs: { text: string; vector: number[] }[] };
  };
}

const DB_VERSION = 3;
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500MB soft cap

let dbPromise: Promise<IDBPDatabase<VocaDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<VocaDB>("voca-cache", DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("chapters")) {
          db.createObjectStore("chapters", { keyPath: "bookId" });
        }
        if (!db.objectStoreNames.contains("audioCache")) {
          const store = db.createObjectStore("audioCache", { keyPath: "key" });
          store.createIndex("by-book", "bookId");
          store.createIndex("by-lastPlayed", "lastPlayedAt");
        }
        if (!db.objectStoreNames.contains("embeddings")) {
          db.createObjectStore("embeddings", { keyPath: "bookId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheChapters(bookId: string, chapters: Chapter[]) {
  const db = await getDB();
  if (!db) return;
  await db.put("chapters", { bookId, chapters, savedAt: Date.now() });
}

export async function getCachedChapters(bookId: string): Promise<Chapter[] | null> {
  const db = await getDB();
  if (!db) return null;
  const row = await db.get("chapters", bookId);
  return row?.chapters ?? null;
}

// ─── Audio cache ────────────────────────────────────────────────────────────

function audioKey(bookId: string, chapterIdx: number, voice: string, speed: number) {
  return `${bookId}:${chapterIdx}:${voice}:${speed.toFixed(2)}`;
}

export async function getCachedAudio(
  bookId: string,
  chapterIdx: number,
  voice: string,
  speed: number
): Promise<{ blobs: Blob[]; sentences: string[] } | null> {
  const db = await getDB();
  if (!db) return null;
  const row = await db.get("audioCache", audioKey(bookId, chapterIdx, voice, speed));
  if (!row) return null;
  // touch lastPlayedAt for LRU
  row.lastPlayedAt = Date.now();
  await db.put("audioCache", row);
  return { blobs: row.blobs, sentences: row.sentences };
}

export async function putCachedAudio(
  bookId: string,
  chapterIdx: number,
  voice: string,
  speed: number,
  blobs: Blob[],
  sentences: string[]
) {
  const db = await getDB();
  if (!db) return;
  const byteSize = blobs.reduce((sum, b) => sum + b.size, 0);
  const entry: AudioCacheEntry = {
    key: audioKey(bookId, chapterIdx, voice, speed),
    bookId,
    chapterIdx,
    voice,
    speed,
    blobs,
    sentences,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    byteSize,
  };
  await db.put("audioCache", entry);
  await evictIfOverCap(db);
}

export async function hasCachedAudio(
  bookId: string,
  chapterIdx: number,
  voice: string,
  speed: number
): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  const row = await db.get("audioCache", audioKey(bookId, chapterIdx, voice, speed));
  return !!row;
}

export async function countCachedChaptersForBook(bookId: string): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  return db.countFromIndex("audioCache", "by-book", bookId);
}

export async function clearAudioForBook(bookId: string) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction("audioCache", "readwrite");
  const idx = tx.store.index("by-book");
  for await (const cursor of idx.iterate(bookId)) {
    await cursor.delete();
  }
  await tx.done;
}

async function evictIfOverCap(db: IDBPDatabase<VocaDB>) {
  const all = await db.getAll("audioCache");
  const total = all.reduce((sum, e) => sum + e.byteSize, 0);
  if (total <= MAX_CACHE_BYTES) return;

  all.sort((a, b) => a.lastPlayedAt - b.lastPlayedAt);
  let remaining = total;
  for (const entry of all) {
    if (remaining <= MAX_CACHE_BYTES * 0.9) break;
    await db.delete("audioCache", entry.key);
    remaining -= entry.byteSize;
  }
}

// ─── Voice preview cache ────────────────────────────────────────────────────
// Small singleton blob per voice — auto-regenerated if model/voice pipeline changes.

export async function getCachedPreview(voiceId: string): Promise<Blob | null> {
  const db = await getDB();
  if (!db) return null;
  const key = `preview:${voiceId}`;
  const row = await db.get("audioCache", key);
  return row ? row.blobs[0] ?? null : null;
}

export async function putCachedPreview(voiceId: string, blob: Blob) {
  const db = await getDB();
  if (!db) return;
  const entry: AudioCacheEntry = {
    key: `preview:${voiceId}`,
    bookId: "__preview__",
    chapterIdx: 0,
    voice: voiceId,
    speed: 1,
    blobs: [blob],
    sentences: [],
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    byteSize: blob.size,
  };
  await db.put("audioCache", entry);
}

// Request persistent storage so Safari/iOS doesn't evict after 7 days
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    const persisted = await navigator.storage.persisted();
    if (persisted) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// ─── Embeddings cache ───────────────────────────────────────────────────────

export async function getCachedEmbeddings(
  bookId: string
): Promise<{ text: string; vector: number[] }[] | null> {
  const db = await getDB();
  if (!db) return null;
  const row = await db.get("embeddings", bookId);
  return row?.paragraphs ?? null;
}

export async function putCachedEmbeddings(
  bookId: string,
  paragraphs: { text: string; vector: number[] }[]
) {
  const db = await getDB();
  if (!db) return;
  await db.put("embeddings", { bookId, paragraphs });
}
