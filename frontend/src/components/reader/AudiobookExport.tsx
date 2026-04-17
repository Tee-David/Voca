"use client";

import { useState, useRef } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/extract";

interface AudiobookExportProps {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  voice: string;
  speed: number;
}

// Kokoro emits 24 kHz mono WAVs.
const SAMPLE_RATE = 24000;

export function AudiobookExport({ bookId, bookTitle, chapters, voice, speed }: AudiobookExportProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const workerRef = useRef<Worker | null>(null);

  async function startExport() {
    if (exporting) return;
    setExporting(true);
    setProgress(0);
    setDone(false);
    setError("");

    const worker = new Worker(new URL("@/workers/tts.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    const collected: Blob[] = [];

    try {
      await waitForReady(worker, voice, speed);
      // Worker reads currentVoice/currentSpeed globals on init; set explicitly anyway.
      worker.postMessage({ type: "setVoice", voice });
      worker.postMessage({ type: "setSpeed", speed });

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        setCurrentChapter(chapter.title);
        setProgress(Math.round((i / chapters.length) * 95));

        const blobs = await generateChapter(worker, chapter.text, `export-${bookId}-ch${i}`);
        collected.push(...blobs);
      }

      setProgress(97);
      setCurrentChapter("Encoding…");

      // Decode every WAV chunk to PCM, concat, re-encode as one WAV.
      const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
      const decoded: Float32Array[] = [];
      for (const blob of collected) {
        const ab = await blob.arrayBuffer();
        try {
          const audioBuf = await ac.decodeAudioData(ab.slice(0));
          // mono: take channel 0; most Kokoro output is mono, but guard.
          decoded.push(audioBuf.getChannelData(0).slice());
        } catch {
          // skip unplayable chunks rather than abort the whole export
        }
      }
      await ac.close();

      const totalLength = decoded.reduce((n, c) => n + c.length, 0);
      if (totalLength === 0) throw new Error("No audio was generated");

      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of decoded) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const wav = encodeWav(merged, SAMPLE_RATE);
      const outBlob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bookTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "audiobook"}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(100);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      worker.terminate();
      workerRef.current = null;
      setExporting(false);
    }
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Export Audiobook</p>
          <p className="text-xs text-muted-foreground">Generates audio for every chapter and downloads as a single WAV.</p>
        </div>
        <button
          onClick={startExport}
          disabled={exporting || chapters.length === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0",
            done
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          )}
        >
          {exporting ? (
            <><Loader2 size={14} className="animate-spin" /> Exporting…</>
          ) : done ? (
            <><Check size={14} /> Downloaded</>
          ) : (
            <><Download size={14} /> Export</>
          )}
        </button>
      </div>

      {exporting && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground truncate">{currentChapter || "Preparing…"}</span>
            <span className="text-xs font-semibold text-primary">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

function waitForReady(worker: Worker, voice: string, speed: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "status" && d?.status === "ready") {
        worker.removeEventListener("message", onMsg);
        resolve();
      }
      if (d?.type === "error") {
        worker.removeEventListener("message", onMsg);
        reject(new Error(d.error || "TTS worker init failed"));
      }
    };
    worker.addEventListener("message", onMsg);
    worker.postMessage({ type: "init", voice, speed });
  });
}

function generateChapter(worker: Worker, text: string, id: string): Promise<Blob[]> {
  return new Promise((resolve, reject) => {
    const blobs: Blob[] = [];
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.id && d.id !== id) return;
      if (d?.type === "audio" && d.audio instanceof Blob) {
        blobs.push(d.audio);
      } else if (d?.type === "done") {
        worker.removeEventListener("message", onMsg);
        resolve(blobs);
      } else if (d?.type === "error") {
        worker.removeEventListener("message", onMsg);
        reject(new Error(d.error || "Generation failed"));
      }
    };
    worker.addEventListener("message", onMsg);
    worker.postMessage({ type: "generate", text, id });
  });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}
