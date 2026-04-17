"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Settings2,
  Loader2, Minus, Plus, Play, Pause, Volume2, Bookmark,
  BookmarkCheck, Moon, Sun, Type, Download, Timer, X,
  SkipBack, SkipForward, Maximize2, RotateCcw, RotateCw, MessageSquare, Search, MoreHorizontal,
  FileText, AlignLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomSheet, BottomSheetTrigger, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { extractText, extractPdfCover, type Chapter } from "@/lib/extract";
import {
  cacheChapters, getCachedChapters,
  getCachedAudio, putCachedAudio, hasCachedAudio,
  requestPersistentStorage,
} from "@/lib/bookCache";
import { compressAll } from "@/lib/audioCompress";
import { prewarmChapter } from "@/lib/prewarmer";
import { getFileUrl } from "@/lib/fileUrl";
import { useKokoro } from "@/hooks/useKokoro";
import { usePlayer } from "@/hooks/usePlayer";
import { VoiceSelector } from "@/components/reader/VoiceSelector";
import { AudiobookExport } from "@/components/reader/AudiobookExport";
import { WaveformScrubber } from "@/components/reader/WaveformScrubber";
import { cn } from "@/lib/utils";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  r2Key: string;
  coverColor: string | null;
  coverUrl: string | null;
  bookmarks?: BookmarkItem[];
  progress: { currentPage: number; percentComplete: number } | null;
  ocrStatus?: string | null;
  ocrError?: string | null;
  pageCount?: number | null;
};

type BookmarkItem = {
  id: string;
  page: number;
  text: string;
  note: string | null;
  color: string;
  createdAt: string;
};

type ReaderTheme = "light" | "dark" | "sepia";
type Panel = "voice" | "chapters" | "settings" | "bookmarks" | "search" | "pronunciations" | null;

type Pronunciation = { from: string; to: string };
const PRONUNCIATION_KEY = (bookId: string) => `voca:pron:${bookId}`;

function applyPronunciations(text: string, rules: Pronunciation[]): string {
  if (!rules.length) return text;
  let out = text;
  for (const r of rules) {
    if (!r.from.trim()) continue;
    const escaped = r.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), r.to);
  }
  return out;
}

const THEME_STYLES: Record<ReaderTheme, { bg: string; text: string; label: string; icon: typeof Sun }> = {
  light: { bg: "bg-white", text: "text-gray-900", label: "Light", icon: Sun },
  dark: { bg: "bg-[#1a1a2e]", text: "text-gray-200", label: "Dark", icon: Moon },
  sepia: { bg: "bg-[#f4ecd8]", text: "text-[#5b4636]", label: "Sepia", icon: Type },
};

