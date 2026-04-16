/// <reference lib="webworker" />

let pipeline: any = null;
let currentVoice = "af_bella";
let currentSpeed = 1.0;

type MsgIn =
  | { type: "init"; voice?: string; speed?: number }
  | { type: "generate"; text: string; id: string }
  | { type: "setVoice"; voice: string }
  | { type: "setSpeed"; speed: number }
  | { type: "sample"; voice: string; text: string };

self.onmessage = async (e: MessageEvent<MsgIn>) => {
  const msg = e.data;

  if (msg.type === "init") {
    if (msg.voice) currentVoice = msg.voice;
    if (msg.speed) currentSpeed = msg.speed;

    if (!pipeline) {
      try {
        self.postMessage({ type: "status", status: "loading" });
        const { KokoroTTS } = await import("kokoro-js");
        pipeline = await KokoroTTS.from_pretrained(
          "onnx-community/Kokoro-82M-v1.0-ONNX",
          { dtype: "q8" }
        );
        self.postMessage({ type: "status", status: "ready" });
      } catch (err: any) {
        self.postMessage({ type: "error", error: err?.message ?? "Failed to load TTS model" });
      }
    } else {
      self.postMessage({ type: "status", status: "ready" });
    }
    return;
  }

  if (msg.type === "setVoice") {
    currentVoice = msg.voice;
    return;
  }

  if (msg.type === "setSpeed") {
    currentSpeed = msg.speed;
    return;
  }

  if (msg.type === "sample") {
    if (!pipeline) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }
    try {
      const audio = await pipeline.generate(msg.text, {
        voice: msg.voice,
        speed: currentSpeed,
      });
      const wav = audio.toWav();
      self.postMessage(
        { type: "sample", voice: msg.voice, audio: wav },
        [wav]
      );
    } catch (err: any) {
      self.postMessage({ type: "error", error: err?.message ?? "Sample failed" });
    }
    return;
  }

  if (msg.type === "generate") {
    if (!pipeline) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }

    try {
      self.postMessage({ type: "generating", id: msg.id });

      const sentences = splitSentences(msg.text);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;

        const audio = await pipeline.generate(sentence, {
          voice: currentVoice,
          speed: currentSpeed,
        });

        const wav = audio.toWav();
        self.postMessage(
          {
            type: "audio",
            id: msg.id,
            index: i,
            total: sentences.length,
            sentence,
            audio: wav,
          },
          [wav]
        );
      }

      self.postMessage({ type: "done", id: msg.id });
    } catch (err: any) {
      self.postMessage({ type: "error", id: msg.id, error: err?.message ?? "Generation failed" });
    }
  }
};

function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, "$1|SPLIT|")
    .split("|SPLIT|")
    .map((s) => s.trim())
    .filter(Boolean);
}
