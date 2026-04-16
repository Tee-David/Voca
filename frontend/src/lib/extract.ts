/**
 * Client-side text extraction for supported file types.
 * Returns chapters/sections with title and text content.
 * Also supports PDF cover extraction and TOC detection.
 */

export type Chapter = {
  title: string;
  text: string;
};

export async function extractText(
  url: string,
  fileType: string
): Promise<Chapter[]> {
  switch (fileType) {
    case "pdf":
      return extractPdf(url);
    case "epub":
      return extractEpub(url);
    case "txt":
      return extractTxt(url);
    case "docx":
      return extractDocx(url);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract a cover image from the first page of a PDF.
 * Returns a data URL (image/jpeg) or null if it fails.
 */
export async function extractPdfCover(url: string): Promise<string | null> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);

    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

type OutlineItem = {
  title: string;
  dest: unknown;
  items?: OutlineItem[];
};

async function extractPdf(url: string): Promise<Chapter[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument(url).promise;

  // Try to get the document outline (TOC) for real chapters
  const outline = (await pdf.getOutline()) as OutlineItem[] | null;

  // Extract text from all pages
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) => (item as { str?: string }).str ?? "")
      .join(" ")
      .trim();
    pageTexts.push(text);
  }

  // If we have an outline, use it for chapter boundaries
  if (outline && outline.length > 1) {
    const chapterPages = await resolveOutlinePages(pdf, outline);
    return buildChaptersFromOutline(chapterPages, pageTexts, pdf.numPages);
  }

  // Fallback: heuristic chapter detection by looking for heading-like patterns
  const heuristicChapters = detectChaptersHeuristically(pageTexts);
  if (heuristicChapters.length > 1) return heuristicChapters;

  // Final fallback: group every ~5 pages
  return groupPages(pageTexts, 5);
}

type ChapterPage = { title: string; pageIndex: number };

async function resolveOutlinePages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  outline: OutlineItem[]
): Promise<ChapterPage[]> {
  const result: ChapterPage[] = [];

  for (const item of outline) {
    try {
      let pageIndex = 0;
      if (item.dest) {
        const dest = typeof item.dest === "string"
          ? await pdf.getDestination(item.dest)
          : item.dest;
        if (Array.isArray(dest)) {
          const ref = dest[0];
          pageIndex = await pdf.getPageIndex(ref);
        }
      }
      result.push({ title: item.title, pageIndex });
    } catch {
      // Skip unresolvable outline entries
    }

    if (item.items?.length) {
      const children = await resolveOutlinePages(pdf, item.items);
      result.push(...children);
    }
  }

  result.sort((a, b) => a.pageIndex - b.pageIndex);
  return result;
}

function buildChaptersFromOutline(
  chapterPages: ChapterPage[],
  pageTexts: string[],
  totalPages: number
): Chapter[] {
  const chapters: Chapter[] = [];

  for (let i = 0; i < chapterPages.length; i++) {
    const start = chapterPages[i].pageIndex;
    const end = i + 1 < chapterPages.length ? chapterPages[i + 1].pageIndex : totalPages;
    const text = pageTexts.slice(start, end).filter(Boolean).join("\n\n");
    if (text.trim()) {
      chapters.push({ title: chapterPages[i].title, text: text.trim() });
    }
  }

  // Include any pages before the first chapter entry
  if (chapterPages.length > 0 && chapterPages[0].pageIndex > 0) {
    const preamble = pageTexts.slice(0, chapterPages[0].pageIndex).filter(Boolean).join("\n\n");
    if (preamble.trim()) {
      chapters.unshift({ title: "Introduction", text: preamble.trim() });
    }
  }

  return chapters.length > 0 ? chapters : [{ title: "Full Document", text: pageTexts.join("\n\n") }];
}

function detectChaptersHeuristically(pageTexts: string[]): Chapter[] {
  const chapters: Chapter[] = [];
  let currentTitle = "Beginning";
  let currentText = "";

  const chapterPattern = /^(chapter|part|section|book)\s+(\d+|[ivxlcdm]+)/i;

  for (let i = 0; i < pageTexts.length; i++) {
    const text = pageTexts[i];
    if (!text) continue;

    const firstLine = text.split(/[.\n]/)[0]?.trim() ?? "";
    if (chapterPattern.test(firstLine) && currentText.length > 200) {
      chapters.push({ title: currentTitle, text: currentText.trim() });
      currentTitle = firstLine.slice(0, 80);
      currentText = text;
    } else {
      currentText += "\n\n" + text;
    }
  }

  if (currentText.trim()) {
    chapters.push({ title: currentTitle, text: currentText.trim() });
  }

  return chapters;
}

function groupPages(pageTexts: string[], groupSize: number): Chapter[] {
  const chapters: Chapter[] = [];

  for (let i = 0; i < pageTexts.length; i += groupSize) {
    const chunk = pageTexts.slice(i, i + groupSize).filter(Boolean).join("\n\n");
    if (chunk.trim()) {
      const startPage = i + 1;
      const endPage = Math.min(i + groupSize, pageTexts.length);
      chapters.push({
        title: startPage === endPage ? `Page ${startPage}` : `Pages ${startPage}–${endPage}`,
        text: chunk.trim(),
      });
    }
  }

  return chapters;
}

async function extractEpub(url: string): Promise<Chapter[]> {
  const ePub = (await import("epubjs")).default;
  const book = ePub(url);
  await book.ready;

  const spine = book.spine as unknown as { items: Array<{ href: string }> };
  const chapters: Chapter[] = [];

  for (const item of spine.items) {
    const doc = await book.load(item.href);
    const body = (doc as Document).querySelector?.("body");
    const text = body?.textContent?.trim() ?? "";
    if (text) {
      const heading = body?.querySelector("h1, h2, h3")?.textContent?.trim();
      chapters.push({ title: heading || `Section ${chapters.length + 1}`, text });
    }
  }

  book.destroy();
  return chapters;
}

async function extractTxt(url: string): Promise<Chapter[]> {
  const res = await fetch(url);
  const text = await res.text();

  const MAX = 3000;
  const chunks: Chapter[] = [];
  let current = "";
  let idx = 1;

  for (const para of text.split(/\n\n+/)) {
    if (current.length + para.length > MAX && current) {
      chunks.push({ title: `Section ${idx++}`, text: current.trim() });
      current = "";
    }
    current += para + "\n\n";
  }
  if (current.trim()) {
    chunks.push({ title: `Section ${idx}`, text: current.trim() });
  }

  return chunks;
}

async function extractDocx(url: string): Promise<Chapter[]> {
  const mammoth = await import("mammoth");
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = result.value;

  const MAX = 3000;
  const chunks: Chapter[] = [];
  let current = "";
  let idx = 1;

  for (const para of text.split(/\n\n+/)) {
    if (current.length + para.length > MAX && current) {
      chunks.push({ title: `Section ${idx++}`, text: current.trim() });
      current = "";
    }
    current += para + "\n\n";
  }
  if (current.trim()) {
    chunks.push({ title: `Section ${idx}`, text: current.trim() });
  }

  return chunks;
}
