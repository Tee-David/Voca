"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Settings2,
  Loader2, Minus, Plus, Play, Pause, Volume2, Bookmark,
  BookmarkCheck, Moon, Sun, Type, Download, Timer, X,
  SkipBack, SkipForward, Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractText, extractPdfCover, type Chapter } from "@/lib/extract";
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
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tts = useKokoro();
  const player = usePlayer();

  const togglePanel = (p: Panel) => setPanel((prev) => (prev === p ? null : p));

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

        setExtracting(true);
        const url = `/api/files/${data.r2Key}`;
        const extracted = await extractText(url, data.fileType);
        setChapters(extracted);

        const startPage = data.progress?.currentPage ?? 0;
        setCurrentChapter(Math.min(startPage, extracted.length - 1));

        if (!data.coverUrl && data.fileType === "pdf") {
          extractPdfCover(url).then((coverUrl) => {
            if (coverUrl) {
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

  useEffect(() => {
    tts.onChunk((chunk) => {
      player.enqueueChunk(chunk.audio);
      setCurrentSentence(chunk.index);
    });
    tts.onDone(() => {
      setCurrentSentence(-1);
    });
  }, []);

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
  }

  function handlePlay() {
    const chapter = chapters[currentChapter];
    if (!chapter || !book) return;

    if (player.playing) {
      player.pause();
      return;
    }

    if (tts.status === "idle" || tts.status === "error") {
      tts.initWorker();
      return;
    }

    if (tts.status === "ready") {
      player.resetQueue();
      player.setMeta(book.id, book.title, chapter.title);
      tts.generate(chapter.text, `${book.id}-ch${currentChapter}`);
    } else {
      player.play();
    }
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
    <div className={cn("flex flex-col h-[calc(100dvh-5rem)] lg:h-dvh", themeStyle.bg)}>
      {/* ─── Top bar ─── */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2.5 border-b shrink-0 backdrop-blur-sm",
        theme === "dark" ? "border-white/10 bg-[#1a1a2e]/95" : theme === "sepia" ? "border-[#d4c5a9] bg-[#f4ecd8]/95" : "border-border/50 bg-white/95"
      )}>
        <button onClick={() => router.push("/library")} className="p-1.5 text-muted-foreground hover:text-foreground transition">
          <ArrowLeft size={20} />
        </button>

        <div className="text-center min-w-0 flex-1 px-4">
          <p className={cn("text-sm font-semibold truncate", themeStyle.text)}>{book.title}</p>
          {chapter && <p className="text-xs text-muted-foreground truncate">{chapter.title}</p>}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Bookmark toggle */}
          <button
            onClick={currentPageBookmarked ? () => {
              const bm = bookmarks.find((b) => b.page === currentChapter);
              if (bm) removeBookmark(bm.id);
            } : addBookmark}
            className={cn(
              "p-1.5 transition rounded-lg",
              currentPageBookmarked ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {currentPageBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <button
            onClick={() => togglePanel("voice")}
            className={cn("p-1.5 transition rounded-lg", panel === "voice" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Volume2 size={18} />
          </button>
          <button
            onClick={() => togglePanel("chapters")}
            className={cn("p-1.5 transition rounded-lg", panel === "chapters" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => togglePanel("settings")}
            className={cn("p-1.5 transition rounded-lg", panel === "settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Settings2 size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-lg hidden lg:block"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      <div className="h-0.5 bg-muted shrink-0">
        <div className="h-full bg-primary transition-all" style={{ width: `${chapterProgress}%` }} />
      </div>

      {/* ─── Main content area ─── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Voice selector panel */}
        <AnimatePresence>
          {panel === "voice" && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn("absolute inset-0 z-20 overflow-y-auto p-4", themeStyle.bg)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn("font-bold", themeStyle.text)}>Voice & Speed</h3>
                <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <VoiceSelector
                selectedVoice={tts.voice}
                ttsStatus={tts.status}
                onSelect={(v) => tts.changeVoice(v)}
                onSample={(v) => tts.playSample(v)}
                onSampleReady={tts.onSample}
              />

              <div className="mt-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Speed</label>
                <div className="flex gap-2 flex-wrap">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => tts.changeSpeed(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                        tts.speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep timer */}
              <div className="mt-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  <Timer size={12} className="inline mr-1" />
                  Sleep Timer
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 5, 10, 15, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSleepTimer(m)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                        sleepTimer === m ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {m === 0 ? "Off" : `${m}m`}
                    </button>
                  ))}
                </div>
                {sleepRemaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Auto-pause in {Math.floor(sleepRemaining / 60)}:{String(sleepRemaining % 60).padStart(2, "0")}
                  </p>
                )}
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                {tts.status === "idle" && "Tap play to load TTS model"}
                {tts.status === "loading" && "Loading TTS model (~50MB)…"}
                {tts.status === "ready" && "✓ TTS ready"}
                {tts.status === "generating" && "Generating audio…"}
                {tts.status === "error" && "TTS error — tap play to retry"}
              </div>

              {/* Audiobook export */}
              {book && chapters.length > 0 && (
                <AudiobookExport
                  bookId={book.id}
                  bookTitle={book.title}
                  chapters={chapters}
                  voice={tts.voice}
                  speed={tts.speed}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chapters panel */}
        <AnimatePresence>
          {panel === "chapters" && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn("absolute inset-0 z-20 overflow-y-auto", themeStyle.bg)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={cn("font-bold", themeStyle.text)}>Chapters</h3>
                  <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-1">
                  {chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentChapter(idx); setPanel(null); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-sm transition flex items-center gap-2",
                        idx === currentChapter
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-muted-foreground text-xs w-6 shrink-0">{idx + 1}</span>
                      <span className={cn("truncate", idx === currentChapter ? "text-primary" : themeStyle.text)}>
                        {ch.title}
                      </span>
                      {bookmarks.some((b) => b.page === idx) && (
                        <BookmarkCheck size={12} className="text-amber-500 shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display settings panel */}
        <AnimatePresence>
          {panel === "settings" && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "absolute bottom-0 inset-x-0 z-20 border-t rounded-t-2xl p-5",
                theme === "dark" ? "bg-[#1a1a2e] border-white/10" : theme === "sepia" ? "bg-[#f4ecd8] border-[#d4c5a9]" : "bg-white border-border"
              )}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={cn("font-bold", themeStyle.text)}>Display Settings</h3>
                <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              {/* Theme */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Theme</label>
                <div className="flex gap-2">
                  {(Object.entries(THEME_STYLES) as [ReaderTheme, typeof THEME_STYLES["light"]][]).map(([key, style]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border",
                        theme === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-foreground"
                      )}
                    >
                      <style.icon size={14} />
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Font</label>
                <div className="flex gap-2">
                  {FONT_FAMILIES.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setFontFamily(f.value)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-semibold transition",
                        fontFamily === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                      style={{ fontFamily: f.value }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Size</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="p-2 rounded-lg bg-muted text-foreground">
                    <Minus size={16} />
                  </button>
                  <div className="flex-1 h-1.5 rounded-full bg-muted relative">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${((fontSize - 12) / 16) * 100}%` }} />
                  </div>
                  <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="p-2 rounded-lg bg-muted text-foreground">
                    <Plus size={16} />
                  </button>
                  <span className="text-xs font-semibold w-8 text-center text-muted-foreground">{fontSize}</span>
                </div>
              </div>

              {/* Line spacing */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Line Spacing</label>
                <div className="flex gap-2">
                  {[1.4, 1.6, 1.8, 2.0, 2.2].map((lh) => (
                    <button
                      key={lh}
                      onClick={() => setLineHeight(lh)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                        lineHeight === lh ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {lh}×
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bookmarks panel */}
        <AnimatePresence>
          {panel === "bookmarks" && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn("absolute inset-0 z-20 overflow-y-auto p-4", themeStyle.bg)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn("font-bold", themeStyle.text)}>
                  Bookmarks ({bookmarks.length})
                </h3>
                <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No bookmarks yet. Tap the bookmark icon to save your place.
                </p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => { setCurrentChapter(bm.page); setPanel(null); }}
                      className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-primary">
                          Chapter {bm.page + 1}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeBookmark(bm.id); }}
                          className="text-muted-foreground hover:text-destructive p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className={cn("text-xs line-clamp-2", themeStyle.text)}>{bm.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Reading content ─── */}
        <div
          ref={contentRef}
          className="h-full overflow-y-auto px-5 sm:px-8 lg:px-16 py-6"
          onClick={() => panel && setPanel(null)}
        >
          {extracting ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Extracting text…</p>
            </div>
          ) : chapter ? (
            <article className="max-w-prose mx-auto">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
                {chapter.title}
              </h2>
              <div style={{ fontSize: `${fontSize}px`, lineHeight, fontFamily }}>
                {sentences.map((sentence, idx) => (
                  <span
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); handleSentenceClick(idx); }}
                    className={cn(
                      "transition-colors duration-200 cursor-pointer hover:bg-primary/10 rounded",
                      idx === currentSentence
                        ? "bg-primary/20 rounded px-0.5"
                        : "",
                      themeStyle.text
                    )}
                  >
                    {sentence}{" "}
                  </span>
                ))}
              </div>
            </article>
          ) : (
            <p className="text-center text-muted-foreground py-20">No content to display</p>
          )}
        </div>
      </div>

      {/* ─── Bottom controls ─── */}
      <div className={cn(
        "shrink-0 border-t backdrop-blur-sm",
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
