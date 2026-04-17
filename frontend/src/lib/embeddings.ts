"use client";

import type { Chapter } from "./extract";

export function cosineSimilarity(A: number[], B: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extracts decent sized paragraphs from all chapters in a book.
 * It combines short lines and splits long bodies of text for optimal embedding chunks.
 */
export function extractParagraphChunks(chapters: Chapter[]): string[] {
  const paragraphs: string[] = [];

  for (const ch of chapters) {
    // split by double newlines or similar block breaks
    const blocks = ch.text.split(/(?:\r?\n){2,}/);
    
    let currentChunk = "";
    for (const block of blocks) {
      const text = block.trim();
      if (!text) continue;

      if (currentChunk.length + text.length < 500) {
        // combine short blocks (like headings and short intro paragraphs)
        currentChunk += (currentChunk ? " " : "") + text;
      } else {
        if (currentChunk) paragraphs.push(currentChunk);
        // if text itself is huge, split it roughly by sentence
        if (text.length > 1000) {
          const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
          let subChunk = "";
          for (const s of sentences) {
            const st = s.trim();
            if (!st) continue;
            if (subChunk.length + st.length < 800) {
              subChunk += (subChunk ? " " : "") + st;
            } else {
              paragraphs.push(subChunk);
              subChunk = st;
            }
          }
          if (subChunk) currentChunk = subChunk;
          else currentChunk = "";
        } else {
          currentChunk = text;
        }
      }
    }
    if (currentChunk) paragraphs.push(currentChunk);
  }

  // filter out tiny meaningless paragraphs
  return paragraphs.filter((p) => p.length > 50);
}

/**
 * Given a query vector and a list of paragraph vectors,
 * returns the top K most similar paragraphs based on cosine similarity.
 */
export function getTopKParagraphs(
  queryVector: number[],
  paragraphs: { text: string; vector: number[] }[],
  k: number = 3
): string[] {
  const scored = paragraphs.map((p) => ({
    text: p.text,
    score: cosineSimilarity(queryVector, p.vector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => s.text);
}
