/**
 * Annotated PDF Export — stamps bookmarks and highlights back into
 * a copy of the original PDF using pdf-lib, then triggers a download.
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type BookmarkAnnotation = {
  page: number; // 0-indexed page
  text: string;
  color?: string;
};

/**
 * Load the original PDF from the given URL, stamp bookmark annotations
 * as margin notes on their respective pages, and return a downloadable Blob.
 */
export async function createAnnotatedPdf(
  pdfUrl: string,
  bookmarks: BookmarkAnnotation[],
  bookTitle?: string
): Promise<Blob> {
  const existingPdfBytes = await fetch(pdfUrl).then((r) => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Set PDF metadata
  if (bookTitle) {
    pdfDoc.setTitle(`${bookTitle} (Annotated)`);
    pdfDoc.setCreator("Voca Reader");
  }

  for (const bm of bookmarks) {
    if (bm.page < 0 || bm.page >= pages.length) continue;
    const page = pages[bm.page];
    const { width, height } = page.getSize();

    // Draw a small colored marker in the right margin
    const markerY = height - 40;
    const markerX = width - 24;
    page.drawCircle({
      x: markerX,
      y: markerY,
      size: 6,
      color: rgb(0.424, 0.388, 1), // #6C63FF
      opacity: 0.85,
    });

    // Draw the bookmark text as a margin note below the marker
    const maxChars = 50;
    const snippet =
      bm.text.length > maxChars ? bm.text.slice(0, maxChars) + "…" : bm.text;
    const noteLines = wrapText(snippet, 35);
    const noteX = width - 180;
    let noteY = markerY - 4;

    // Background rect for note
    const noteHeight = noteLines.length * 11 + 10;
    page.drawRectangle({
      x: noteX - 6,
      y: noteY - noteHeight + 6,
      width: 168,
      height: noteHeight,
      color: rgb(0.96, 0.96, 1),
      borderColor: rgb(0.424, 0.388, 1),
      borderWidth: 0.5,
      opacity: 0.9,
    });

    for (const line of noteLines) {
      page.drawText(line, {
        x: noteX,
        y: noteY - 8,
        size: 8,
        font,
        color: rgb(0.15, 0.15, 0.2),
      });
      noteY -= 11;
    }
  }

  // If there are bookmarks, add a summary page at the end
  if (bookmarks.length > 0) {
    const summaryPage = pdfDoc.addPage();
    const { width: sw, height: sh } = summaryPage.getSize();
    let y = sh - 50;

    summaryPage.drawText("Voca — Bookmarks & Notes", {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.424, 0.388, 1),
    });
    y -= 30;

    for (const bm of bookmarks) {
      if (y < 60) {
        // overflow — skip remaining
        summaryPage.drawText("… and more", {
          x: 50,
          y,
          size: 9,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        break;
      }
      summaryPage.drawText(`Page ${bm.page + 1}`, {
        x: 50,
        y,
        size: 10,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 14;

      const lines = wrapText(bm.text, 90);
      for (const line of lines) {
        if (y < 50) break;
        summaryPage.drawText(line, {
          x: 60,
          y,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 12;
      }
      y -= 8;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current += (current ? " " : "") + word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Convenience: create the annotated PDF and trigger a browser download.
 */
export async function downloadAnnotatedPdf(
  pdfUrl: string,
  bookmarks: BookmarkAnnotation[],
  fileName: string
) {
  const blob = await createAnnotatedPdf(pdfUrl, bookmarks, fileName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName} (Annotated).pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
