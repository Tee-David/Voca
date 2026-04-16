"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Settings2,
  Loader2, Minus, Plus, Play, Pause, Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicUrl } from "@/lib/r2-client";
import { extractText, type Chapter } from "@/lib/extract";
import { useKokoro, type VoiceId } from "@/hooks/useKokoro";
import { usePlayer } from "@/hooks/usePlayer";
import { VoiceSelector } from "@/components/reader/VoiceSelector";
import { cn } from "@/lib/utils";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  r2Key: string;
  coverColor: string | null;
  progress: { currentPage: number; percentComplete: number } | null;
};

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const contentRef = useRef<HTMLDivElement>(null);

  const tts = useKokoro();
  const player = usePlayer();

  const saveProgress = useCallback(
    async (page: number, total: number) => {
      if (!id) return;
      const percent = total > 0 ? Math.round((page / total) * 100) : 0;
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

        setExtracting(true);
        const url = getPublicUrl(data.r2Key);
        const extracted = await extractText(url, data.fileType);
        setChapters(extracted);

        const startPage = data.progress?.currentPage ?? 0;
        setCurrentChapter(Math.min(startPage, extracted.length - 1));
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

  // Wire TTS audio chunks to player
  useEffect(() => {
    tts.onChunk((chunk) => {
      player.enqueueChunk(chunk.audio);
      setCurrentSentence(chunk.index);
    });
    tts.onDone(() => {
      setCurrentSentence(-1);
    });
  }, []);

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
    <div className="flex flex-col h-[calc(100dvh-5rem)] lg:h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm shrink-0">
        <button onClick={() => router.push("/library")} className="p-1.5 text-muted-foreground hover:text-foreground transition">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center min-w-0 flex-1 px-4">
          <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
          {chapter && <p className="text-xs text-muted-foreground truncate">{chapter.title}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowVoice(!showVoice); setShowChapters(false); setShowSettings(false); }}
            className={cn("p-1.5 transition rounded-lg", showVoice ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Volume2 size={20} />
          </button>
          <button
            onClick={() => { setShowChapters(!showChapters); setShowSettings(false); setShowVoice(false); }}
            className={cn("p-1.5 transition rounded-lg", showChapters ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowChapters(false); setShowVoice(false); }}
            className={cn("p-1.5 transition rounded-lg", showSettings ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="relative flex-1 overflow-hidden">
        {/* Voice selector */}
        <AnimatePresence>
          {showVoice && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0 z-20 bg-background overflow-y-auto p-4"
            >
              <VoiceSelector
                selectedVoice={tts.voice}
                ttsStatus={tts.status}
                onSelect={(v) => tts.changeVoice(v)}
                onSample={(v) => tts.playSample(v)}
                onSampleReady={tts.onSample}
              />

              {/* Speed control */}
              <div className="mt-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Speed
                </label>
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

              {/* TTS status */}
              <div className="mt-4 text-xs text-muted-foreground">
                {tts.status === "idle" && "Tap play to load TTS model"}
                {tts.status === "loading" && "Loading TTS model (~50MB)…"}
                {tts.status === "ready" && "TTS ready"}
                {tts.status === "generating" && "Generating audio…"}
                {tts.status === "error" && "TTS error — tap play to retry"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chapters */}
        <AnimatePresence>
          {showChapters && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0 z-20 bg-background overflow-y-auto"
            >
              <div className="p-4">
                <h3 className="font-bold text-foreground mb-3">Chapters</h3>
                <div className="space-y-1">
                  {chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentChapter(idx); setShowChapters(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-sm transition",
                        idx === currentChapter
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-muted-foreground text-xs mr-2">{idx + 1}</span>
                      {ch.title}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 z-20 bg-background border-t border-border rounded-t-2xl p-5"
            >
              <h3 className="font-bold text-foreground mb-4">Display Settings</h3>
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Font size
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="p-2 rounded-lg bg-muted text-foreground">
                    <Minus size={16} />
                  </button>
                  <span className="text-sm font-semibold w-10 text-center">{fontSize}</span>
                  <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="p-2 rounded-lg bg-muted text-foreground">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Line spacing
                </label>
                <div className="flex gap-2">
                  {[1.4, 1.6, 1.8, 2.0].map((lh) => (
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

        {/* Reading content */}
        <div
          ref={contentRef}
          className="h-full overflow-y-auto px-5 sm:px-8 lg:px-16 py-6"
          onClick={() => { setShowChapters(false); setShowSettings(false); setShowVoice(false); }}
        >
          {extracting ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Extracting text…</p>
            </div>
          ) : chapter ? (
            <article className="max-w-prose mx-auto">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                {chapter.title}
              </h2>
              <div style={{ fontSize: `${fontSize}px`, lineHeight }}>
                {sentences.map((sentence, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "transition-colors duration-200",
                      idx === currentSentence
                        ? "bg-primary/20 text-foreground rounded px-0.5"
                        : "text-foreground"
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

      {/* Bottom bar with nav + play */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-background/95 backdrop-blur-sm shrink-0">
        <button
          onClick={() => goChapter(-1)}
          disabled={currentChapter === 0}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Play button */}
        <button
          onClick={handlePlay}
          disabled={tts.status === "loading" || !chapter}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {tts.status === "loading" ? (
            <Loader2 size={20} className="animate-spin" />
          ) : player.playing ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {currentChapter + 1} / {chapters.length}
          </span>
          <button
            onClick={() => goChapter(1)}
            disabled={currentChapter === chapters.length - 1}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
