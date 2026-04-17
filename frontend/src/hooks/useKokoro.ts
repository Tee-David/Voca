"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type TTSStatus = "idle" | "loading" | "ready" | "generating" | "error";

export type AudioChunk = {
  id: string;
  index: number;
  total: number;
  sentence: string;
  audio: Blob;
};

export const KOKORO_VOICES = [
  { id: "af_bella", name: "Bella", gender: "F", accent: "American" },
  { id: "af_nicole", name: "Nicole", gender: "F", accent: "American" },
  { id: "af_sarah", name: "Sarah", gender: "F", accent: "American" },
  { id: "af_sky", name: "Sky", gender: "F", accent: "American" },
  { id: "am_adam", name: "Adam", gender: "M", accent: "American" },
  { id: "am_michael", name: "Michael", gender: "M", accent: "American" },
  { id: "bf_emma", name: "Emma", gender: "F", accent: "British" },
  { id: "bf_isabella", name: "Isabella", gender: "F", accent: "British" },
  { id: "bm_george", name: "George", gender: "M", accent: "British" },
] as const;

export type VoiceId = (typeof KOKORO_VOICES)[number]["id"];

const DEFAULT_VOICE_KEY = "voca:default:voice";
const DEFAULT_SPEED_KEY = "voca:default:speed";

function readDefaultVoice(): VoiceId {
  if (typeof window === "undefined") return "af_bella";
  try {
    const v = localStorage.getItem(DEFAULT_VOICE_KEY);
    if (v && KOKORO_VOICES.some((kv) => kv.id === v)) return v as VoiceId;
  } catch { /* ignore */ }
  return "af_bella";
}

function readDefaultSpeed(): number {
  if (typeof window === "undefined") return 1.0;
  try {
    const s = parseFloat(localStorage.getItem(DEFAULT_SPEED_KEY) || "");
    if (Number.isFinite(s) && s >= 0.5 && s <= 2.0) return s;
  } catch { /* ignore */ }
  return 1.0;
}

export function useKokoro() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<TTSStatus>("idle");
  const [voice, setVoice] = useState<VoiceId>(readDefaultVoice);
  const [speed, setSpeed] = useState<number>(readDefaultSpeed);
  const [defaultVoice, setDefaultVoiceState] = useState<VoiceId>(readDefaultVoice);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const onChunkRef = useRef<((chunk: AudioChunk) => void) | null>(null);
  const onDoneRef = useRef<((id: string) => void) | null>(null);
  const onSampleRef = useRef<((voice: string, audio: Blob) => void) | null>(null);

  const initWorker = useCallback(() => {
    if (workerRef.current) return;

    const worker = new Worker(
      new URL("../workers/tts.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "status") {
        setStatus(msg.status);
        if (msg.status === "ready") setDownloadProgress(100);
      }
      if (msg.type === "generating") setStatus("generating");
      if (msg.type === "audio") onChunkRef.current?.(msg);
      if (msg.type === "done") {
        setStatus("ready");
        onDoneRef.current?.(msg.id);
      }
      if (msg.type === "sample") onSampleRef.current?.(msg.voice, msg.audio);
      if (msg.type === "error") setStatus("error");
      
      if (msg.type === "progress") {
        const { status, progress, file } = msg.progress;
        if (typeof progress === "number") {
          setDownloadProgress((prev) => Math.max(prev, Math.round(progress)));
        }
      }
    };

    workerRef.current = worker;
    worker.postMessage({ type: "init", voice, speed });
  }, [voice, speed]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const generate = useCallback(
    (text: string, id: string) => {
      if (!workerRef.current) initWorker();
      workerRef.current?.postMessage({ type: "generate", text, id });
    },
    [initWorker]
  );

  const changeVoice = useCallback((v: VoiceId) => {
    setVoice(v);
    workerRef.current?.postMessage({ type: "setVoice", voice: v });
  }, []);

  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    workerRef.current?.postMessage({ type: "setSpeed", speed: s });
  }, []);

  const playSample = useCallback(
    (voiceId: string, text = "Hello! This is a sample of my voice.") => {
      if (!workerRef.current) initWorker();
      workerRef.current?.postMessage({ type: "sample", voice: voiceId, text });
    },
    [initWorker]
  );

  const setAsDefault = useCallback((v: VoiceId, s: number) => {
    try {
      localStorage.setItem(DEFAULT_VOICE_KEY, v);
      localStorage.setItem(DEFAULT_SPEED_KEY, String(s));
    } catch { /* ignore */ }
    setDefaultVoiceState(v);
  }, []);

  return {
    status,
    voice,
    speed,
    defaultVoice,
    downloadProgress,
    initWorker,
    generate,
    changeVoice,
    changeSpeed,
    playSample,
    setAsDefault,
    onChunk: (fn: (chunk: AudioChunk) => void) => { onChunkRef.current = fn; },
    onDone: (fn: (id: string) => void) => { onDoneRef.current = fn; },
    onSample: (fn: (voice: string, audio: Blob) => void) => { onSampleRef.current = fn; },
  };
}
