"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type AIStatus = "idle" | "loading" | "generating" | "ready" | "error";

export type AIProgress = {
  status: string;
  name: string;
  progress: number; // 0-100
};

export type AITaskResult = {
  task: "summarize" | "recap" | "ask" | "embed" | "quiz";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
};

export function useAI(taskType: "summarize" | "recap" | "ask" | "embed" | "quiz") {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<AIStatus>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AIProgress | null>(null);

  const initWorker = useCallback(() => {
    if (workerRef.current) return;

    const worker = new Worker(
      new URL("../workers/ai.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.task !== taskType) return; // ignore messages for other tasks in shared worker? 
      // Actually we have a worker instance per hook, but it's okay to filter just in case.

      if (msg.type === "status") {
        setStatus(msg.status);
      } else if (msg.type === "progress") {
        setProgress(msg.progress);
      } else if (msg.type === "result") {
        setResult(msg.result);
      } else if (msg.type === "error") {
        setStatus("error");
        setError(msg.error);
      }
    };

    workerRef.current = worker;
  }, [taskType]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const summarize = useCallback((text: string, id: string) => {
    if (!workerRef.current) initWorker();
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({ type: "summarize", text, id });
  }, [initWorker]);

  const recap = useCallback((text: string, id: string) => {
    if (!workerRef.current) initWorker();
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({ type: "recap", text, id });
  }, [initWorker]);

  const ask = useCallback((text: string, question: string, id: string) => {
    if (!workerRef.current) initWorker();
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({ type: "ask", text, question, id });
  }, [initWorker]);

  const embed = useCallback((text: string, id: string) => {
    if (!workerRef.current) initWorker();
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({ type: "embed", text, id });
  }, [initWorker]);

  const quiz = useCallback((text: string, id: string) => {
    if (!workerRef.current) initWorker();
    setResult(null);
    setError(null);
    workerRef.current?.postMessage({ type: "quiz", text, id });
  }, [initWorker]);

  return {
    status,
    result,
    error,
    progress,
    summarize,
    recap,
    ask,
    embed,
    quiz,
  };
}
