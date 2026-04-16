"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Settings2,
  Loader2, Minus, Plus, Play, Pause, Volume2, Bookmark,
  BookmarkCheck, Moon, Sun, Type, Download, Timer, X,
  SkipBack, SkipForward, Maximize2, RotateCcw, RotateCw, MessageSquare, Search, MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomSheet, BottomSheetTrigger, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { extractText, extractPdfCover, type Chapter } from "@/lib/extract";
import {
  cacheChapters, getCachedChapters,
  getCachedAudio, putCachedAudio, hasCachedAudio,
  requestPersistentStorage,
} from "@/lib/bookCache";
import { getFileUrl } from "@/lib/fileUrl";
import { useKokoro } from "@/hooks/useKokoro";
import { usePlayer } from "@/hooks/usePlayer";
import { VoiceSelector } from "@/components/reader/VoiceSelector";
import { AudiobookExport } from "@/components/reader/AudiobookExport";
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
type Panel = "voice" | "chapters" | "settings" | "bookmarks" | null;

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
  const [downloadState, setDownloadState] = useState<{ active: boolean; chapterIdx: number; total: number } | null>(null);

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/library/${id}`);
        if (!res.ok) { setError("Book not found"); return; }
        const data: Book = await res.json();
        setBook(data);
        if (data.bookmarks) setBookmarks(data.bookmarks);

        const cached = await getCachedChapters(data.id);
        if (cached && cached.length > 0) {
          setChapters(cached);
          const startPage = data.progress?.currentPage ?? 0;
          setCurrentChapter(Math.min(startPage, cached.length - 1));
        } else {
          setExtracting(true);
          const fileUrl = await getFileUrl(data.r2Key);
          const extracted = await extractText(fileUrl, data.fileType, (stage, value) =>
            setExtractStage({ stage, value })
          );
          setChapters(extracted);
          await cacheChapters(data.id, extracted);
          const startPage = data.progress?.currentPage ?? 0;
          setCurrentChapter(Math.min(startPage, extracted.length - 1));
        }

        if (!data.coverUrl && data.fileType === "pdf") {
          getFileUrl(data.r2Key).then((fileUrl) => extractPdfCover(fileUrl)).then((coverUrl) => {
            if (coverUrl) {
              setBook((prev) => (prev ? { ...prev, coverUrl } : prev));
              fetch(`/api/library/${data.id}/cover`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverUrl }),
              }).catch(() => {});
            }
          });
        }
      } catch {
        setError("Failed to load book");
      } finally {
        setLoading(false);
        setExtracting(false);
      }
    }
    load();
  }, [id]);

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
        putCachedAudio(c.bookId, c.chapterIdx, c.voice, c.speed, c.blobs, c.sentences)
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
    tts.generate(chapter.text, `${book.id}-ch${currentChapter}`);
  }, [book, chapters, currentChapter, tts, player]);

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
            await putCachedAudio(book.id, i, tts.voice, tts.speed, blobs, sents);
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
      tts.generate(fromText, `${book.id}-ch${currentChapter}-s${sentenceIdx}`);
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

  if (error || !book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-destructive font-medium mb-4">{error || "Book not found"}</p>
        <button onClick={() => router.push("/library")} className="text-primary text-sm font-semibold">
          Back to Library
        </button>
      </div>
    );
  }

  const chapter = chapters[currentChapter];
  const sentences = chapter ? chapter.text.replace(/([.!?])\s+/g, "$1|SPLIT|").split("|SPLIT|") : [];

  return (
    <div className={cn("flex flex-col h-[calc(100dvh-5rem)] lg:h-dvh relative overflow-hidden", themeStyle.bg)}>
      
      {/* ─── Top Header ─── */}
      <div className="flex items-center justify-between px-4 py-4 z-10 shrink-0">
        <button onClick={() => router.push("/library")} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition backdrop-blur-sm">
          <ArrowLeft size={20} className={themeStyle.text} />
        </button>

        <BottomSheet>
          <BottomSheetTrigger>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition backdrop-blur-sm">
              <MoreHorizontal size={20} className={themeStyle.text} />
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
                <button className="flex flex-col items-center gap-2 p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                  <Search size={24} className="text-white/80" />
                  <span className="text-xs font-semibold">Search</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                  <MessageSquare size={24} className="text-white/80" />
                  <span className="text-xs font-semibold">Voice Chat</span>
                </button>
                <button onClick={() => setSleepTimer(15)} className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl transition", sleepTimer > 0 ? "bg-primary text-primary-foreground" : "bg-white/5 hover:bg-white/10")}>
                  <Timer size={24} className={sleepTimer > 0 ? "scale-110" : "text-white/80"} />
                  <span className="text-xs font-semibold">Sleep timer</span>
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
                <button className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition w-full text-left">
                  <List size={20} className="text-white/60" />
                  <span className="text-sm font-semibold">Pronunciations</span>
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
            <VoiceSelector selectedVoice={tts.voice} ttsStatus={tts.status} onSelect={(v) => tts.changeVoice(v)} onSample={(v) => tts.playSample(v)} onSampleReady={tts.onSample} />
            <div className="mt-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Speed — <span className="text-primary">{tts.speed.toFixed(2)}×</span></label>
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
        className="flex-1 overflow-y-auto px-6 sm:px-12 py-6 relative outline-none pb-[280px]"
        onClick={() => panel && setPanel(null)}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-muted-foreground text-sm font-medium mb-8">
            {new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric'})}
          </p>

          {extracting ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                {extractStage ? `Extracting text… ${extractStage.value}%` : "Extracting text…"}
              </p>
            </div>
          ) : chapter ? (
            <article>
              <h1 className={cn("text-4xl sm:text-5xl font-bold mb-10 text-balance", themeStyle.text)}>
                {chapter.title}
              </h1>
              <div style={{ fontSize: `${fontSize}px`, lineHeight, fontFamily }}>
                {sentences.map((sentence, sIdx) => {
                  const isActiveSentence = sIdx === currentSentence;
                  if (isActiveSentence && currentWord >= 0) {
                    const words = sentence.split(/(\s+)/);
                    let wordCounter = -1;
                    return (
                      <span key={sIdx} data-sentence={sIdx} onClick={(e) => { e.stopPropagation(); handleSentenceClick(sIdx); }} className={cn("cursor-pointer rounded transition-colors duration-200", isActiveSentence ? "bg-primary/20 xl:bg-primary/10" : "", themeStyle.text)}>
                        {words.map((part, pIdx) => {
                          const isSpace = /^\s+$/.test(part);
                          if (!isSpace) wordCounter++;
                          const isActiveWord = !isSpace && wordCounter === currentWord;
                          return (
                            <span key={pIdx} className={cn("transition-colors duration-150", isActiveWord ? "bg-primary text-primary-foreground rounded-sm px-0.5 py-0.5" : wordCounter <= currentWord && !isSpace ? "opacity-70" : "")}>{part}</span>
                          );
                        })}{" "}
                      </span>
                    );
                  }
                  return (
                    <span key={sIdx} data-sentence={sIdx} onClick={(e) => { e.stopPropagation(); handleSentenceClick(sIdx); }} className={cn("transition-colors duration-200 cursor-pointer hover:bg-primary/10 rounded", isActiveSentence ? "bg-[#273a21] text-white rounded px-0.5" : "", themeStyle.text)}>
                      {sentence}{" "}
                    </span>
                  );
                })}
              </div>
            </article>
          ) : (
            <p className="text-muted-foreground py-20">No content to display</p>
          )}
        </div>
      </div>

      {/* ─── Bottom controls ─── */}
      <div className={cn(
        "shrink-0 border-t backdrop-blur-sm z-30",
        theme === "dark" ? "border-white/10 bg-[#1a1a2e]/95" : theme === "sepia" ? "border-[#d4c5a9] bg-[#f4ecd8]/95" : "border-border/50 bg-white/95"
      )}>
        <div className="flex items-center justify-between px-4 py-2.5 max-w-2xl mx-auto">
          {/* Left: chapter nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => goChapter(-1)}
              disabled={currentChapter === 0}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <SkipBack size={18} />
            </button>
          </div>

          {/* Center: play + info */}
          <div className="flex items-center gap-3">
            <span className={cn("text-xs font-medium", themeStyle.text)}>
              {currentChapter + 1} / {chapters.length}
            </span>
            <button
              onClick={handlePlay}
              disabled={tts.status === "loading" || !chapter}
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {tts.status === "loading" ? (
                <Loader2 size={22} className="animate-spin" />
              ) : player.playing ? (
                <Pause size={22} />
              ) : (
                <Play size={22} className="ml-0.5" />
              )}
            </button>
            <span className="text-xs text-muted-foreground font-medium">
              {tts.speed}×
            </span>
          </div>

          {/* Right: next chapter + bookmarks */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => togglePanel("bookmarks")}
              className={cn(
                "p-2 rounded-xl transition",
                panel === "bookmarks" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bookmark size={18} />
            </button>
            <button
              onClick={() => goChapter(1)}
              disabled={currentChapter === chapters.length - 1}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
