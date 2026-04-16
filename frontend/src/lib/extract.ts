/**
 * Client-side text extraction for supported file types.
 * Each extractor returns an array of { title, text } chapters/pages.
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

async function extractPdf(url: string): Promise<Chapter[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument(url).promise;
  const chapters: Chapter[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) => (item as { str?: string }).str ?? "")
      .join(" ")
      .trim();

    if (text) {
      chapters.push({ title: `Page ${i}`, text });
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

  // Split on double newlines for rough paragraph groups, max ~3000 chars per chunk
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

  // Same chunking as txt
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