const FONT_FAMILIES = [
  { label: "Sans", value: "var(--font-sans), system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
];

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractStage, setExtractStage] = useState<{ stage: string; value: number } | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [currentWord, setCurrentWord] = useState(-1);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPlayRef = useRef(false);
  const wordAnimRef = useRef<number>(0);
  const genCollectorRef = useRef<{ blobs: Blob[]; sentences: string[]; bookId: string; chapterIdx: number; voice: string; speed: number } | null>(null);
  const [cachedChaptersSet, setCachedChaptersSet] = useState<Set<number>>(new Set());
  const [ocrSuggest, setOcrSuggest] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [missingSource, setMissingSource] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadState, setDownloadState] = useState<{ active: boolean; chapterIdx: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"text" | "pdf">("text");
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);
  const [newPronFrom, setNewPronFrom] = useState("");
  const [newPronTo, setNewPronTo] = useState("");
  const prewarmAbortRef = useRef<AbortController | null>(null);
  const prewarmedRef = useRef<Set<number>>(new Set());

  const tts = useKokoro();
  const player = usePlayer();

  const togglePanel = (p: Panel) => {
    setPanel((prev) => (prev === p ? null : p));
    if (p === "voice" && (tts.status === "idle" || tts.status === "error")) {
      tts.initWorker();
    }
  };

  const saveProgress = useCallback(
    async (page: number, total: number) => {
      if (!id) return;
      const percent = total > 0 ? Math.round(((page + 1) / total) * 100) : 0;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: id,
          currentPage: page,
          percentComplete: Math.min(percent, 100),
        }),
      }).catch(() => {});
    },
    [id]
  );

  const loadBook = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/library/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Book not found" : `Server error (${res.status})`);
        setLoading(false);
        return;
      }
      const data: Book = await res.json();
      setBook(data);
      if (data.bookmarks) setBookmarks(data.bookmarks);

      // Book shell is available — flip off the blocking loader so the page is interactive
      setLoading(false);

      const cached = await getCachedChapters(data.id);
      if (cached && cached.length > 0) {
        setChapters(cached);
        const startPage = data.progress?.currentPage ?? 0;
        setCurrentChapter(Math.min(startPage, cached.length - 1));
      } else {
        setExtracting(true);
        try {
          const fileUrl = await getFileUrl(data.r2Key);
          const extracted = await extractText(fileUrl, data.fileType, (stage, value) =>
            setExtractStage({ stage, value })
          );
          if (extracted.length === 0) throw new Error("No text found in document");
          setChapters(extracted);
          await cacheChapters(data.id, extracted);
          const startPage = data.progress?.currentPage ?? 0;
          setCurrentChapter(Math.min(startPage, extracted.length - 1));

          // Suggest server-side OCR when the PDF is text-thin (likely scanned).
          // Heuristic: less than ~200 chars per page averaged, and not already OCR'd.
          if (
            data.fileType === "pdf" &&
            data.ocrStatus !== "done" &&
            data.ocrStatus !== "processing"
          ) {
            const totalChars = extracted.reduce((s, c) => s + c.text.length, 0);
            const pages = data.pageCount ?? Math.max(1, extracted.length * 3);
            if (totalChars / pages < 200) setOcrSuggest(true);
          }
        } catch (extractErr) {
          console.error("Extract failed:", extractErr);
          const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
          const missing = /\b(404|nosuchkey|key does not exist|source .* missing)\b/i.test(msg);
          setMissingSource(missing);
          setError(
            missing
              ? "The PDF file for this book is missing on the server — the upload may have failed. You can remove this entry and re-upload."
              : `Text extraction failed: ${msg}`
          );
          if (!missing && data.fileType === "pdf" && data.ocrStatus !== "done" && data.ocrStatus !== "processing") {
            setOcrSuggest(true);
          }
        } finally {
          setExtracting(false);
        }
      }

      if (!data.coverUrl && data.fileType === "pdf") {
        getFileUrl(data.r2Key)
          .then((fileUrl) => extractPdfCover(fileUrl))
          .then((coverUrl) => {
            if (coverUrl) {
              setBook((prev) => (prev ? { ...prev, coverUrl } : prev));
              fetch(`/api/library/${data.id}/cover`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverUrl }),
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Load book failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load book");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadBook(); }, [loadBook]);

  const runOcr = useCallback(async () => {
    if (!book || ocrBusy) return;
    setOcrBusy(true);
    setOcrSuggest(false);
    try {
      const res = await fetch(`/api/library/${book.id}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "eng" }),
      });
      if (!res.ok) {
        let msg = `OCR failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          const text = await res.text().catch(() => "");
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      try { await cacheChapters(book.id, []); } catch { /* ignore */ }
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OCR failed";
      const missing = /\b(404|nosuchkey|key does not exist|source .* missing)\b/i.test(msg);
      setMissingSource(missing);
      setError(
        missing
          ? "The PDF file for this book is missing on the server — the upload may have failed. You can remove this entry and re-upload."
          : msg
      );
      setOcrBusy(false);
    }
  }, [book, ocrBusy]);

  const deleteBook = useCallback(async () => {
    if (!book || deleting) return;
    if (!confirm(`Remove "${book.title}" from your library? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/library/${book.id}`, { method: "DELETE" });
    } catch { /* ignore */ }
    router.push("/library");
  }, [book, deleting, router]);

  useEffect(() => {
    if (chapters.length > 0) saveProgress(currentChapter, chapters.length);
  }, [currentChapter, chapters.length, saveProgress]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentChapter]);

  // Auto-scroll to current sentence during TTS playback
  useEffect(() => {
    if (currentSentence < 0 || !player.playing) return;
    const el = document.querySelector(`[data-sentence="${currentSentence}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSentence, player.playing]);

  useEffect(() => {
    tts.onChunk((chunk) => {
      player.enqueueChunk(chunk.audio);
      // Write-through collect for cache
      if (genCollectorRef.current) {
        genCollectorRef.current.blobs.push(chunk.audio);
        genCollectorRef.current.sentences.push(chunk.sentence);
      }
    });
    tts.onDone(() => {
      // Persist collected audio to IndexedDB cache
      const c = genCollectorRef.current;
      if (c && c.blobs.length > 0) {
        compressAll(c.blobs)
          .then((compressed) =>
            putCachedAudio(c.bookId, c.chapterIdx, c.voice, c.speed, compressed, c.sentences)
          )
          .then(() => {
            setCachedChaptersSet((prev) => new Set(prev).add(c.chapterIdx));
          })
          .catch(() => {});
      }
      genCollectorRef.current = null;
    });
  }, []);

  // Check which chapters are already cached for this (voice, speed) combo
  useEffect(() => {
    if (!book || chapters.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = new Set<number>();
      for (let i = 0; i < chapters.length; i++) {
        const has = await hasCachedAudio(book.id, i, tts.voice, tts.speed);
        if (has) results.add(i);
      }
      if (!cancelled) setCachedChaptersSet(results);
    })();
    return () => { cancelled = true; };
  }, [book, chapters.length, tts.voice, tts.speed]);

  // Sync currentSentence with the chunk currently playing
  useEffect(() => {
    if (player.playing) {
      setCurrentSentence(player.chunkIndex);
      setCurrentWord(0);
    } else if (!player.playing && player.currentTime === 0 && player.duration === 0) {
      setCurrentSentence(-1);
      setCurrentWord(-1);
    }
  }, [player.chunkIndex, player.playing]);

  // Word-by-word highlight: estimate current word from audio progress
  useEffect(() => {
    if (currentSentence < 0 || !player.playing || player.duration <= 0) {
      cancelAnimationFrame(wordAnimRef.current);
      return;
    }

    const ch = chapters[currentChapter];
    const sentences = ch ? ch.text.replace(/([.!?])\s+/g, "$1|SPLIT|").split("|SPLIT|") : [];
    const sentenceText = sentences[currentSentence] || "";
    const words = sentenceText.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    function tick() {
      const ratio = player.duration > 0 ? player.currentTime / player.duration : 0;
      const wordIdx = Math.min(Math.floor(ratio * words.length), words.length - 1);
      setCurrentWord(wordIdx);
      wordAnimRef.current = requestAnimationFrame(tick);
    }
    wordAnimRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(wordAnimRef.current);
  }, [currentSentence, player.playing, player.duration, player.currentTime, chapters, currentChapter]);

  // Pre-warm next chapter when ≥70% through current
  useEffect(() => {
    if (!book || !player.playing || player.duration <= 0) return;
    const ratio = player.currentTime / player.duration;
    const nextIdx = currentChapter + 1;
    if (ratio < 0.7 || nextIdx >= chapters.length) return;
    if (prewarmedRef.current.has(nextIdx)) return;
    if (cachedChaptersSet.has(nextIdx)) return;

    prewarmedRef.current.add(nextIdx);
    const ctrl = new AbortController();
    prewarmAbortRef.current?.abort();
    prewarmAbortRef.current = ctrl;

    prewarmChapter({
      bookId: book.id,
      chapterIdx: nextIdx,
      text: chapters[nextIdx].text,
      voice: tts.voice,
      speed: tts.speed,
      signal: ctrl.signal,
    }).then((result) => {
      if (result === "warmed" || result === "cached") {
        setCachedChaptersSet((prev) => new Set(prev).add(nextIdx));
      }
    });
  }, [player.currentTime, player.duration, player.playing, currentChapter, chapters, book, tts.voice, tts.speed, cachedChaptersSet]);

  useEffect(() => {
    return () => { prewarmAbortRef.current?.abort(); };
  }, []);

  // Load pronunciations per book
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(PRONUNCIATION_KEY(id));
      if (raw) setPronunciations(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [id]);

  function savePronunciations(next: Pronunciation[]) {
    setPronunciations(next);
    if (!id) return;
    try { localStorage.setItem(PRONUNCIATION_KEY(id), JSON.stringify(next)); } catch { /* ignore */ }
  }

  // Sleep timer
  useEffect(() => {
    if (sleepTimer > 0) {
      setSleepRemaining(sleepTimer * 60);
      sleepRef.current = setInterval(() => {
        setSleepRemaining((prev) => {
          if (prev <= 1) {
            player.pause();
            setSleepTimer(0);
            if (sleepRef.current) clearInterval(sleepRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (sleepRef.current) clearInterval(sleepRef.current); };
  }, [sleepTimer]);

  function goChapter(dir: number) {
    setCurrentChapter((prev) => Math.max(0, Math.min(chapters.length - 1, prev + dir)));
    player.stop();
    player.resetQueue();
    setCurrentSentence(-1);
    setCurrentWord(-1);
  }

  // Play chapter: cache-first with write-through fallback to TTS
  const playChapterNow = useCallback(async () => {
    const chapter = chapters[currentChapter];
    if (!chapter || !book) return;
    requestPersistentStorage().catch(() => {});

    player.resetQueue();
    player.setMeta(book.id, book.title, chapter.title);

    const hit = await getCachedAudio(book.id, currentChapter, tts.voice, tts.speed);
    if (hit && hit.blobs.length > 0) {
      hit.blobs.forEach((blob) => player.enqueueChunk(blob));
      return;
    }

    genCollectorRef.current = {
      blobs: [], sentences: [],
      bookId: book.id, chapterIdx: currentChapter,
      voice: tts.voice, speed: tts.speed,
    };
    const spokenText = applyPronunciations(chapter.text, pronunciations);
    tts.generate(spokenText, `${book.id}-ch${currentChapter}`);
  }, [book, chapters, currentChapter, tts, player, pronunciations]);

  // Auto-start generation once TTS becomes ready after user requested play
  useEffect(() => {
    if (tts.status === "ready" && pendingPlayRef.current) {
      pendingPlayRef.current = false;
      playChapterNow();
    }
  }, [tts.status, playChapterNow]);

  function handlePlay() {
    const chapter = chapters[currentChapter];
    if (!chapter || !book) return;

    if (player.playing) {
      player.pause();
      return;
    }

    if (tts.status === "idle" || tts.status === "error") {
      pendingPlayRef.current = true;
      tts.initWorker();
      return;
    }

    if (tts.status === "ready") {
      playChapterNow();
    } else {
      player.play();
    }
  }

  // Download all chapters for offline — generate + cache sequentially
  async function downloadForOffline() {
    if (!book || chapters.length === 0) return;
    if (tts.status === "idle" || tts.status === "error") {
      tts.initWorker();
      // wait briefly for worker
      await new Promise<void>((resolve) => {
        const iv = setInterval(() => { if (tts.status === "ready") { clearInterval(iv); resolve(); } }, 250);
        setTimeout(() => { clearInterval(iv); resolve(); }, 20000);
      });
    }
    setDownloadState({ active: true, chapterIdx: 0, total: chapters.length });
    for (let i = 0; i < chapters.length; i++) {
      setDownloadState({ active: true, chapterIdx: i, total: chapters.length });
      const already = await hasCachedAudio(book.id, i, tts.voice, tts.speed);
      if (already) continue;
      await new Promise<void>((resolve) => {
        const blobs: Blob[] = [];
        const sents: string[] = [];
        tts.onChunk((chunk) => {
          blobs.push(chunk.audio);
          sents.push(chunk.sentence);
        });
        tts.onDone(async () => {
          if (blobs.length > 0) {
            const compressed = await compressAll(blobs);
            await putCachedAudio(book.id, i, tts.voice, tts.speed, compressed, sents);
            setCachedChaptersSet((prev) => new Set(prev).add(i));
          }
          resolve();
        });
        tts.generate(chapters[i].text, `dl-${book.id}-ch${i}`);
      });
    }
    setDownloadState(null);
    // restore normal playback handlers
    tts.onChunk((chunk) => {
      player.enqueueChunk(chunk.audio);
      if (genCollectorRef.current) {
        genCollectorRef.current.blobs.push(chunk.audio);
        genCollectorRef.current.sentences.push(chunk.sentence);
      }
    });
  }

  function handleSentenceClick(sentenceIdx: number) {
    if (!book || !chapters[currentChapter]) return;
    const chapter = chapters[currentChapter];

    if (tts.status === "idle" || tts.status === "error") {
      tts.initWorker();
      return;
    }

    if (tts.status === "ready") {
      const sentences = chapter.text.replace(/([.!?])\s+/g, "$1|SPLIT|").split("|SPLIT|");
      const fromText = sentences.slice(sentenceIdx).join(" ");
      player.resetQueue();
      player.setMeta(book.id, book.title, chapter.title);
      const spokenText = applyPronunciations(fromText, pronunciations);
      tts.generate(spokenText, `${book.id}-ch${currentChapter}-s${sentenceIdx}`);
      setCurrentSentence(sentenceIdx);
    }
  }

  async function addBookmark() {
    if (!book || !chapters[currentChapter]) return;
    const chapter = chapters[currentChapter];
    const snippet = chapter.text.slice(0, 200);

    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: book.id,
        page: currentChapter,
        text: snippet,
        color: "yellow",
      }),
    });

    if (res.ok) {
      const bm: BookmarkItem = await res.json();
      setBookmarks((prev) => [bm, ...prev]);
    }
  }

  async function removeBookmark(bmId: string) {
    await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bmId }),
    });
    setBookmarks((prev) => prev.filter((b) => b.id !== bmId));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }

  const currentPageBookmarked = bookmarks.some((b) => b.page === currentChapter);
  const chapterProgress = chapters.length > 0 ? ((currentChapter + 1) / chapters.length) * 100 : 0;
  const themeStyle = THEME_STYLES[theme];

  function formatTime(s: number) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function goRelativeTime(delta: number) {
    player.seek(Math.max(0, Math.min(player.duration, player.currentTime + delta)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    const bookNotFound = error === "Book not found" || /not found/i.test(error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-destructive font-medium mb-2">{error || "Book not found"}</p>
        {bookNotFound && (
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            This book may have already been removed.
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-6 max-w-xs">
          {error && !error.toLowerCase().includes("not found") && "The file may be too large or corrupt. Try again in a moment."}
        </p>
        <div className="flex gap-2">
          <button onClick={loadBook} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            Retry
          </button>
          <button onClick={() => router.push("/library")} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-semibold">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const chapter = chapters[currentChapter];
  const sentences = chapter ? chapter.text.replace(/([.!?])\s+/g, "$1|SPLIT|").split("|SPLIT|") : [];

  return (
    <div className={cn("flex flex-col h-[calc(100dvh-5rem)] lg:h-dvh relative overflow-hidden", themeStyle.bg)}>
      
      {/* ─── Purple gradient top strip ─── */}
      <div className="relative shrink-0 z-10 pt-safe">
        <div
          className={cn(
            "h-24 sm:h-28 px-4 pt-4 flex items-start justify-between rounded-b-[28px]",
            theme === "sepia"
              ? "bg-gradient-to-b from-[#e9d9c5] via-[#e4d1b7] to-[#dec7a7]"
              : "bg-gradient-to-b from-primary/15 via-primary/20 to-primary/30"
          )}
        >
          <button
            onClick={() => router.push("/library")}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/70 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 transition backdrop-blur-sm shadow-sm"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>

          {book?.fileType === "pdf" && (
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-sm shadow-sm">
              <button
                onClick={() => setViewMode("text")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition",
                  viewMode === "text"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:text-foreground"
                )}
                title="Text view (for TTS)"
              >
                <AlignLeft size={13} /> Text
              </button>
              <button
                onClick={() => setViewMode("pdf")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition",
                  viewMode === "pdf"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:text-foreground"
                )}
                title="Original PDF"
              >
                <FileText size={13} /> PDF
              </button>
            </div>
          )}

          <BottomSheet>
            <BottomSheetTrigger>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/70 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 transition backdrop-blur-sm shadow-sm">
                <MoreHorizontal size={18} className="text-foreground" />
              </div>
            </BottomSheetTrigger>
          <BottomSheetContent className="bg-[#18181A] text-white border-white/5">
            <div className="p-4 pt-2">
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-14 bg-white/20 rounded shadow-md relative overflow-hidden border border-white/10">
                    {book.coverUrl && <img src={book.coverUrl} className="w-full h-full object-cover" alt="Cover" />}
                  </div>
                  <h3 className="font-bold text-lg">{chapter?.title || book.title}</h3>
                </div>
                <BottomSheetTrigger>
                  <button className="text-white/60 hover:text-white p-2"><X size={24}/></button>
                </BottomSheetTrigger>
              </div>

              {/* Drawer Grid Actions */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button onClick={() => { togglePanel("search"); }} className="flex flex-col items-center gap-2 p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                  <Search size={24} className="text-white/80" />
                  <span className="text-xs font-semibold">Search</span>
                </button>
                <button onClick={() => togglePanel("voice")} className="flex flex-col items-center gap-2 p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                  <MessageSquare size={24} className="text-white/80" />
                  <span className="text-xs font-semibold">Change Voice</span>
                </button>
                <button onClick={() => setSleepTimer(sleepTimer > 0 ? 0 : 15)} className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl transition", sleepTimer > 0 ? "bg-primary text-primary-foreground" : "bg-white/5 hover:bg-white/10")}>
                  <Timer size={24} className={sleepTimer > 0 ? "scale-110" : "text-white/80"} />
                  <span className="text-xs font-semibold">{sleepTimer > 0 ? `${Math.ceil(sleepRemaining / 60)}m left` : "Sleep timer"}</span>
                </button>
              </div>

              {/* Vertical Actions */}
              <div className="flex flex-col gap-1">
                <button onClick={() => togglePanel("settings")} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition w-full text-left">
                  <Type size={20} className="text-white/60" />
                  <span className="text-sm font-semibold">Hide text</span>
                </button>
                <button onClick={() => togglePanel("bookmarks")} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition w-full text-left">
                  <Bookmark size={20} className="text-white/60" />
                  <span className="text-sm font-semibold">Bookmarks</span>
                </button>
                <button onClick={() => togglePanel("pronunciations")} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition w-full text-left">
                  <List size={20} className="text-white/60" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Pronunciations</span>
                    {pronunciations.length > 0 && (
                      <span className="text-[11px] text-white/40">{pronunciations.length} rule{pronunciations.length === 1 ? "" : "s"} active</span>
                    )}
                  </div>
                </button>
                <button
                  onClick={downloadForOffline}
                  disabled={!!downloadState?.active || tts.status === 'loading'}
                  className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition w-full text-left disabled:opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <Download size={20} className="text-white/60" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Download for offline</span>
                      {downloadState?.active ? (
                        <span className="text-[11px] text-primary">
                          Chapter {downloadState.chapterIdx + 1} of {downloadState.total}…
                        </span>
                      ) : cachedChaptersSet.size > 0 ? (
                        <span className="text-[11px] text-white/40">
                          {cachedChaptersSet.size}/{chapters.length} chapters cached
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {(downloadState?.active || tts.status === 'loading') && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                </button>
                <button onClick={() => togglePanel("settings")} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition w-full text-left">
                  <Settings2 size={20} className="text-white/60" />
                  <span className="text-sm font-semibold">Preferences</span>
                </button>
              </div>
            </div>
          </BottomSheetContent>
        </BottomSheet>
        </div>
      </div>

      {/* ─── Reading Layout Panels (Voice, Settings, Chapters etc) ─── */}
      <AnimatePresence>
        {panel === "voice" && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("absolute inset-0 z-30 overflow-y-auto p-4", themeStyle.bg)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("font-bold", themeStyle.text)}>Voice & Speed</h3>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <VoiceSelector
              selectedVoice={tts.voice}
              defaultVoice={tts.defaultVoice}
              ttsStatus={tts.status}
              onSelect={(v) => tts.changeVoice(v)}
              onSetDefault={(v) => tts.setAsDefault(v, tts.speed)}
              onSample={(v) => tts.playSample(v)}
              onSampleReady={tts.onSample}
            />
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Speed — <span className="text-primary">{tts.speed.toFixed(2)}×</span></label>
                <button
                  onClick={() => tts.setAsDefault(tts.voice, tts.speed)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Save as default
                </button>
              </div>
              <input type="range" min={0.5} max={2.0} step={0.05} value={tts.speed} onChange={(e) => tts.changeSpeed(parseFloat(e.target.value))} className="voca-speed-range w-full" />
            </div>
            {book && chapters.length > 0 && <AudiobookExport bookId={book.id} bookTitle={book.title} chapters={chapters} voice={tts.voice} speed={tts.speed} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "chapters" && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("absolute inset-0 z-30 overflow-y-auto", themeStyle.bg)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className={cn("font-bold", themeStyle.text)}>Chapters</h3>
                <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>
              <div className="space-y-1">
                {chapters.map((ch, idx) => (
                  <button key={idx} onClick={() => { setCurrentChapter(idx); setPanel(null); }} className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm transition flex items-center gap-2", idx === currentChapter ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted")}>
                    <span className="text-muted-foreground text-xs w-6 shrink-0">{idx + 1}</span>
                    <span className={cn("truncate", idx === currentChapter ? "text-primary" : themeStyle.text)}>{ch.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "search" && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("absolute inset-0 z-30 overflow-y-auto p-4", themeStyle.bg)}
          >
            <div className="flex items-center gap-2 mb-4">
              <Search size={16} className="text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search in book…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("flex-1 bg-transparent outline-none text-sm", themeStyle.text)}
              />
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            {searchQuery.trim().length >= 2 && (
              <div className="space-y-1">
                {chapters.flatMap((ch, chIdx) => {
                  const q = searchQuery.toLowerCase();
                  const idx = ch.text.toLowerCase().indexOf(q);
                  if (idx === -1) return [];
                  const start = Math.max(0, idx - 40);
                  const end = Math.min(ch.text.length, idx + q.length + 80);
                  const snippet = ch.text.slice(start, end);
                  return [(
                    <button
                      key={chIdx}
                      onClick={() => { setCurrentChapter(chIdx); setPanel(null); }}
                      className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm transition hover:bg-muted", themeStyle.text)}
                    >
                      <p className="text-xs text-muted-foreground font-semibold mb-1">
                        Chapter {chIdx + 1} · {ch.title}
                      </p>
                      <p className="text-xs leading-relaxed">
                        …{snippet.split(new RegExp(`(${searchQuery})`, "gi")).map((part, i) =>
                          part.toLowerCase() === q
                            ? <mark key={i} className="bg-primary/30 text-primary font-semibold">{part}</mark>
                            : <span key={i}>{part}</span>
                        )}…
                      </p>
                    </button>
                  )];
                })}
                {chapters.every((ch) => !ch.text.toLowerCase().includes(searchQuery.toLowerCase())) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No matches</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "pronunciations" && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("absolute inset-0 z-30 overflow-y-auto p-4", themeStyle.bg)}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className={cn("font-bold", themeStyle.text)}>Pronunciations</h3>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Replace words when reading aloud. Applied when you hit play next.
            </p>

            <div className="flex gap-2 mb-5">
              <input
                placeholder="From"
                value={newPronFrom}
                onChange={(e) => setNewPronFrom(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                placeholder="To"
                value={newPronTo}
                onChange={(e) => setNewPronTo(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => {
                  if (!newPronFrom.trim() || !newPronTo.trim()) return;
                  savePronunciations([...pronunciations, { from: newPronFrom.trim(), to: newPronTo.trim() }]);
                  setNewPronFrom(""); setNewPronTo("");
                }}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
              >
                Add
              </button>
            </div>

            <div className="space-y-1">
              {pronunciations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No custom pronunciations yet</p>
              ) : pronunciations.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50">
                  <span className={cn("text-sm font-semibold", themeStyle.text)}>{p.from}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className={cn("text-sm flex-1", themeStyle.text)}>{p.to}</span>
                  <button
                    onClick={() => savePronunciations(pronunciations.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "bookmarks" && (
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("absolute inset-0 z-30 overflow-y-auto p-4", themeStyle.bg)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn("font-bold", themeStyle.text)}>Bookmarks</h3>
              <div className="flex items-center gap-2">
                <button onClick={addBookmark} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  <BookmarkCheck size={14} /> Bookmark this
                </button>
                <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No bookmarks yet</p>
            ) : (
              <div className="space-y-1">
                {bookmarks.map((bm) => (
                  <div key={bm.id} className="group flex items-start gap-2 p-3 rounded-xl hover:bg-muted/50">
                    <button
                      onClick={() => { setCurrentChapter(bm.page); setPanel(null); }}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs text-muted-foreground font-semibold mb-1">
                        Chapter {bm.page + 1}
                      </p>
                      <p className={cn("text-xs leading-relaxed line-clamp-3", themeStyle.text)}>{bm.text}</p>
                    </button>
                    <button onClick={() => removeBookmark(bm.id)} className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "settings" && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("absolute bottom-0 inset-x-0 z-30 border-t rounded-t-2xl p-5", theme === "dark" ? "bg-[#1a1a2e] border-white/10" : theme === "sepia" ? "bg-[#f4ecd8] border-[#d4c5a9]" : "bg-white border-border")}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className={cn("font-bold", themeStyle.text)}>Display Settings</h3>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="mb-5 flex gap-2">
              {(Object.entries(THEME_STYLES) as [ReaderTheme, typeof THEME_STYLES["light"]][]).map(([key, style]) => (
                <button key={key} onClick={() => setTheme(key)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border", theme === key ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted text-foreground")}>
                  <style.icon size={14} />{style.label}
                </button>
              ))}
            </div>
            <div className="mb-5 flex gap-2">
              {FONT_FAMILIES.map((f) => (
                <button key={f.label} onClick={() => setFontFamily(f.value)} className={cn("px-4 py-2 rounded-xl text-xs font-semibold transition", fontFamily === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")} style={{ fontFamily: f.value }}>{f.label}</button>
              ))}
            </div>
            <div className="mb-5 flex items-center gap-3">
              <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="p-2 bg-muted rounded"><Minus size={16}/></button>
              <div className="flex-1 h-1.5 bg-muted rounded-full relative"><div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${((fontSize - 12) / 16) * 100}%` }} /></div>
              <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="p-2 bg-muted rounded"><Plus size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Reading content ─── */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto px-6 sm:px-10 pt-5 relative outline-none pb-[320px]"
        onClick={() => panel && setPanel(null)}
      >
        {viewMode === "pdf" && book?.fileType === "pdf" ? (
          <div className="absolute inset-x-0 top-0 bottom-[300px] sm:bottom-[280px] px-2 sm:px-4">
            <iframe
              src={`/api/files/${book.r2Key}#zoom=page-width`}
              title={book.title}
              className="w-full h-full rounded-2xl shadow-lg border border-border/40 bg-white"
            />
          </div>
        ) : (
        <div className="max-w-2xl mx-auto">
          {extracting ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                {extractStage ? `Extracting text… ${extractStage.value}%` : "Extracting text…"}
              </p>
            </div>
          ) : chapter ? (
            <article>
              {book?.ocrStatus === "processing" && (
                <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary font-semibold">
                  OCR is still running for this book. Refresh in a moment.
                </div>
              )}
              {ocrSuggest && book?.fileType === "pdf" && (
                <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-semibold text-primary">This PDF looks scanned</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Run OCR to add a real text layer — better extraction and faster TTS on reopen.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={runOcr}
                      disabled={ocrBusy}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
                    >
                      {ocrBusy ? "Processing… (a few min)" : "Run OCR"}
                    </button>
                    <button
                      onClick={() => setOcrSuggest(false)}
                      className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              <h1
                className={cn("text-[2rem] sm:text-4xl font-bold mb-3 text-balance leading-[1.1] tracking-tight", themeStyle.text)}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {book.title}
              </h1>
              <p className={cn("text-xs font-semibold uppercase tracking-[0.18em] mb-8", theme === "dark" ? "text-white/50" : "text-foreground/50")}>
                Chapter {currentChapter + 1} <span className="mx-2 opacity-40">·</span> {chapter.title}
              </p>
              <div
                style={{ fontSize: `${fontSize}px`, lineHeight, fontFamily }}
                className="first-letter:float-left first-letter:text-[4em] first-letter:font-bold first-letter:leading-[0.82] first-letter:pr-3 first-letter:pt-1 first-letter:text-primary"
              >
                {sentences.map((sentence, sIdx) => {
                  const isActiveSentence = sIdx === currentSentence;
                  if (isActiveSentence && currentWord >= 0) {
                    const words = sentence.split(/(\s+)/);
                    let wordCounter = -1;
                    return (
                      <span
                        key={sIdx}
                        data-sentence={sIdx}
                        onClick={(e) => { e.stopPropagation(); handleSentenceClick(sIdx); }}
                        className="cursor-pointer rounded transition-colors duration-200 text-primary"
                      >
                        {words.map((part, pIdx) => {
                          const isSpace = /^\s+$/.test(part);
                          if (!isSpace) wordCounter++;
                          const isActiveWord = !isSpace && wordCounter === currentWord;
                          return (
                            <span
                              key={pIdx}
                              className={cn(
                                "transition-colors duration-150",
                                isActiveWord ? "font-semibold underline decoration-primary/50 underline-offset-4" : ""
                              )}
                            >{part}</span>
                          );
                        })}{" "}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={sIdx}
                      data-sentence={sIdx}
                      onClick={(e) => { e.stopPropagation(); handleSentenceClick(sIdx); }}
                      className={cn(
                        "transition-colors duration-200 cursor-pointer rounded",
                        isActiveSentence ? "text-primary" : themeStyle.text,
                        !isActiveSentence && "hover:text-primary"
                      )}
                    >
                      {sentence}{" "}
                    </span>
                  );
                })}
              </div>
            </article>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <p className={cn("font-semibold", themeStyle.text)}>Couldn&apos;t open this book</p>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
              <div className="flex gap-2 mt-2 flex-wrap justify-center">
                {!missingSource && (
                  <button onClick={loadBook} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                    Retry
                  </button>
                )}
                {!missingSource && ocrSuggest && book?.fileType === "pdf" && (
                  <button
                    onClick={runOcr}
                    disabled={ocrBusy}
                    className="px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold disabled:opacity-60"
                  >
                    {ocrBusy ? "Running OCR…" : "Run OCR"}
                  </button>
                )}
                {missingSource && (
                  <button
                    onClick={deleteBook}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {deleting ? "Removing…" : "Remove book"}
                  </button>
                )}
                <button onClick={() => router.push("/library")} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-semibold">
                  Back to library
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-20 text-center">No content to display</p>
          )}
        </div>
        )}
      </div>

      {/* ─── Waveform player card (reference-style, theme-aware) ─── */}
      <div className="absolute left-3 right-3 bottom-3 z-30 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto rounded-[28px] shadow-2xl backdrop-blur-xl px-5 pt-4 pb-5",
            theme === "dark"
              ? "bg-[#1f1f2e]/95 border border-white/5"
              : theme === "sepia"
                ? "bg-[#eedfc4]/95 border border-[#d4c5a9]/60"
                : "bg-card/95 border border-border/50"
          )}
        >
          <div className="max-w-2xl mx-auto">
            {/* Chapter label */}
            <p
              className={cn("text-center font-bold text-base mb-2 truncate", themeStyle.text)}
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {chapter?.title ?? `Chapter ${currentChapter + 1}`}
            </p>

            {/* Waveform scrubber */}
            <WaveformScrubber
              currentTime={player.currentTime}
              duration={player.duration}
              onSeek={(ratio) => player.duration && player.seek(ratio * player.duration)}
              formatTime={formatTime}
              theme={theme}
            />

            {/* 5-button row */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => togglePanel("settings")}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition",
                  theme === "dark" ? "text-white/70 hover:bg-white/5" : "text-foreground/70 hover:bg-foreground/5"
                )}
                title="Display"
              >
                <Type size={18} />
                <span className="sr-only">Aa</span>
              </button>

              <button
                onClick={() => goRelativeTime(-10)}
                disabled={!player.duration}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition disabled:opacity-30",
                  theme === "dark" ? "text-white/80 hover:bg-white/5" : "text-foreground/80 hover:bg-foreground/5"
                )}
                title="Back 10s"
              >
                <div className="relative flex items-center justify-center">
                  <RotateCcw size={22} strokeWidth={2} />
                  <span className="absolute text-[8px] font-black">10</span>
                </div>
              </button>

              <button
                onClick={handlePlay}
                disabled={tts.status === "loading" || !chapter}
                className={cn(
                  "w-[58px] h-[58px] rounded-full flex items-center justify-center transition shadow-xl disabled:opacity-50 bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                )}
              >
                {tts.status === "loading" ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : player.playing ? (
                  <Pause size={24} strokeWidth={2.5} />
                ) : (
                  <Play size={24} strokeWidth={2.5} className="ml-0.5" />
                )}
              </button>

              <button
                onClick={() => goRelativeTime(30)}
                disabled={!player.duration}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition disabled:opacity-30",
                  theme === "dark" ? "text-white/80 hover:bg-white/5" : "text-foreground/80 hover:bg-foreground/5"
                )}
                title="Forward 30s"
              >
                <div className="relative flex items-center justify-center">
                  <RotateCw size={22} strokeWidth={2} />
                  <span className="absolute text-[8px] font-black">30</span>
                </div>
              </button>

              <button
                onClick={() => {
                  const ticks = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
                  const next = ticks[(ticks.indexOf(tts.speed) + 1) % ticks.length] ?? 1.0;
                  tts.changeSpeed(next);
                }}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-black transition tabular-nums",
                  theme === "dark" ? "text-white/80 hover:bg-white/5" : "text-foreground/80 hover:bg-foreground/5"
                )}
                title="Speed"
              >
                {tts.speed}×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
