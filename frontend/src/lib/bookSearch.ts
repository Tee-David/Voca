"use client";

/**
 * In-book full-text search powered by FlexSearch.
 *
 * Indexes chapter text on book open and provides
 * fast search with highlighted snippets.
 */

// FlexSearch v0.7 ships as a CJS/ESM hybrid — import the default Document index
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FlexDocument: any = null;

async function loadFlexSearch() {
  if (FlexDocument) return FlexDocument;
  const mod = await import("flexsearch");
  // flexsearch exports vary by bundler — handle both shapes
  FlexDocument = (mod as any).default?.Document ?? (mod as any).Document ?? (mod as any).default;
  return FlexDocument;
}

export type SearchHit = {
  chapterIdx: number;
  chapterTitle: string;
  /** Snippet of text around the match */
  snippet: string;
  /** Offset of the query match within the snippet */
  matchStart: number;
  matchEnd: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let index: any = null;
let indexedBookId: string | null = null;
let indexedChapters: { title: string; text: string }[] = [];

/**
 * Build the search index for a given book's chapters.
 * Safe to call multiple times — will skip if already indexed for the same bookId.
 */
export async function buildSearchIndex(
  bookId: string,
  chapters: { title: string; text: string }[]
) {
  if (indexedBookId === bookId && index) return;

  const Doc = await loadFlexSearch();
  index = new Doc({
    tokenize: "forward",
    document: {
      id: "id",
      index: ["text"],
    },
  });

  for (let i = 0; i < chapters.length; i++) {
    index.add({ id: i, text: chapters[i].text });
  }

  indexedBookId = bookId;
  indexedChapters = chapters;
}

/**
 * Search the book. Returns up to `limit` hits with snippets.
 */
export function searchBook(query: string, limit = 20): SearchHit[] {
  if (!index || !query.trim()) return [];

  const q = query.trim().toLowerCase();

  // FlexSearch Document.search returns an array of field results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any[];
  try {
    results = index.search(query, { limit, enrich: true });
  } catch {
    // Fallback: plain text search if FlexSearch API differs
    return fallbackSearch(q, limit);
  }

  // Flatten and dedup results
  const seen = new Set<number>();
  const hits: SearchHit[] = [];

  for (const fieldResult of results) {
    const fieldHits = fieldResult?.result ?? fieldResult ?? [];
    for (const hit of fieldHits) {
      const chIdx = typeof hit === "number" ? hit : (hit?.id ?? hit);
      if (typeof chIdx !== "number" || seen.has(chIdx)) continue;
      seen.add(chIdx);

      const ch = indexedChapters[chIdx];
      if (!ch) continue;

      const matchIdx = ch.text.toLowerCase().indexOf(q);
      if (matchIdx === -1) continue;

      const snippetStart = Math.max(0, matchIdx - 60);
      const snippetEnd = Math.min(ch.text.length, matchIdx + q.length + 100);
      const snippet = ch.text.slice(snippetStart, snippetEnd);

      hits.push({
        chapterIdx: chIdx,
        chapterTitle: ch.title,
        snippet,
        matchStart: matchIdx - snippetStart,
        matchEnd: matchIdx - snippetStart + q.length,
      });

      if (hits.length >= limit) break;
    }
    if (hits.length >= limit) break;
  }

  // If FlexSearch returned nothing, fall back to plain text
  if (hits.length === 0) return fallbackSearch(q, limit);

  return hits;
}

/** Plain string search fallback */
function fallbackSearch(q: string, limit: number): SearchHit[] {
  const hits: SearchHit[] = [];
  for (let i = 0; i < indexedChapters.length && hits.length < limit; i++) {
    const ch = indexedChapters[i];
    const text = ch.text.toLowerCase();
    let pos = 0;
    while (pos < text.length && hits.length < limit) {
      const idx = text.indexOf(q, pos);
      if (idx === -1) break;
      const snippetStart = Math.max(0, idx - 60);
      const snippetEnd = Math.min(ch.text.length, idx + q.length + 100);
      hits.push({
        chapterIdx: i,
        chapterTitle: ch.title,
        snippet: ch.text.slice(snippetStart, snippetEnd),
        matchStart: idx - snippetStart,
        matchEnd: idx - snippetStart + q.length,
      });
      pos = idx + q.length;
    }
  }
  return hits;
}

/** Clear the current index (e.g. when leaving a book) */
export function clearSearchIndex() {
  index = null;
  indexedBookId = null;
  indexedChapters = [];
}
