/// <reference lib="webworker" />

/**
 * Shared web worker for running client-side Transformer models.
 * Loaded models are cached by the browser's OPFS cache API (via transformers.js default).
 */

import { pipeline, env } from "@huggingface/transformers";

// Configure transformers.js
// Use WASM backend
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

// Cache loaded pipelines
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelines: Record<string, any> = {};

// We send progress via callback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const progressCallback = (task: string) => (progressInfo: any) => {
  self.postMessage({ type: "progress", task, progress: progressInfo });
};

type MsgIn =
  | { type: "summarize"; text: string; id: string }
  | { type: "recap"; text: string; id: string }
  | { type: "ask"; text: string; question: string; id: string }
  | { type: "embed"; text: string; id: string }
  | { type: "quiz"; text: string; id: string };

self.onmessage = async (e: MessageEvent<MsgIn>) => {
  const msg = e.data;

  try {
    if (msg.type === "summarize") {
      self.postMessage({ type: "status", task: "summarize", status: "loading" });
      const modelName = "Xenova/distilbart-cnn-6-6";
      
      if (!pipelines["summarize"]) {
        pipelines["summarize"] = await pipeline("summarization", modelName, {
          progress_callback: progressCallback("summarize"),
        });
      }

      self.postMessage({ type: "status", task: "summarize", status: "generating" });
      
      const generator = pipelines["summarize"];
      // Chunking if text is too long could be done here, but let's keep it simple
      const result = await generator(msg.text, {
        max_new_tokens: 150,
      });

      self.postMessage({ 
        type: "result", 
        task: "summarize", 
        id: msg.id, 
        result: result[0].summary_text 
      });
      self.postMessage({ type: "status", task: "summarize", status: "ready" });
    }
    
    if (msg.type === "recap") {
      self.postMessage({ type: "status", task: "recap", status: "loading" });
      const modelName = "Xenova/flan-t5-small";
      
      if (!pipelines["recap"]) {
        pipelines["recap"] = await pipeline("text2text-generation", modelName, {
          progress_callback: progressCallback("recap"),
        });
      }

      self.postMessage({ type: "status", task: "recap", status: "generating" });
      
      const generator = pipelines["recap"];
      const prompt = `Write a short, engaging recap of this chapter. Emphasize key events or main ideas:\n\n${msg.text}`;
      
      const result = await generator(prompt, {
        max_new_tokens: 100,
      });

      self.postMessage({ 
        type: "result", 
        task: "recap", 
        id: msg.id, 
        result: result[0].generated_text 
      });
      self.postMessage({ type: "status", task: "recap", status: "ready" });
    }

    if (msg.type === "ask") {
      self.postMessage({ type: "status", task: "ask", status: "loading" });
      // Example model for QnA - we can use an encoder-decoder or text-generation
      const modelName = "Xenova/flan-t5-small"; 
      
      if (!pipelines["ask"]) {
        pipelines["ask"] = await pipeline("text2text-generation", modelName, {
          progress_callback: progressCallback("ask"),
        });
      }

      self.postMessage({ type: "status", task: "ask", status: "generating" });
      
      const generator = pipelines["ask"];
      const prompt = `Context: ${msg.text}\n\nQuestion: ${msg.question}\n\nAnswer:`;
      
      const result = await generator(prompt, {
        max_new_tokens: 100,
      });

      self.postMessage({ 
        type: "result", 
        task: "ask", 
        id: msg.id, 
        result: result[0].generated_text 
      });
      self.postMessage({ type: "status", task: "ask", status: "ready" });
    }

    if (msg.type === "embed") {
      self.postMessage({ type: "status", task: "embed", status: "loading" });
      const modelName = "Xenova/all-MiniLM-L6-v2";
      
      if (!pipelines["embed"]) {
        pipelines["embed"] = await pipeline("feature-extraction", modelName, {
          progress_callback: progressCallback("embed"),
        });
      }

      self.postMessage({ type: "status", task: "embed", status: "generating" });
      
      const generator = pipelines["embed"];
      const output = await generator(msg.text, { pooling: "mean", normalize: true });
      
      self.postMessage({ 
        type: "result", 
        task: "embed", 
        id: msg.id, 
        result: Array.from(output.data) // Convert Float32Array to standard array
      });
      self.postMessage({ type: "status", task: "embed", status: "ready" });
    }

    if (msg.type === "quiz") {
      self.postMessage({ type: "status", task: "quiz", status: "loading" });
      const modelName = "Xenova/flan-t5-small"; 
      
      if (!pipelines["quiz"]) {
        // Reuse flan-t5-small if available, but pipeline name dictates cache
        pipelines["quiz"] = await pipeline("text2text-generation", modelName, {
          progress_callback: progressCallback("quiz"),
        });
      }

      self.postMessage({ type: "status", task: "quiz", status: "generating" });
      
      const generator = pipelines["quiz"];
      const prompt = `Based on the following text, write exactly 5 multiple-choice questions with 4 options each. Include the correct answer.\n\nText: ${msg.text}\n\nQuestions:`;
      
      const result = await generator(prompt, {
        max_new_tokens: 300,
      });

      self.postMessage({ 
        type: "result", 
        task: "quiz", 
        id: msg.id, 
        result: result[0].generated_text 
      });
      self.postMessage({ type: "status", task: "quiz", status: "ready" });
    }

  } catch (err: any) {
    self.postMessage({ 
      type: "error", 
      task: msg.type, 
      id: msg.id, 
      error: err?.message ?? "Task failed" 
    });
  }
};
