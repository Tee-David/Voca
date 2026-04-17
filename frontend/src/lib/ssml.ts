/**
 * SSML subset parser for Kokoro TTS pipeline.
 *
 * Supports a minimal set of SSML-like tags that can be embedded
 * in pronunciation rules or future "Advanced (SSML)" editor:
 *
 *   <break time="500ms" />        → inserts a silence pause
 *   <emphasis>word</emphasis>     → wraps text for emphasis
 *   <prosody rate="slow">…</prosody>  → adjusts speaking rate
 *   <sub alias="…">original</sub>     → substitutes pronunciation
 *
 * The parser converts SSML-annotated text into a flat list of
 * segments that the TTS worker can consume sequentially.
 */

export type SSMLSegmentType = "text" | "break" | "emphasis" | "prosody";

export type SSMLSegment = {
  type: SSMLSegmentType;
  /** Cleaned text content (empty for break) */
  text: string;
  /** Break duration in milliseconds (only for type=break) */
  breakMs?: number;
  /** Relative speaking rate 0.5–2.0 (only for type=prosody) */
  rate?: number;
  /** Whether the segment should be emphasised (type=emphasis) */
  emphasis?: boolean;
};

/* ── Rate keyword → multiplier ── */
const RATE_MAP: Record<string, number> = {
  "x-slow": 0.5,
  slow: 0.75,
  medium: 1.0,
  fast: 1.25,
  "x-fast": 1.5,
};

/**
 * Parse a string that may contain SSML tags into segments.
 * Non-SSML input is returned as a single text segment.
 */
export function parseSSML(input: string): SSMLSegment[] {
  if (!input || !input.includes("<")) {
    return [{ type: "text", text: input }];
  }

  const segments: SSMLSegment[] = [];

  // Regex for supported SSML tags (non-greedy, supports self-closing)
  const tagPattern =
    /<(break|emphasis|prosody|sub)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(input)) !== null) {
    // Push any text before this tag
    const before = input.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push({ type: "text", text: before });
    }

    const tagName = match[1].toLowerCase();
    const attrs = match[2] || "";
    const innerText = (match[3] || "").trim();

    switch (tagName) {
      case "break": {
        const timeMatch = attrs.match(/time\s*=\s*["']?(\d+)(ms|s)?["']?/i);
        let ms = 500; // default 500ms
        if (timeMatch) {
          const value = parseInt(timeMatch[1], 10);
          const unit = (timeMatch[2] || "ms").toLowerCase();
          ms = unit === "s" ? value * 1000 : value;
        }
        segments.push({ type: "break", text: "", breakMs: ms });
        break;
      }

      case "emphasis": {
        if (innerText) {
          segments.push({ type: "emphasis", text: innerText, emphasis: true });
        }
        break;
      }

      case "prosody": {
        const rateMatch = attrs.match(/rate\s*=\s*["']?([^"'\s>]+)["']?/i);
        let rate = 1.0;
        if (rateMatch) {
          const rateVal = rateMatch[1].toLowerCase();
          if (RATE_MAP[rateVal] !== undefined) {
            rate = RATE_MAP[rateVal];
          } else {
            // Try numeric (e.g. "1.5" or "150%")
            const num = parseFloat(rateVal);
            if (Number.isFinite(num)) {
              rate = rateVal.includes("%") ? num / 100 : num;
            }
          }
        }
        if (innerText) {
          segments.push({ type: "prosody", text: innerText, rate });
        }
        break;
      }

      case "sub": {
        const aliasMatch = attrs.match(/alias\s*=\s*["']([^"']*)["']/i);
        const substituted = aliasMatch ? aliasMatch[1] : innerText;
        if (substituted) {
          segments.push({ type: "text", text: substituted });
        }
        break;
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text after last tag
  const remaining = input.slice(lastIndex).trim();
  if (remaining) {
    segments.push({ type: "text", text: remaining });
  }

  // If nothing was parsed (no valid tags), return original as text
  if (segments.length === 0) {
    return [{ type: "text", text: input }];
  }

  return segments;
}

/**
 * Flatten SSML segments back into plain text for TTS engines
 * that don't support SSML natively (like Kokoro).
 *
 * Breaks are converted to silence tokens if supported, or
 * simply stripped. <sub> aliases have already been resolved.
 */
export function ssmlToPlainText(segments: SSMLSegment[]): string {
  return segments
    .filter((s) => s.type !== "break")
    .map((s) => s.text)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Strip all SSML tags from a string, returning clean text.
 * Useful for word-count estimation and display.
 */
export function stripSSML(input: string): string {
  return input
    .replace(/<break[^>]*\/?>/gi, " ")
    .replace(/<\/?(?:emphasis|prosody|sub|speak)[^>]*>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Check whether a string contains any SSML tags.
 */
export function hasSSML(input: string): boolean {
  return /<(?:break|emphasis|prosody|sub)\b/i.test(input);
}
