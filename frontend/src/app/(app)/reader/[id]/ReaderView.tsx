"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, List, Settings2,
  Loader2, Minus, Plus, Bookmark,
  BookmarkCheck, Moon, Sun, Type, Download, Timer, X,
  Pencil, Star, Search, MoreHorizontal,
  FileText, AlignLeft, ChevronDown, Mic
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
import { buildSearchIndex, searchBook, clearSearchIndex, type SearchHit } from "@/lib/bookSearch";
import { parseSSML, ssmlToPlainText, stripSSML, hasSSML } from "@/lib/ssml";
import { haptic } from "@/lib/haptics";
import { useKokoro, KOKORO_VOICES, type VoiceId } from "@/hooks/useKokoro";
import { usePlayer } from "@/hooks/usePlayer";
import { VoiceSelector } from "@/components/reader/VoiceSelector";
import { SpeedControl } from "@/components/reader/SpeedControl";
import { AudiobookExport } from "@/components/reader/AudiobookExport";
import { PlayerPill } from "@/components/reader/PlayerPill";
import { ReaderContentSkeleton } from "@/components/ui/Skeleton";
import { TitleActionCard } from "@/components/reader/TitleActionCard";
import { AiRail, type AiAction } from "@/components/reader/AiRail";
import { WordPopover } from "@/components/reader/WordPopover";
import { PageView } from "@/components/reader/PageView";
import { AIPanel } from "@/components/reader/AIPanel";
import { RecapBanner } from "@/components/reader/RecapBanner";
import { SheetStackProvider, useSheetStack } from "@/components/ui/sheet-stack";
import { getCachedEmbeddings, putCachedEmbeddings } from "@/lib/bookCache";
import { extractParagraphChunks } from "@/lib/embeddings";
import { estimateTimestamps } from "@/lib/wordSync";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

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
  wordCount?: number | null;
  isFavorite?: boolean;
};

type Panel2 = "voice" | "chapters" | "settings" | "bookmarks" | "search" | "pronunciations" | "download" | "ai" | null;

type BookmarkItem = {
  id: string;
  page: number;
  text: string;
  note: string | null;
  color: string;
  createdAt: string;
};

type ReaderTheme = "light" | "dark" | "sepia";
type Panel = Panel2;

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

export default function ReaderView() {
  return (
    <SheetStackProvider>
      <ReaderPageInner />
    </SheetStackProvider>
  );
}

function ReaderPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sheets = useSheetStack();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractStage, setExtractStage] = useState<{ stage: string; value: number } | null>(null);
  const [error, setError] = useState("");
  const panel: Panel = (sheets.topId as Panel) ?? null;
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
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [viewMode, setViewMode] = useState<"text" | "pdf">("text");
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);
  const [newPronFrom, setNewPronFrom] = useState("");
  const [newPronTo, setNewPronTo] = useState("");
  const prewarmAbortRef = useRef<AbortController | null>(null);
  const prewarmedRef = useRef<Set<number>>(new Set());
  const [titleCardOpen, setTitleCardOpen] = useState(false);
  const [topHidden, setTopHidden] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isFavorite, setIsFavorite] = useState(false);
  const [aiAction, setAiAction] = useState<AiAction | null>(null);
  const [showRecap, setShowRecap] = useState(false);
  const bgEmbedWorkerRef = useRef<Worker | null>(null);
  const topIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorColor, setCursorColor] = useState<string>("purple");
  const [highlightSentence, setHighlightSentence] = useState(true);
  const [autoHidePlayer, setAutoHidePlayer] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [podcastMode, setPodcastMode] = useState(false);
  const [wordPopover, setWordPopover] = useState<{ word: string; sentence: string; anchor: { x: number; y: number } } | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const tts = useKokoro();
  const player = usePlayer();

  const PANEL_META: Record<NonNullable<Panel>, { title: string; variant: "bottom" | "left" | "right" | "fullscreen" }> = {
    voice: { title: "Voice & Speed", variant: "bottom" },
    chapters: { title: "Navigator", variant: "left" },
    settings: { title: "Reader settings", variant: "bottom" },
    bookmarks: { title: "Bookmarks", variant: "right" },
    search: { title: "Search", variant: "bottom" },
    pronunciations: { title: "Pronunciations", variant: "bottom" },
    download: { title: "Export audiobook", variant: "bottom" },
    ai: { title: "Voca AI", variant: "bottom" },
  };

  const setPanel = useCallback((p: Panel) => {
    if (p === null) { sheets.closeAll(); return; }
    const meta = PANEL_META[p];
    sheets.open({ id: p, title: meta.title, variant: meta.variant, external: true });
  }, [sheets]);

  const togglePanel = useCallback((p: NonNullable<Panel>) => {
    if (sheets.isOpen(p)) { sheets.closeAll(); return; }
    if (p === "voice" && (tts.status === "idle" || tts.status === "error")) {
      tts.initWorker();
    }
    const meta = PANEL_META[p];
    sheets.open({ id: p, title: meta.title, variant: meta.variant, external: true });
  }, [sheets, tts]);

  const saveProgress = useCallback(
    async (page: number, total: number) => {
      if (!id) return;
      const percent = total > 0 ? Math.round(((page + 1) / total) * 100) : 0;
      apiFetch("/api/progress", {
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
      const res = await apiFetch(`/api/library/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Book not found" : `Server error (${res.status})`);
        setLoading(false);
        return;
      }
      const data: Book = await res.json();
      setBook(data);
      if (data.bookmarks) setBookmarks(data.bookmarks);
      setIsFavorite(!!data.isFavorite);

      // Book shell is available — flip off the blocking loader so the page is interactive
      setLoading(false);

      const cached = await getCachedChapters(data.id);
      if (cached && cached.length > 0) {
        setChapters(cached);
        buildSearchIndex(data.id, cached);
        const startPage = data.progress?.currentPage ?? 0;
        setCurrentChapter(Math.min(startPage, cached.length - 1));
        if (startPage > 0) setShowRecap(true);
        triggerBackgroundEmbed(data.id, cached);
      } else {
        setExtracting(true);
        try {
          const fileUrl = await getFileUrl(data.r2Key);
          const extracted = await extractText(fileUrl, data.fileType, (stage, value) =>
            setExtractStage({ stage, value })
          );
          if (extracted.length === 0) throw new Error("No text found in document");
          setChapters(extracted);
          buildSearchIndex(data.id, extracted);
          await cacheChapters(data.id, extracted);
          const startPage = data.progress?.currentPage ?? 0;
          setCurrentChapter(Math.min(startPage, extracted.length - 1));
          if (startPage > 0) setShowRecap(true);
          triggerBackgroundEmbed(data.id, extracted);

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

      if (data.fileType === "pdf") {
        getFileUrl(data.r2Key)
          .then((fileUrl) => {
            setPdfFileUrl(fileUrl);
            return extractPdfCover(fileUrl);
          })
          .then((coverUrl) => {
            if (coverUrl && !data.coverUrl) {
              setBook((prev) => (prev ? { ...prev, coverUrl } : prev));
              apiFetch(`/api/library/${data.id}/cover`, {
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

  useEffect(() => { 
    loadBook(); 
  }, [loadBook]);

  // Prewarm TTS worker once on mount (Phase 12a)
  const ttsInitDone = useRef(false);
  useEffect(() => {
    if (!ttsInitDone.current && tts.status === "idle" && !loading && book) {
      ttsInitDone.current = true;
      tts.initWorker();
    }
  }, [tts.status, loading, book]);

  const runOcr = useCallback(async () => {
    if (!book || ocrBusy) return;
    setOcrBusy(true);
    setOcrSuggest(false);
    try {
      const res = await apiFetch(`/api/library/${book.id}/ocr`, {
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
      await apiFetch(`/api/library/${book.id}`, { method: "DELETE" });
    } catch { /* ignore */ }
    router.push("/library");
  }, [book, deleting, router]);

  useEffect(() => {
    if (chapters.length > 0) saveProgress(currentChapter, chapters.length);
  }, [currentChapter, chapters.length, saveProgress]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentChapter]);

  // Top strip auto-hide after 3s idle while playing
  useEffect(() => {
    function wakeTop() {
      setTopHidden(false);
      if (topIdleRef.current) clearTimeout(topIdleRef.current);
      if (!player.playing) return;
      topIdleRef.current = setTimeout(() => setTopHidden(true), 3000);
    }
    wakeTop();
    window.addEventListener("pointermove", wakeTop, { passive: true });
    window.addEventListener("touchstart", wakeTop, { passive: true });
    window.addEventListener("keydown", wakeTop);
    return () => {
      if (topIdleRef.current) clearTimeout(topIdleRef.current);
      window.removeEventListener("pointermove", wakeTop);
      window.removeEventListener("touchstart", wakeTop);
      window.removeEventListener("keydown", wakeTop);
    };
  }, [player.playing]);

  async function toggleFavorite() {
    if (!book) return;
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      await apiFetch(`/api/library/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
    } catch {
      setIsFavorite(!next);
    }
  }

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

  // Word-by-word highlight: use character-weighted estimation for accuracy
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

    // Build character-weighted timestamps for this sentence's words
    const timestamps = estimateTimestamps(words, player.duration);

    function tick() {
      const time = player.currentTime;
      // Find the word at this time using weighted timestamps
      let wordIdx = 0;
      for (let i = 0; i < timestamps.length; i++) {
        if (time >= timestamps[i].start) wordIdx = i;
        if (time < timestamps[i].end) break;
      }
      setCurrentWord(Math.min(wordIdx, words.length - 1));
      wordAnimRef.current = requestAnimationFrame(tick);
    }
    wordAnimRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(wordAnimRef.current);
  }, [currentSentence, player.playing, player.duration, player.currentTime, chapters, currentChapter]);

  // Auto-scroll active sentence into view
  useEffect(() => {
    if (currentSentence < 0) return;
    const el = document.querySelector(`[data-sentence="${currentSentence}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSentence]);

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

  // Load per-book cursor color
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(`voca:reader:cursor:${id}`);
      if (raw) setCursorColor(raw);
    } catch { /* ignore */ }
  }, [id]);

  // Load global listening prefs (auto-hide, auto-play, highlight sentence)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("voca:reader:listening");
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.autoHidePlayer === "boolean") setAutoHidePlayer(v.autoHidePlayer);
        if (typeof v.autoPlayAudio === "boolean") setAutoPlayAudio(v.autoPlayAudio);
        if (typeof v.highlightSentence === "boolean") setHighlightSentence(v.highlightSentence);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist listening prefs whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "voca:reader:listening",
        JSON.stringify({ autoHidePlayer, autoPlayAudio, highlightSentence })
      );
    } catch { /* ignore */ }
  }, [autoHidePlayer, autoPlayAudio, highlightSentence]);

  // Persist cursor color per book
  useEffect(() => {
    if (!id) return;
    try { localStorage.setItem(`voca:reader:cursor:${id}`, cursorColor); } catch { /* ignore */ }
  }, [id, cursorColor]);

  // Auto-play once chapters are loaded if user opted in
  useEffect(() => {
    if (!autoPlayAudio) return;
    if (!chapters.length || player.playing) return;
    if (tts.status === "loading") return;
    // Defer one tick so worker init can race
    const t = setTimeout(() => { handlePlay(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayAudio, chapters.length, currentChapter]);

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

  // Auto-advance chapter when playback finishes
  useEffect(() => {
    player.setOnQueueEnd(() => {
      if (currentChapter < chapters.length - 1) {
        goChapter(1);
        pendingPlayRef.current = true;
        // if TTS worker isn't loaded yet for some reason, init it
        if (tts.status === "idle" || tts.status === "error") {
             tts.initWorker();
        }
      }
    });
  }, [currentChapter, chapters.length, player, tts]);

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
    setTimeout(() => {
      // Pre-process podcast mode (mix primary and secondary voices)
      const primaryVoice = tts.voice;
      const secondaryVoice = primaryVoice.startsWith("af_") ? "am_michael" : "af_bella";

      if (podcastMode) {
         // Create items object
         const paragraphBlocks = stripSSML(spokenText).split(/(?:\r?\n){2,}/);
         const mixItems = paragraphBlocks.map((block, idx) => ({
             text: block,
             voice: idx % 2 === 0 ? primaryVoice : secondaryVoice
         }));
         tts.generate({ items: mixItems }, `${book.id}-ch${currentChapter}`);
      } else {
         tts.generate({ text: ssmlToPlainText(parseSSML(spokenText)) }, `${book.id}-ch${currentChapter}`);
      }
    }, 100);
  }, [book, chapters, currentChapter, tts, player, pronunciations, podcastMode]);

  // Auto-start generation once TTS becomes ready after user requested play
  useEffect(() => {
    if (tts.status === "ready" && pendingPlayRef.current) {
      pendingPlayRef.current = false;
      playChapterNow();
    }
  }, [tts.status, playChapterNow]);

  // Pre-generate next 2 chapters in background for seamless playback (Speechify-style)
  useEffect(() => {
    if (tts.status !== "ready" || !book || chapters.length === 0) return;
    const pregenerate = async () => {
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = currentChapter + offset;
        if (nextIdx >= chapters.length) break;
        const already = await hasCachedAudio(book.id, nextIdx, tts.voice, tts.speed);
        if (already) continue;
        // Generate in background — fire-and-forget via the TTS worker
        const nextChapter = chapters[nextIdx];
        if (!nextChapter?.text) continue;
        const spokenText = applyPronunciations(nextChapter.text, pronunciations);
        const plainText = ssmlToPlainText(parseSSML(spokenText));
        tts.generate({ text: plainText }, `${book.id}-pregen-ch${nextIdx}`);
        // Only pre-gen one at a time to avoid overloading
        break;
      }
    };
    // Delay pre-gen slightly so it doesn't compete with current chapter
    const timer = setTimeout(pregenerate, 3000);
    return () => clearTimeout(timer);
  }, [currentChapter, tts.status, book, chapters, tts, pronunciations]);

  function handlePlay() {
    const chapter = chapters[currentChapter];
    if (!chapter || !book) return;

    if (player.playing) {
      haptic("medium");
      player.pause();
      return;
    }

    haptic("light");
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
        const primaryVoice = tts.voice;
        const secondaryVoice = primaryVoice.startsWith("af_") ? "am_michael" : "af_bella";
  
        if (podcastMode) {
           const paragraphBlocks = stripSSML(chapters[i].text).split(/(?:\r?\n){2,}/);
           const mixItems = paragraphBlocks.map((block, idx) => ({
               text: block,
               voice: idx % 2 === 0 ? primaryVoice : secondaryVoice
           }));
           tts.generate({ items: mixItems }, `dl-${book.id}-ch${i}`);
        } else {
           tts.generate({ text: ssmlToPlainText(parseSSML(chapters[i].text)) }, `dl-${book.id}-ch${i}`);
        }
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

  function handleSentenceClickOrWord(e: React.MouseEvent, sentenceIdx: number, sentenceText: string) {
    e.stopPropagation();
    type CaretRangeFn = (x: number, y: number) => Range | null;
    type CaretPosFn = (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    const doc = document as Document & { caretRangeFromPoint?: CaretRangeFn; caretPositionFromPoint?: CaretPosFn };
    let node: Node | null = null;
    let offset = 0;
    if (typeof doc.caretRangeFromPoint === "function") {
      const r = doc.caretRangeFromPoint(e.clientX, e.clientY);
      if (r) { node = r.startContainer; offset = r.startOffset; }
    } else if (typeof doc.caretPositionFromPoint === "function") {
      const p = doc.caretPositionFromPoint(e.clientX, e.clientY);
      if (p) { node = p.offsetNode; offset = p.offset; }
    }
    if (node && node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      let s = offset, eo = offset;
      while (s > 0 && /[\w'-]/.test(text[s - 1])) s--;
      while (eo < text.length && /[\w'-]/.test(text[eo])) eo++;
      const word = text.slice(s, eo).trim();
      if (word && word.length >= 2) {
        setWordPopover({ word, sentence: sentenceText, anchor: { x: e.clientX, y: e.clientY } });
        return;
      }
    }
    handleSentenceClick(sentenceIdx);
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
      // Force single primary voice for jump generation
      tts.generate({ text: ssmlToPlainText(parseSSML(spokenText)) }, `${book.id}-ch${currentChapter}-s${sentenceIdx}`);
      setCurrentSentence(sentenceIdx);
    }
  }

  async function addBookmark() {
    if (!book || !chapters[currentChapter]) return;
    const chapter = chapters[currentChapter];
    const snippet = chapter.text.slice(0, 200);

    const res = await apiFetch("/api/bookmarks", {
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
    await apiFetch("/api/bookmarks", {
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

  useEffect(() => {
    return () => {
      bgEmbedWorkerRef.current?.terminate();
    };
  }, []);

  const triggerBackgroundEmbed = async (bid: string, chaps: Chapter[]) => {
    const existing = await getCachedEmbeddings(bid);
    if (existing && existing.length > 0) return; // Already embedded

    const chunks = extractParagraphChunks(chaps);
    if (chunks.length === 0) return;

    const worker = new Worker(new URL("../../../../workers/ai.worker.ts", import.meta.url), { type: "module" });
    bgEmbedWorkerRef.current = worker;

    const vectors: { text: string; vector: number[] }[] = [];
    let idx = 0;

    worker.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === "result" && msg.task === "embed") {
        vectors.push({ text: chunks[idx], vector: msg.result });
        idx++;
        if (idx < chunks.length) {
          // Send next
          worker.postMessage({ type: "embed", text: chunks[idx], id: `bg-${idx}` });
        } else {
          // Done
          await putCachedEmbeddings(bid, vectors);
          worker.terminate();
          bgEmbedWorkerRef.current = null;
          console.log("Background embeddings complete:", vectors.length);
        }
      }
    };
    
    // Start first chunk
    worker.postMessage({ type: "embed", text: chunks[0], id: `bg-0` });
  };

  const currentPageBookmarked = bookmarks.some((b) => b.page === currentChapter);
  const chapterProgress = chapters.length > 0 ? ((currentChapter + 1) / chapters.length) * 100 : 0;
  const themeStyle = THEME_STYLES[theme];

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          goRelativeTime(10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          goRelativeTime(-10);
          break;
        case "j":
        case "J":
          if (currentChapter < chapters.length - 1) setCurrentChapter((c) => c + 1);
          break;
        case "k":
        case "K":
          if (currentChapter > 0) setCurrentChapter((c) => c - 1);
          break;
        case "b":
        case "B":
          if (book && chapters[currentChapter]) {
            const ch = chapters[currentChapter];
            const text = ch.text.slice(0, 200);
            if (currentPageBookmarked) {
              const bm = bookmarks.find((b) => b.page === currentChapter);
              if (bm) removeBookmark(bm.id);
            } else {
              addBookmark();
            }
          }
          break;
        case "/":
          e.preventDefault();
          togglePanel("chapters");
          break;
        case "Escape":
          if (panel) setPanel(null);
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
      <div className={cn("min-h-[100dvh] pt-16", themeStyle.bg)}>
        <ReaderContentSkeleton />
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
    <div className={cn("flex flex-col h-[calc(100dvh-5rem)] lg:h-dvh relative overflow-hidden page-transition", themeStyle.bg)}>
      
      <AnimatePresence>
        {book && showRecap && currentChapter > 0 && chapters[currentChapter - 1] && (
          <RecapBanner
            theme={theme}
            bookId={book.id}
            previousChapterText={chapters[currentChapter - 1].text}
            onDismiss={() => setShowRecap(false)}
            onExpand={() => {
              setAiAction("recap");
              setPanel("ai");
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Flat transparent top strip (Phase 1a) ─── */}
      <div
        className={cn(
          "sticky top-0 z-20 shrink-0 pt-safe transition-transform duration-300",
          topHidden ? "-translate-y-[110%]" : "translate-y-0"
        )}
        onPointerEnter={() => setTopHidden(false)}
      >
        <div className={cn(
          "px-3 sm:px-5 pt-3 pb-2 flex items-center gap-1.5 backdrop-blur-md",
          theme === "dark" ? "bg-[#1a1a2e]/40" : theme === "sepia" ? "bg-[#f4ecd8]/40" : "bg-white/40"
        )}>
          <IconPill onClick={() => router.push("/library")} title="Back" theme={theme}>
            <ChevronLeft size={18} />
          </IconPill>

          <IconPill onClick={() => togglePanel("bookmarks")} title="Bookmarks" theme={theme} active={currentPageBookmarked}>
            <Pencil size={16} />
          </IconPill>

          <IconPill onClick={() => togglePanel("chapters")} title="Chapters" theme={theme}>
            <List size={18} />
          </IconPill>

          {/* Title chip (drops TitleActionCard) */}
          <button
            onClick={() => setTitleCardOpen((v) => !v)}
            className={cn(
              "flex-1 mx-1 flex items-center justify-center gap-1.5 h-9 rounded-full px-3 transition active:scale-[0.98] min-w-0",
              theme === "dark" ? "hover:bg-white/5 text-white/90" : theme === "sepia" ? "hover:bg-[#5b4636]/5 text-[#5b4636]" : "hover:bg-foreground/5 text-foreground/90"
            )}
            title="Book actions"
          >
            <span className="text-sm font-bold truncate max-w-[40vw] sm:max-w-[260px]">{book?.title}</span>
            <ChevronDown size={14} className={cn("opacity-60 transition-transform shrink-0", titleCardOpen && "rotate-180")} />
          </button>

          <IconPill onClick={() => setPanel("download")} title="Export audiobook" theme={theme}>
            <Download size={16} />
          </IconPill>

          <IconPill onClick={toggleFavorite} title="Favorite" theme={theme} active={isFavorite}>
            <Star size={16} className={isFavorite ? "fill-current" : ""} />
          </IconPill>

          <IconPill onClick={() => togglePanel("search")} title="Search" theme={theme}>
            <Search size={16} />
          </IconPill>

          <IconPill onClick={() => togglePanel("settings")} title="Settings" theme={theme}>
            <Settings2 size={16} />
          </IconPill>

          <span className={cn(
            "hidden sm:inline-block text-[11px] font-bold tabular-nums px-1.5 opacity-60",
            themeStyle.text
          )}>
            {chapters.length > 0 ? `${currentChapter + 1}/${chapters.length}` : ""}
          </span>

          <BottomSheet>
            <BottomSheetTrigger>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95",
                theme === "dark" ? "hover:bg-white/5 text-white/85" : theme === "sepia" ? "hover:bg-[#5b4636]/5 text-[#5b4636]" : "hover:bg-foreground/5 text-foreground/85"
              )}>
                <MoreHorizontal size={18} />
              </div>
            </BottomSheetTrigger>
          <BottomSheetContent className={cn(
              "border-t",
              theme === "dark" ? "bg-[#18181A] text-white border-white/5" : theme === "sepia" ? "bg-[#f4ecd8] text-[#5b4636] border-[#d4c5a9]" : "bg-white text-foreground border-border"
            )}>
            <div className="p-4 pt-2">
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-14 rounded shadow-md relative overflow-hidden border", theme === "dark" ? "bg-white/20 border-white/10" : "bg-muted border-border/40")}>
                    {book.coverUrl && <img src={book.coverUrl} className="w-full h-full object-cover" alt="Cover" />}
                  </div>
                  <h3 className="font-bold text-lg">{chapter?.title || book.title}</h3>
                </div>
                <BottomSheetTrigger>
                  <button className={cn("p-2", theme === "dark" ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground")}><X size={24}/></button>
                </BottomSheetTrigger>
              </div>

              {/* Drawer Grid Actions */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button onClick={() => { togglePanel("search"); }} className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl transition", theme === "dark" ? "bg-white/5 hover:bg-white/10" : theme === "sepia" ? "bg-[#5b4636]/5 hover:bg-[#5b4636]/10" : "bg-muted hover:bg-muted/70")}>
                  <Search size={24} className="opacity-80" />
                  <span className="text-xs font-semibold">Search</span>
                </button>
                <button onClick={() => togglePanel("voice")} className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl transition", theme === "dark" ? "bg-white/5 hover:bg-white/10" : theme === "sepia" ? "bg-[#5b4636]/5 hover:bg-[#5b4636]/10" : "bg-muted hover:bg-muted/70")}>
                  <Mic size={24} className="opacity-80" />
                  <span className="text-xs font-semibold">Change Voice</span>
                </button>
                <button onClick={() => setSleepTimer(sleepTimer > 0 ? 0 : 15)} className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl transition", sleepTimer > 0 ? "bg-primary text-primary-foreground" : theme === "dark" ? "bg-white/5 hover:bg-white/10" : theme === "sepia" ? "bg-[#5b4636]/5 hover:bg-[#5b4636]/10" : "bg-muted hover:bg-muted/70")}>
                  <Timer size={24} className={sleepTimer > 0 ? "scale-110" : "opacity-80"} />
                  <span className="text-xs font-semibold">{sleepTimer > 0 ? `${Math.ceil(sleepRemaining / 60)}m left` : "Sleep timer"}</span>
                </button>
              </div>

              {/* AI chips (mobile fallback for desktop AiRail) */}
              <div className="lg:hidden mb-6">
                <p className={cn("text-[10px] uppercase tracking-wider font-bold mb-2", theme === "dark" ? "text-white/40" : "text-muted-foreground")}>AI tools</p>
                <AiRail
                  theme={theme}
                  variant="chips"
                  active={aiAction}
                  onSelect={(a) => { setAiAction(a); setPanel("ai"); }}
                />
              </div>

              {/* PDF view-mode toggle (moved from old top strip) */}
              {book?.fileType === "pdf" && (
                <div className="mb-4 flex items-center gap-2">
                  <span className={cn("text-[11px] uppercase tracking-wider font-bold mr-1", theme === "dark" ? "text-white/40" : "text-muted-foreground")}>View</span>
                  <button
                    onClick={() => setViewMode("text")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition",
                      viewMode === "text" ? "bg-primary text-primary-foreground" : theme === "dark" ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  ><AlignLeft size={13} /> Text</button>
                  <button
                    onClick={() => setViewMode("pdf")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition",
                      viewMode === "pdf" ? "bg-primary text-primary-foreground" : theme === "dark" ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  ><FileText size={13} /> Original PDF</button>
                </div>
              )}

              {/* Vertical Actions */}
              <div className="flex flex-col gap-1">
                <button onClick={() => togglePanel("settings")} className={cn("flex items-center gap-4 p-4 rounded-xl transition w-full text-left", theme === "dark" ? "hover:bg-white/5" : "hover:bg-muted")}>
                  <Type size={20} className="opacity-60" />
                  <span className="text-sm font-semibold">Hide text</span>
                </button>
                <button onClick={() => togglePanel("bookmarks")} className={cn("flex items-center gap-4 p-4 rounded-xl transition w-full text-left", theme === "dark" ? "hover:bg-white/5" : "hover:bg-muted")}>
                  <Bookmark size={20} className="opacity-60" />
                  <span className="text-sm font-semibold">Bookmarks</span>
                </button>
                <button onClick={() => togglePanel("pronunciations")} className={cn("flex items-center gap-4 p-4 rounded-xl transition w-full text-left", theme === "dark" ? "hover:bg-white/5" : "hover:bg-muted")}>
                  <List size={20} className="opacity-60" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Pronunciations</span>
                    {pronunciations.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">{pronunciations.length} rule{pronunciations.length === 1 ? "" : "s"} active</span>
                    )}
                  </div>
                </button>
                <button
                  onClick={downloadForOffline}
                  disabled={!!downloadState?.active || tts.status === 'loading'}
                  className={cn("flex items-center justify-between p-4 rounded-xl transition w-full text-left disabled:opacity-60", theme === "dark" ? "hover:bg-white/5" : "hover:bg-muted")}
                >
                  <div className="flex items-center gap-4">
                    <Download size={20} className="opacity-60" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Download for offline</span>
                      {downloadState?.active ? (
                        <span className="text-[11px] text-primary">
                          Chapter {downloadState.chapterIdx + 1} of {downloadState.total}…
                        </span>
                      ) : cachedChaptersSet.size > 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          {cachedChaptersSet.size}/{chapters.length} chapters cached
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {(downloadState?.active || tts.status === 'loading') && (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  )}
                </button>
                <button onClick={() => togglePanel("settings")} className={cn("flex items-center gap-4 p-4 rounded-xl transition w-full text-left", theme === "dark" ? "hover:bg-white/5" : "hover:bg-muted")}>
                  <Settings2 size={20} className="opacity-60" />
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
            initial={isDesktop ? { x: "100%" } : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute z-30 overflow-y-auto overflow-x-hidden p-4",
              isDesktop
                ? "top-0 right-0 bottom-0 w-[380px] border-l shadow-[-20px_0_40px_rgba(0,0,0,0.08)]"
                : "inset-0",
              themeStyle.bg
            )}
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
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Speed</div>
              <SpeedControl
                theme={theme}
                themeText={themeStyle.text}
                speed={tts.speed}
                onChange={(s) => tts.changeSpeed(s)}
                onSaveAsDefault={() => tts.setAsDefault(tts.voice, tts.speed)}
              />
            </div>
            {book && chapters.length > 0 && <AudiobookExport bookId={book.id} bookTitle={book.title} chapters={chapters} voice={tts.voice} speed={tts.speed} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "chapters" && (
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "absolute z-30 top-0 bottom-0 left-0 overflow-y-auto overflow-x-hidden border-r",
              isDesktop ? "w-[380px]" : "w-[min(92vw,360px)]",
              theme === "dark" ? "bg-[#1a1a2e] border-white/8" : theme === "sepia" ? "bg-[#f4ecd8] border-[#d4c5a9]" : "bg-card border-border/60"
            )}
            style={{ boxShadow: "var(--shadow-float)" }}
            ref={(el) => {
              if (!el) return;
              // Scroll to active chapter when sheet opens
              const target = el.querySelector(`[data-ch="${currentChapter}"]`) as HTMLElement | null;
              target?.scrollIntoView({ block: "center" });
            }}
          >
            <div className="sticky top-0 z-10 backdrop-blur-md bg-inherit px-4 pt-4 pb-2 flex items-center justify-between">
              <h3 className={cn("font-bold text-sm", themeStyle.text)}>Navigator</h3>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="px-3 pt-1 pb-4">
              <div className="space-y-0.5">
                {chapters.map((ch, idx) => {
                  const active = idx === currentChapter;
                  return (
                    <button
                      key={idx}
                      data-ch={idx}
                      onClick={() => { setCurrentChapter(idx); setPanel(null); }}
                      className={cn(
                        "w-full text-left rounded-xl px-3 py-2.5 transition relative flex items-center justify-between gap-3 group",
                        active
                          ? theme === "dark" ? "bg-primary/15" : "bg-primary/10"
                          : theme === "dark" ? "hover:bg-white/5" : "hover:bg-foreground/5"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                      )}
                      <span className="flex items-center gap-2 min-w-0">
                        {active && (
                          <span className="text-primary shrink-0" aria-hidden>
                            <span className="inline-flex items-end gap-[2px] h-3">
                              <span className="w-[2px] h-2 bg-current animate-pulse" />
                              <span className="w-[2px] h-3 bg-current animate-pulse [animation-delay:120ms]" />
                              <span className="w-[2px] h-1.5 bg-current animate-pulse [animation-delay:240ms]" />
                            </span>
                          </span>
                        )}
                        <span className={cn("text-[12px] font-bold uppercase tracking-wider truncate", active ? "text-primary" : themeStyle.text)}>
                          Chapter {idx + 1}
                          {ch.title && ch.title !== `Chapter ${idx + 1}` && (
                            <span className="opacity-70 normal-case font-medium ml-1.5 tracking-normal">: {ch.title}</span>
                          )}
                        </span>
                      </span>
                      <span className={cn("text-[11px] tabular-nums opacity-60 shrink-0", active ? "text-primary" : themeStyle.text)}>
                        {idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "search" && (
          <motion.div
            initial={isDesktop ? { x: "100%" } : { y: "100%" }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute z-30 overflow-y-auto overflow-x-hidden p-4",
              isDesktop
                ? "top-0 right-0 bottom-0 w-[380px] border-l shadow-[-20px_0_40px_rgba(0,0,0,0.08)]"
                : "inset-0",
              themeStyle.bg
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <Search size={16} className="text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search in book…"
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  if (q.trim().length >= 2) {
                    setSearchResults(searchBook(q));
                  } else {
                    setSearchResults([]);
                  }
                }}
                className={cn("flex-1 bg-transparent outline-none text-sm", themeStyle.text)}
              />
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            {searchQuery.trim().length >= 2 && (
              <div className="space-y-1">
                {searchResults.map((hit, i) => (
                  <button
                    key={`${hit.chapterIdx}-${i}`}
                    onClick={() => { setCurrentChapter(hit.chapterIdx); setPanel(null); }}
                    className={cn("w-full text-left px-3 py-2.5 rounded-xl text-sm transition hover:bg-muted", themeStyle.text)}
                  >
                    <p className="text-xs text-muted-foreground font-semibold mb-1">
                      Chapter {hit.chapterIdx + 1} · {hit.chapterTitle}
                    </p>
                    <p className="text-xs leading-relaxed">
                      …{hit.snippet.slice(0, hit.matchStart)}
                      <mark className="bg-primary/30 text-primary font-semibold">
                        {hit.snippet.slice(hit.matchStart, hit.matchEnd)}
                      </mark>
                      {hit.snippet.slice(hit.matchEnd)}…
                    </p>
                  </button>
                ))}
                {searchResults.length === 0 && (
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
            initial={isDesktop ? { x: "100%" } : { y: "100%" }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute z-30 overflow-y-auto overflow-x-hidden p-4",
              isDesktop
                ? "top-0 right-0 bottom-0 w-[380px] border-l shadow-[-20px_0_40px_rgba(0,0,0,0.08)]"
                : "inset-0",
              themeStyle.bg
            )}
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
            initial={isDesktop ? { x: "100%" } : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute z-30 overflow-y-auto overflow-x-hidden p-4",
              isDesktop
                ? "top-0 right-0 bottom-0 w-[380px] border-l shadow-[-20px_0_40px_rgba(0,0,0,0.08)]"
                : "inset-0",
              themeStyle.bg
            )}
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
            initial={isDesktop ? { x: "100%" } : { y: "100%" }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute z-30 overflow-y-auto overflow-x-hidden",
              isDesktop 
                ? "top-0 right-0 bottom-0 w-[380px] border-l shadow-[-20px_0_40px_rgba(0,0,0,0.08)]" 
                : "bottom-0 inset-x-0 border-t rounded-t-[var(--radius-sheet)] max-h-[85vh]",
              theme === "dark" ? "bg-[#1a1a2e] border-white/10" : theme === "sepia" ? "bg-[#f4ecd8] border-[#d4c5a9]" : "bg-white border-border"
            )}
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 z-10 backdrop-blur-xl px-5 pt-5 pb-2">
              <h3 className={cn("font-bold text-base", themeStyle.text)}>Reader settings</h3>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="px-5 pb-8">
            {/* ── Appearance ── */}
            <SectionLabel theme={theme}>Appearance</SectionLabel>
            <div className="mb-3 grid grid-cols-3 gap-1.5 p-1 rounded-full bg-muted/40">
              {(Object.entries(THEME_STYLES) as [ReaderTheme, typeof THEME_STYLES["light"]][]).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition active:scale-95",
                    theme === key ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"
                  )}
                >
                  <style.icon size={13} />{style.label}
                </button>
              ))}
            </div>

            <div className="mb-3 flex gap-2 flex-wrap">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFontFamily(f.value)}
                  className={cn("pill", fontFamily === f.value ? "pill-primary" : "pill-surface")}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-3">
              <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95"><Minus size={14}/></button>
              <div className="flex-1 h-1.5 bg-muted rounded-full relative">
                <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${((fontSize - 12) / 16) * 100}%` }} />
              </div>
              <span className={cn("text-[11px] font-bold tabular-nums w-7 text-center", themeStyle.text)}>{fontSize}</span>
              <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-95"><Plus size={14}/></button>
            </div>

            {/* Cursor / highlight color */}
            <div className="mb-4">
              <label className={cn("text-[11px] uppercase tracking-wider font-bold opacity-60 block mb-2", themeStyle.text)}>Highlight color</label>
              <div className="flex items-center gap-2">
                {[
                  { id: "purple", className: "bg-primary" },
                  { id: "pink", className: "bg-pink-500" },
                  { id: "red", className: "bg-red-500" },
                  { id: "green", className: "bg-emerald-500" },
                  { id: "orange", className: "bg-orange-500" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCursorColor(c.id)}
                    aria-label={c.id}
                    className={cn(
                      "w-8 h-8 rounded-full transition relative active:scale-90",
                      c.className,
                      cursorColor === c.id ? "ring-2 ring-offset-2 ring-foreground/40 ring-offset-background scale-110" : ""
                    )}
                  />
                ))}
              </div>
            </div>

            {/* View mode (PDF only) */}
            {book?.fileType === "pdf" && (
              <div className="mb-4">
                <label className={cn("text-[11px] uppercase tracking-wider font-bold opacity-60 block mb-2", themeStyle.text)}>View mode</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-muted/40">
                  <button
                    onClick={() => setViewMode("text")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition active:scale-95",
                      viewMode === "text" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground"
                    )}
                  ><AlignLeft size={13} /> Text</button>
                  <button
                    onClick={() => setViewMode("pdf")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition active:scale-95",
                      viewMode === "pdf" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground"
                    )}
                  ><FileText size={13} /> Original PDF</button>
                </div>
              </div>
            )}

            {/* ── Listening (Phase 3b) ── */}
            <SectionLabel theme={theme}>Listening</SectionLabel>

            <ToggleRow
              theme={theme}
              themeText={themeStyle.text}
              label="Auto-hide player"
              hint="Fades player after 3s of inactivity while playing"
              checked={autoHidePlayer}
              onChange={setAutoHidePlayer}
            />
            <ToggleRow
              theme={theme}
              themeText={themeStyle.text}
              label="Auto-play audio"
              hint="Start narration automatically when a book opens"
              checked={autoPlayAudio}
              onChange={setAutoPlayAudio}
            />
            <ToggleRow
              theme={theme}
              themeText={themeStyle.text}
              label="Highlight sentence"
              hint="Tint the active sentence as it's read"
              checked={highlightSentence}
              onChange={setHighlightSentence}
            />
            <ToggleRow
              theme={theme}
              themeText={themeStyle.text}
              label="Podcast mode"
              hint="Alternates between two voices for different paragraphs (Warning: disables SSML)"
              checked={podcastMode}
              onChange={setPodcastMode}
            />

            <div className="mt-4">
              <label className={cn("text-[11px] uppercase tracking-wider font-bold opacity-60 block mb-2", themeStyle.text)}>Sleep timer</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 0, label: "Off" },
                  { v: 5, label: "5m" },
                  { v: 15, label: "15m" },
                  { v: 30, label: "30m" },
                  { v: 45, label: "45m" },
                  { v: 60, label: "60m" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setSleepTimer(opt.v)}
                    className={cn("pill", sleepTimer === opt.v ? "pill-primary" : "pill-surface")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {sleepTimer > 0 && (
                <p className={cn("text-[11px] mt-2 opacity-70", themeStyle.text)}>
                  Pausing in {Math.ceil(sleepRemaining / 60)} min · {(sleepRemaining % 60).toString().padStart(2, "0")}s
                </p>
              )}
            </div>
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
        {viewMode === "pdf" && book?.fileType === "pdf" && pdfFileUrl ? (
          <div className="max-w-3xl mx-auto w-full">
            <PageView
              fileUrl={pdfFileUrl}
              pageCount={book.pageCount ?? undefined}
              theme={theme}
              currentWord={currentWord}
              currentSentence={currentSentence}
              cursorColor={cursorColor}
              onWordClick={(idx, word) => {
                // Click-to-seek: jump TTS to that word position
                handleSentenceClick(0);
              }}
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
                  const isPlaying = currentSentence >= 0; // Any sentence is active = playback mode
                  if (isActiveSentence && currentWord >= 0) {
                    const words = sentence.split(/(\s+)/);
                    let wordCounter = -1;
                    return (
                      <span
                        key={sIdx}
                        data-sentence={sIdx}
                        onClick={(e) => handleSentenceClickOrWord(e, sIdx, sentence)}
                        className={cn(
                          "cursor-pointer rounded-md transition-all duration-300 px-0.5 py-0.5",
                          theme === "dark"
                            ? "bg-white/8 text-white"
                            : theme === "sepia"
                            ? "bg-[#5b4636]/8 text-[#5b4636]"
                            : "bg-primary/8 text-foreground"
                        )}
                      >
                        {words.map((part, pIdx) => {
                          const isSpace = /^\s+$/.test(part);
                          if (!isSpace) wordCounter++;
                          const isActiveWord = !isSpace && wordCounter === currentWord;
                          return (
                            <span
                              key={pIdx}
                              className={cn(
                                "transition-all duration-150",
                                isActiveWord
                                  ? "font-bold text-primary bg-primary/15 rounded px-0.5 underline decoration-2 decoration-primary/40 underline-offset-4"
                                  : !isSpace && wordCounter < currentWord
                                  ? "opacity-70" // Already-read words dim
                                  : ""
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
                      onClick={(e) => handleSentenceClickOrWord(e, sIdx, sentence)}
                      className={cn(
                        "transition-all duration-300 cursor-pointer rounded",
                        isActiveSentence
                          ? "text-primary"
                          : isPlaying
                          ? cn("opacity-40", themeStyle.text) // Dim inactive text during playback for focus
                          : cn(themeStyle.text, "hover:text-primary")
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

      {/* ─── Floating player pill (Phase 1c) ─── */}
      <PlayerPill
        theme={theme}
        themeText={themeStyle.text}
        playing={player.playing}
        loading={tts.status === "loading"}
        hasChapter={!!chapter}
        speed={tts.speed}
        currentTime={player.currentTime}
        duration={player.duration}
        chapterLabel={chapter?.title ?? `Chapter ${currentChapter + 1}`}
        coverUrl={book?.coverUrl}
        currentVoice={tts.voice}
        voices={KOKORO_VOICES.map(v => ({ id: v.id, label: v.name }))}
        onVoiceChange={(vid) => tts.changeVoice(vid as VoiceId)}
        autoHide={autoHidePlayer}
        forceHide={!isDesktop && !!panel}
        onPlay={handlePlay}
        onSeekRelative={goRelativeTime}
        onSpeedCycle={() => {
          const ticks = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
          const next = ticks[(ticks.indexOf(tts.speed) + 1) % ticks.length] ?? 1.0;
          tts.changeSpeed(next);
        }}
        onChapterChevron={() => togglePanel("chapters")}
        onTimelineSeek={(ratio) => player.duration && player.seek(ratio * player.duration)}
        formatTime={formatTime}
      />

      {/* ─── Title action card (Phase 1b) ─── */}
      {book && (
        <TitleActionCard
          open={titleCardOpen}
          onClose={() => setTitleCardOpen(false)}
          theme={theme}
          themeText={themeStyle.text}
          bookId={book.id}
          title={book.title}
          coverUrl={book.coverUrl}
          fileType={book.fileType}
          pageCount={book.pageCount}
          wordCount={book.wordCount ?? undefined}
          r2Key={book.r2Key}
          onTitleSaved={(t) => setBook((prev) => (prev ? { ...prev, title: t } : prev))}
          onDownload={() => { setTitleCardOpen(false); setPanel("download"); }}
        />
      )}

      {/* ─── AI rail (Phase 1d) ─── */}
      <AiRail
        theme={theme}
        active={aiAction}
        onSelect={(a) => { setAiAction(a); setPanel("ai"); }}
      />

      {/* ─── Download / Export sheet (Phase 1b wiring) ─── */}
      <AnimatePresence>
        {panel === "download" && book && chapters.length > 0 && (
          <motion.div
            initial={isDesktop ? { x: "100%" } : { y: "100%" }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute z-40 overflow-y-auto overflow-x-hidden p-5",
              isDesktop
                ? "top-0 right-0 bottom-0 w-[380px] border-l shadow-[-20px_0_40px_rgba(0,0,0,0.08)]"
                : "bottom-0 inset-x-0 border-t rounded-t-3xl max-h-[80vh]",
              theme === "dark" ? "bg-[#1a1a2e] border-white/10" : theme === "sepia" ? "bg-[#f4ecd8] border-[#d4c5a9]" : "bg-white border-border"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn("font-bold", themeStyle.text)}>Export audiobook</h3>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18}/></button>
            </div>
            <p className={cn("text-xs mb-4 opacity-70", themeStyle.text)}>
              Generate the full book as an MP3 with the current voice ({tts.voice}) at {tts.speed}× speed.
            </p>
            <AudiobookExport bookId={book.id} bookTitle={book.title} chapters={chapters} voice={tts.voice} speed={tts.speed} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI sheet placeholder (Phase 1d wiring; full features land in Phase 9) ─── */}
      <AnimatePresence>
        {panel === "ai" && aiAction && (
          <AIPanel
            action={aiAction as "summary" | "recap" | "quiz" | "chat"}
            theme={theme}
            textContext={chapters[currentChapter]?.text ?? ""}
            bookId={book.id}
            onClose={() => { setPanel(null); setAiAction(null); }}
          />
        )}
      </AnimatePresence>

      {/* ─── Word popover (Phase 4) ─── */}
      <WordPopover
        open={!!wordPopover}
        word={wordPopover?.word ?? ""}
        sentence={wordPopover?.sentence ?? ""}
        anchor={wordPopover?.anchor ?? null}
        theme={theme}
        onClose={() => setWordPopover(null)}
        onHear={(text) => {
          if (tts.status === "idle" || tts.status === "error") { tts.initWorker(); return; }
          if (!sampleAudioRef.current) sampleAudioRef.current = new Audio();
          tts.onSample((_v, blob) => {
            const audio = sampleAudioRef.current;
            if (!audio) return;
            audio.src = URL.createObjectURL(blob);
            audio.play().catch(() => {});
          });
          tts.playSample(tts.voice, text);
        }}
        onFixPronunciation={(w) => {
          setNewPronFrom(w);
          setNewPronTo("");
          setPanel("pronunciations");
        }}
        onCopy={(text) => {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
          setWordPopover(null);
        }}
        onHighlight={(snippet) => {
          if (!book) return;
          apiFetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookId: book.id,
              page: currentChapter,
              text: snippet.slice(0, 200),
              color: cursorColor,
            }),
          })
            .then((r) => r.ok ? r.json() : null)
            .then((bm) => { if (bm) setBookmarks((prev) => [bm, ...prev]); })
            .catch(() => {});
        }}
      />
    </div>
  );
}

function IconPill({
  children, onClick, title, theme, active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  theme: ReaderTheme;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 shrink-0",
        active
          ? "bg-primary/15 text-primary"
          : theme === "dark"
            ? "hover:bg-white/5 text-white/85"
            : theme === "sepia"
              ? "hover:bg-[#5b4636]/5 text-[#5b4636]"
              : "hover:bg-foreground/5 text-foreground/85"
      )}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children, theme }: { children: React.ReactNode; theme: ReaderTheme }) {
  return (
    <p
      className={cn(
        "text-[10px] uppercase tracking-[0.18em] font-bold mb-2 mt-4 first:mt-0 opacity-50",
        theme === "dark" ? "text-white" : theme === "sepia" ? "text-[#5b4636]" : "text-foreground"
      )}
    >
      {children}
    </p>
  );
}

function ToggleRow({
  label, hint, checked, onChange, theme, themeText,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  theme: ReaderTheme;
  themeText: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-center justify-between gap-3 py-2.5 text-left",
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-[13px] font-semibold", themeText)}>{label}</p>
        {hint && <p className={cn("text-[11px] mt-0.5 opacity-60", themeText)}>{hint}</p>}
      </div>
      <div
        className={cn(
          "shrink-0 w-10 h-6 rounded-full transition relative",
          checked ? "bg-primary" : theme === "dark" ? "bg-white/15" : "bg-muted"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4"
          )}
        />
      </div>
    </button>
  );
}
