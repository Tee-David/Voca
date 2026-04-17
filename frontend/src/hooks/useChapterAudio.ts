"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCachedAudio,
  putCachedAudio,
  hasCachedAudio,
  requestPersistentStorage,
} from "@/lib/bookCache";
import type { useKokoro } from "./useKokoro";
import type { usePlayer } from "./usePlayer";

type KokoroAPI = ReturnType<typeof useKokoro>;
type PlayerAPI = ReturnType<typeof usePlayer>;

/**
 * Orchestrates chapter playback with transparent IndexedDB caching.
 * - Cache hit: enqueues cached sentence blobs into the player immediately (zero TTS cost)
 * - Cache miss: streams TTS, collects blobs write-through, persists on done
 */
export function useChapterAudio(tts: KokoroAPI, player: PlayerAPI) {
  const [cachedSet, setCachedSet] = useState<Set<string>>(new Set());
  const collectingRef = useRef<{ blobs: Blob[]; sentences: string[]; key: string | null }>(
    { blobs: [], sentences: [], key: null }
  );

  const keyOf = useCallback(
    (bookId: string, chapterIdx: number, voice: string, speed: number) =>
      `${bookId}:${chapterIdx}:${voice}:${speed.toFixed(2)}`,
    []
  );

  const checkCached = useCallback(
    async (bookId: string, chapterIdx: number, voice: string, speed: number) => {
      const has = await hasCachedAudio(bookId, chapterIdx, voice, speed);
      if (has) {
        setCachedSet((prev) => new Set(prev).add(keyOf(bookId, chapterIdx, voice, speed)));
      }
      return has;
    },
    [keyOf]
  );

  const isCached = useCallback(
    (bookId: string, chapterIdx: number, voice: string, speed: number) =>
      cachedSet.has(keyOf(bookId, chapterIdx, voice, speed)),
    [cachedSet, keyOf]
  );

  /**
   * Play a chapter with cache-first strategy.
   * onSentence fires as each sentence's blob becomes playable (cached or freshly generated).
   */
  const playChapter = useCallback(
    async (
      bookId: string,
      chapterIdx: number,
      text: string,
      voice: string,
      speed: number,
      onSentence?: (index: number, total: number, sentence: string) => void
    ) => {
      requestPersistentStorage().catch(() => {});
      player.resetQueue();

      const hit = await getCachedAudio(bookId, chapterIdx, voice, speed);
      if (hit && hit.blobs.length > 0) {
        hit.blobs.forEach((blob, i) => {
          player.enqueueChunk(blob);
          onSentence?.(i, hit.blobs.length, hit.sentences[i] ?? "");
        });
        return { source: "cache" as const };
      }

      // Cache miss — hook up collector
      collectingRef.current = {
        blobs: [],
        sentences: [],
        key: keyOf(bookId, chapterIdx, voice, speed),
      };

      tts.onChunk((chunk) => {
        collectingRef.current.blobs.push(chunk.audio);
        collectingRef.current.sentences.push(chunk.sentence);
        player.enqueueChunk(chunk.audio);
        onSentence?.(chunk.index, chunk.total, chunk.sentence);
      });

      tts.onDone(() => {
        const { blobs, sentences } = collectingRef.current;
        if (blobs.length > 0) {
          putCachedAudio(bookId, chapterIdx, voice, speed, blobs, sentences)
            .then(() => setCachedSet((prev) => new Set(prev).add(keyOf(bookId, chapterIdx, voice, speed))))
            .catch(() => {});
        }
      });

      tts.generate({ text }, `${bookId}-ch${chapterIdx}`);
      return { source: "live" as const };
    },
    [tts, player, keyOf]
  );

  /**
   * Silently pre-generate a chapter's audio into the cache (no playback).
   * Use this to pre-warm the next chapter while the current one plays.
   */
  const prewarmChapter = useCallback(
    async (bookId: string, chapterIdx: number, text: string, voice: string, speed: number) => {
      const has = await hasCachedAudio(bookId, chapterIdx, voice, speed);
      if (has) return;
      // Skipped for now: prewarming while another generate is running requires a second
      // worker. Current single-worker design means prewarm would interfere with playback.
    },
    []
  );

  return { playChapter, prewarmChapter, isCached, checkCached };
}
