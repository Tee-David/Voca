"use client";

import { hasCachedAudio, putCachedAudio } from "./bookCache";
import { compressAll } from "./audioCompress";

/**
 * Pre-warm a chapter: spawn a dedicated worker, generate audio silently,
 * compress to Opus, write to IndexedDB — all without touching the main
 * playback worker. Model is loaded from HTTP cache so spawning is cheap.
 *
 * Cancellation: pass an AbortSignal — worker is terminated on abort.
 */
export async function prewarmChapter(opts: {
  bookId: string;
  chapterIdx: number;
  text: string;
  voice: string;
  speed: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}): Promise<"cached" | "warmed" | "aborted" | "failed"> {
  const { bookId, chapterIdx, text, voice, speed, signal, onProgress } = opts;

  const already = await hasCachedAudio(bookId, chapterIdx, voice, speed);
  if (already) return "cached";

  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let settled = false;
    const blobs: Blob[] = [];
    const sentences: string[] = [];

    const cleanup = (result: "warmed" | "aborted" | "failed") => {
      if (settled) return;
      settled = true;
      try { worker?.terminate(); } catch { /* ignore */ }
      resolve(result);
    };

    if (signal) {
      if (signal.aborted) { cleanup("aborted"); return; }
      signal.addEventListener("abort", () => cleanup("aborted"), { once: true });
    }

    try {
      worker = new Worker(
        new URL("../workers/tts.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = async (e) => {
        const msg = e.data;
        if (msg.type === "status" && msg.status === "ready") {
          worker?.postMessage({ type: "setVoice", voice });
          worker?.postMessage({ type: "setSpeed", speed });
          worker?.postMessage({ type: "generate", text, id: `prewarm-${bookId}-${chapterIdx}` });
        }
        if (msg.type === "audio") {
          blobs.push(msg.audio);
          sentences.push(msg.sentence);
          onProgress?.(msg.index + 1, msg.total);
        }
        if (msg.type === "done") {
          try {
            if (blobs.length > 0) {
              const compressed = await compressAll(blobs);
              await putCachedAudio(bookId, chapterIdx, voice, speed, compressed, sentences);
              cleanup("warmed");
            } else {
              cleanup("failed");
            }
          } catch {
            cleanup("failed");
          }
        }
        if (msg.type === "error") cleanup("failed");
      };

      worker.onerror = () => cleanup("failed");
      worker.postMessage({ type: "init", voice, speed });
    } catch {
      cleanup("failed");
    }
  });
}
