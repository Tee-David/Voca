"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Chapter } from "./extract";

interface VocaDB extends DBSchema {
  chapters: {
    key: string; // bookId
    value: { bookId: string; chapters: Chapter[]; savedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<VocaDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<VocaDB>("voca-cache", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("chapters")) {
          db.createObjectStore("chapters", { keyPath: "bookId" });
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
