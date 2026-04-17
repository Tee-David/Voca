/**
 * Word-level timestamp synchronization for TTS playback.
 *
 * Maps sanitized TTS text back to DOM word nodes so highlighting
 * can be driven by per-word duration data rather than ratio estimation.
 *
 * Phase 12b — replaces the simple `Math.floor(ratio * words.length)` approach.
 */

export type WordTimestamp = {
  word: string;
  start: number; // seconds
  end: number;   // seconds
};

export type WordMapping = {
  /** The original word in the DOM */
  domWord: string;
  /** Index into the DOM word list */
  domIndex: number;
  /** The sanitized TTS word it maps to */
  ttsWord: string;
  /** Index into the TTS word list */
  ttsIndex: number;
};

/**
 * Build a mapping between DOM text words and TTS-sanitized words.
 * Handles stripped chars (HTML tags, footnote markers, pronunciation substitutions).
 */
export function buildWordMap(
  domText: string,
  ttsText: string
): WordMapping[] {
  const domWords = tokenize(domText);
  const ttsWords = tokenize(ttsText);
  const mappings: WordMapping[] = [];

  let ttsIdx = 0;
  for (let domIdx = 0; domIdx < domWords.length; domIdx++) {
    const domNorm = normalize(domWords[domIdx]);
    if (!domNorm) continue;

    // Find the best matching TTS word from current position
    let bestMatch = -1;
    const searchWindow = Math.min(ttsIdx + 5, ttsWords.length);
    for (let j = ttsIdx; j < searchWindow; j++) {
      const ttsNorm = normalize(ttsWords[j]);
      if (ttsNorm === domNorm || fuzzyMatch(domNorm, ttsNorm)) {
        bestMatch = j;
        break;
      }
    }

    if (bestMatch >= 0) {
      mappings.push({
        domWord: domWords[domIdx],
        domIndex: domIdx,
        ttsWord: ttsWords[bestMatch],
        ttsIndex: bestMatch,
      });
      ttsIdx = bestMatch + 1;
    } else {
      // No match found — map to nearest TTS index for continuity
      mappings.push({
        domWord: domWords[domIdx],
        domIndex: domIdx,
        ttsWord: "",
        ttsIndex: ttsIdx,
      });
    }
  }

  return mappings;
}

/**
 * Given per-word timestamps from TTS and a word mapping,
 * resolve the current DOM word index for a given playback time.
 */
export function getDomWordAtTime(
  time: number,
  timestamps: WordTimestamp[],
  mappings: WordMapping[]
): number {
  // Find the TTS word index active at this time
  let ttsIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (time >= timestamps[i].start && time < timestamps[i].end) {
      ttsIdx = i;
      break;
    }
    if (time >= timestamps[i].end) {
      ttsIdx = i + 1;
    }
  }

  // Find the DOM index mapped to this TTS index
  let lastDomIdx = 0;
  for (const m of mappings) {
    if (m.ttsIndex <= ttsIdx) {
      lastDomIdx = m.domIndex;
    }
    if (m.ttsIndex >= ttsIdx) break;
  }

  return lastDomIdx;
}

/**
 * Estimate word timestamps when Kokoro doesn't provide phoneme alignment.
 * Uses word length as a proxy for duration (better than uniform distribution).
 */
export function estimateTimestamps(
  words: string[],
  totalDuration: number
): WordTimestamp[] {
  if (words.length === 0) return [];

  // Weight by character count (longer words take longer to speak)
  const charCounts = words.map((w) => Math.max(w.length, 1));
  const totalChars = charCounts.reduce((a, b) => a + b, 0);

  const timestamps: WordTimestamp[] = [];
  let cursor = 0;
  for (let i = 0; i < words.length; i++) {
    const wordDuration = (charCounts[i] / totalChars) * totalDuration;
    timestamps.push({
      word: words[i],
      start: cursor,
      end: cursor + wordDuration,
    });
    cursor += wordDuration;
  }

  return timestamps;
}

// ── Helpers ──

function tokenize(text: string): string[] {
  return text
    .replace(/<[^>]+>/g, "") // strip HTML
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .split(/\s+/)
    .filter(Boolean);
}

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

function fuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Allow minor differences (e.g., pronunciation substitutions)
  if (a.length < 3 || b.length < 3) return a === b;
  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return true;
  // Levenshtein distance check (allow 1 edit for short words, 2 for longer)
  const maxDist = Math.max(a.length, b.length) > 6 ? 2 : 1;
  return levenshtein(a, b) <= maxDist;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
