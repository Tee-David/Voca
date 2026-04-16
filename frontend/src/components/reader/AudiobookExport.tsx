"use client";

import { useState, useRef } from "react";
import { Download, Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/extract";

interface AudiobookExportProps {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  voice: string;
  speed: number;
}

export function AudiobookExport({ bookId, bookTitle, chapters, voice, speed }: AudiobookExportProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChapter, setCurrentChapter] = useState("");
  const [done, setDone] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  async function startExport() {
    if (exporting) return;
    setExporting(true);
    setProgress(0);
    setDone(false);
    chunksRef.current = [];

    const worker = new Worker(new URL("@/workers/tts.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    let resolved = false;

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      setCurrentChapter(chapter.title);
      setProgress(Math.round((i / chapters.length) * 100));

      await new Promise<void>((resolve) => {
        resolved = false;

        const handler = (e: MessageEvent) => {
          if (e.data.type === "chunk") {
            chunksRef.current.push(new Float32Array(e.data.audio));
          }
          if (e.data.type === "done" && !resolved) {
            resolved = true;
            resolve();
          }
          if (e.data.type === "ready" && i === 0) {
            worker.postMessage({
              type: "setVoice",
              voice,
            });
            worker.postMessage({
              type: "setSpeed",
              speed,
            });
            worker.postMessage({
              type: "generate",
              text: chapter.text,
              cacheKey: `export-${bookId}-ch${i}`,
            });
          }
          if (e.data.type === "error" && !resolved) {
            resolved = true;
            resolve();
          }
        };

        worker.onmessage = handler;

        if (i === 0) {
          worker.postMessage({ type: "init" });
        } else {
          worker.postMessage({
            type: "generate",
            text: chapter.text,
            cacheKey: `export-${bookId}-ch${i}`,
          });
        }
      });
    }

    worker.terminate();
    setProgress(100);
    setCurrentChapter("Encoding…");

    // Concatenate all chunks into a single WAV
    const totalLength = chunksRef.current.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const wav = encodeWav(merged, 24000);
    const blob = new Blob([wav], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${bookTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.wav`;
    a.click();

    URL.revokeObjectURL(url);
    setDone(true);
    setExporting(false);
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Export Audiobook</p>
          <p className="text-xs text-muted-foreground">Generate audio for all chapters and download as WAV</p>
        </div>
        <button
          onClick={startExport}
          disabled={exporting}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition",
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
            <span className="text-xs text-muted-foreground truncate">{currentChapter}</span>
            <span className="text-xs font-semibold text-primary">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
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
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
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
