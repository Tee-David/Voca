"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pdfDocumentOptions } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * PageView — Renders PDF pages via pdfjs canvas + TextLayer overlay.
 *
 * Features:
 *   • Vertical page stack with card shadow + rounded corners
 *   • Transparent TextLayer spans for native selection/copy
 *   • Word highlight overlay matching `currentWord` via data-word-idx
 *   • IntersectionObserver virtualization — only renders pages in viewport ±2
 *   • Click-to-seek: tap word → fires onWordClick(globalWordIndex)
 * ──────────────────────────────────────────────────────────────────────────── */

type PageViewProps = {
  /** Fully resolved URL to the PDF file */
  fileUrl: string;
  /** Page count (from book metadata or pdf.numPages) */
  pageCount?: number;
  /** Reader theme class(es) */
  theme: "light" | "dark" | "sepia";
  /** Currently highlighted word index (global, 0-based across all pages) */
  currentWord?: number;
  /** Currently highlighted sentence index (global) */
  currentSentence?: number;
  /** Cursor highlight color id */
  cursorColor?: string;
  /** Click handler when user taps a word span in the TextLayer */
  onWordClick?: (globalWordIndex: number, word: string) => void;
  /** CSS class for the scroll container */
  className?: string;
};

/* ── Color map for cursor highlight ── */
const CURSOR_COLORS: Record<string, string> = {
  purple: "rgba(99,  87, 255, 0.30)",
  pink:   "rgba(236, 72, 153, 0.30)",
  red:    "rgba(239, 68,  68, 0.30)",
  green:  "rgba(16, 185, 129, 0.30)",
  orange: "rgba(249, 115,  22, 0.30)",
};

/* ── Lazy-load pdfjs-dist (ESM) ── */
async function getPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
  return pdfjsLib;
}

/* ── PDF document ref (shared across renders via a stable key) ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;

export function PageView({
  fileUrl,
  pageCount: externalPageCount,
  theme,
  currentWord = -1,
  currentSentence = -1,
  cursorColor = "purple",
  onWordClick,
  className,
}: PageViewProps) {
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(externalPageCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Load PDF document */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjsLib = await getPdfjs();
        const doc = await pdfjsLib.getDocument(pdfDocumentOptions(fileUrl)).promise;
        if (cancelled) { doc.destroy(); return; }
        setPdf(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading PDF…</p>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <p className="text-sm text-destructive font-medium">Could not render PDF</p>
        <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn("flex flex-col items-center gap-6 pb-[280px]", className)}
    >
      {Array.from({ length: numPages }, (_, i) => (
        <PageCanvas
          key={i}
          pdf={pdf}
          pageNumber={i + 1}
          theme={theme}
          currentWord={currentWord}
          currentSentence={currentSentence}
          cursorColor={cursorColor}
          onWordClick={onWordClick}
          scrollRoot={scrollRef}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Page Canvas — Renders a single page with Intersection virtualization
 * ──────────────────────────────────────────────────────────────────────────── */
type PageCanvasProps = {
  pdf: PdfDoc;
  pageNumber: number;
  theme: "light" | "dark" | "sepia";
  currentWord: number;
  currentSentence: number;
  cursorColor: string;
  onWordClick?: (globalWordIndex: number, word: string) => void;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
};

const PageCanvas = memo(function PageCanvas({
  pdf,
  pageNumber,
  theme,
  currentWord,
  currentSentence,
  cursorColor,
  onWordClick,
  scrollRoot,
}: PageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  /* IntersectionObserver — virtualise: render when within ±2 screen heights */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { root: null, rootMargin: "200% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Render page when visible */
  useEffect(() => {
    if (!visible || rendered) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const container = containerRef.current;
        const canvas = canvasRef.current;
        const textDiv = textLayerRef.current;
        if (!container || !canvas || !textDiv) return;

        /* Determine scale to fit container width */
        const containerWidth = container.clientWidth || 640;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth / unscaledViewport.width) * (window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale });

        const displayWidth = containerWidth;
        const displayHeight = (unscaledViewport.height / unscaledViewport.width) * containerWidth;

        /* Size canvas at device resolution */
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        setPageSize({ w: displayWidth, h: displayHeight });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = page.render({ canvasContext: ctx, viewport, canvas } as any);
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        /* Build TextLayer */
        const textContent = await page.getTextContent();
        if (cancelled) return;

        textDiv.innerHTML = "";
        textDiv.style.width = `${displayWidth}px`;
        textDiv.style.height = `${displayHeight}px`;

        const pdfjsLib = await import("pdfjs-dist");
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textDiv,
          viewport: page.getViewport({ scale: containerWidth / unscaledViewport.width }),
        });
        await textLayer.render();

        if (!cancelled) setRendered(true);
      } catch (err) {
        if (!cancelled) console.warn(`PageView: failed to render page ${pageNumber}`, err);
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [visible, rendered, pdf, pageNumber]);

  /* Click-to-seek handler on the text layer */
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onWordClick) return;
    const target = e.target as HTMLElement;
    if (!target.closest(".textLayer")) return;

    const text = target.textContent?.trim();
    if (!text) return;

    /* Best-effort word extraction from click position */
    const globalIdx = parseInt(target.getAttribute("data-word-idx") || "-1", 10);
    if (globalIdx >= 0) {
      onWordClick(globalIdx, text);
    }
  }, [onWordClick]);

  /* Placeholder aspect ratio while loading */
  const aspectRatio = pageSize ? pageSize.w / pageSize.h : 0.707; // A4 default

  const bgClass =
    theme === "dark" ? "bg-[#272737]" : theme === "sepia" ? "bg-[#f9f0db]" : "bg-white";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full max-w-[720px] overflow-hidden transition-shadow",
        "rounded-[var(--radius-card)]",
        "shadow-[var(--shadow-card)]",
        bgClass
      )}
      style={{
        aspectRatio: visible && pageSize ? undefined : `${aspectRatio}`,
        minHeight: visible && pageSize ? pageSize.h : undefined,
      }}
      onClick={handleClick}
    >
      {/* Page number badge */}
      <div
        className={cn(
          "absolute top-3 right-3 z-10 text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full",
          theme === "dark"
            ? "bg-white/10 text-white/50"
            : "bg-black/5 text-black/40"
        )}
      >
        {pageNumber}
      </div>

      {visible ? (
        <>
          <canvas ref={canvasRef} className="block w-full" />
          <div
            ref={textLayerRef}
            className="textLayer absolute top-0 left-0"
            style={{ lineHeight: 1 }}
          />
          {!rendered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-primary/40" />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground/40">Page {pageNumber}</span>
        </div>
      )}
    </div>
  );
});

export default PageView;
