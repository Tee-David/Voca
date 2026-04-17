"use client";

/**
 * Re-encode a WAV/PCM blob to Opus (webm container) via MediaRecorder.
 * Opus @ 32kbps gives ~10× smaller files than 24kHz mono WAV at equivalent quality.
 * Returns the original blob if Opus is not supported (e.g. Safari < 14.1).
 */
export async function compressToOpus(wavBlob: Blob, bitsPerSecond = 32000): Promise<Blob> {
  if (typeof window === "undefined") return wavBlob;
  if (!("MediaRecorder" in window) || !MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return wavBlob;
  }

  try {
    const arrayBuf = await wavBlob.arrayBuffer();
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));

    const dest = ctx.createMediaStreamDestination();
    const src = ctx.createBufferSource();
    src.buffer = decoded;
    src.connect(dest);

    const recorder = new MediaRecorder(dest.stream, {
      mimeType: "audio/webm;codecs=opus",
      bitsPerSecond,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "audio/webm;codecs=opus" }));
    });

    recorder.start();
    src.start(0);

    await new Promise((r) => setTimeout(r, decoded.duration * 1000 + 50));
    src.stop();
    recorder.stop();

    const out = await done;
    ctx.close().catch(() => {});
    return out.size > 0 ? out : wavBlob;
  } catch {
    return wavBlob;
  }
}

export async function compressAll(blobs: Blob[]): Promise<Blob[]> {
  const out: Blob[] = [];
  for (const b of blobs) out.push(await compressToOpus(b));
  return out;
}
