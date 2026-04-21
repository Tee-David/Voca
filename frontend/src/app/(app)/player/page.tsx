"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Headphones, Play, Pause, SkipBack, SkipForward,
  ChevronDown, ChevronUp, List, Loader2, BookOpen, Volume2, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getCachedChapters, cacheChapters,
  getCachedAudio, putCachedAudio, hasCachedAudio,
  requestPersistentStorage,
} from "@/lib/bookCache";
import { compressAll } from "@/lib/audioCompress";
import { useKokoro } from "@/hooks/useKokoro";
import { usePlayer } from "@/hooks/usePlayer";
import { extractText, extractPdfCover, type Chapter } from "@/lib/extract";
import { getFileUrl } from "@/lib/fileUrl";
import { apiFetch } from "@/lib/api";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  r2Key: string;
  coverColor: string | null;
  coverUrl: string | null;
  progress?: { currentPage: number; percentComplete: number } | null;
};

type Preferences = {
  defaultVoice: string;
  defaultSpeed: number;
  defaultPitch: number;
};

const SPEED_TICKS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function PlayerPage() {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const initedRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenStartRef = useRef<number>(0);
  const genCollectorRef = useRef<{
    blobs: Blob[]; sentences: string[];
    bookId: string; chapterIdx: number; voice: string; speed: number;
  } | null>(null);
  const [cachedChaptersSet, setCachedChaptersSet] = useState<Set<number>>(new Set());

  const tts = useKokoro();
  const player = usePlayer();

  // Save listen progress to server
  const saveProgress = useCallback(
    (chapIdx: number, totalChapters: number) => {
      if (!book) return;
      const percent = totalChapters > 0 ? Math.round(((chapIdx + 1) / totalChapters) * 100) : 0;
      const elapsed = listenStartRef.current > 0 ? Math.round((Date.now() - listenStartRef.current) / 1000) : 0;
      apiFetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          currentPage: chapIdx,
          percentComplete: Math.min(percent, 100),
          totalTimeSec: elapsed > 0 ? elapsed : undefined,
        }),
      }).catch(() => {});
    },
    [book]
  );

  // Load: last opened book + prefs + cached chapters
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [libRes, prefRes] = await Promise.all([
          apiFetch("/api/library?sort=opened&limit=1"),
          apiFetch("/api/user/preferences"),
        ]);
        if (!libRes.ok) return;
        const books: Book[] = await libRes.json();
        if (!books.length || cancelled) return;
        const b = books[0];
        setBook(b);

        if (prefRes.ok) {
          const p: Preferences = await prefRes.json();
          setPrefs(p);
          setSpeed(p.defaultSpeed || 1.0);
        }

        const cached = await getCachedChapters(b.id);
        if (cached && cached.length > 0 && !cancelled) {
          setChapters(cached);
          const startPage = b.progress?.currentPage ?? 0;
          setChapterIdx(Math.min(startPage, cached.length - 1));
        } else if (!cancelled) {
          const fileUrl = await getFileUrl(b.r2Key);
          const extracted = await extractText(fileUrl, b.fileType);
          if (!cancelled && extracted.length > 0) {
            setChapters(extracted);
            await cacheChapters(b.id, extracted);
            const startPage = b.progress?.currentPage ?? 0;
            setChapterIdx(Math.min(startPage, extracted.length - 1));
          }
        }

        if (!b.coverUrl && b.fileType === "pdf") {
          getFileUrl(b.r2Key).then((fileUrl) => extractPdfCover(fileUrl)).then((coverUrl) => {
            if (coverUrl && !cancelled) {
              setBook((prev) => (prev ? { ...prev, coverUrl } : prev));
              apiFetch(`/api/library/${b.id}/cover`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverUrl }),
              }).catch(() => {});
            }
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Track listen start time
  useEffect(() => {
    if (player.playing && listenStartRef.current === 0) {
      listenStartRef.current = Date.now();
    }
  }, [player.playing]);

  // Save progress on chapter change
  useEffect(() => {
    if (book && chapters.length > 0) {
      saveProgress(chapterIdx, chapters.length);
    }
  }, [chapterIdx, book, chapters.length, saveProgress]);

  // Periodic progress save every 30s while playing
  useEffect(() => {
    if (player.playing && book && chapters.length > 0) {
      progressTimerRef.current = setInterval(() => {
        saveProgress(chapterIdx, chapters.length);
      }, 30000);
    }
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [player.playing, chapterIdx, book, chapters.length, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (book && chapters.length > 0) {
        saveProgress(chapterIdx, chapters.length);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire TTS audio chunks into player queue + write-through cache
  useEffect(() => {
    tts.onChunk((chunk) => {
      player.enqueueChunk(chunk.audio);
      if (genCollectorRef.current) {
        genCollectorRef.current.blobs.push(chunk.audio);
        genCollectorRef.current.sentences.push(chunk.sentence);
      }
    });
    tts.onDone(() => {
      setTtsLoading(false);
      const c = genCollectorRef.current;
      if (c && c.blobs.length > 0) {
        compressAll(c.blobs)
          .then((compressed) =>
            putCachedAudio(c.bookId, c.chapterIdx, c.voice, c.speed, compressed, c.sentences)
          )
          .then(() => setCachedChaptersSet((prev) => new Set(prev).add(c.chapterIdx)))
          .catch(() => {});
      }
      genCollectorRef.current = null;
    });
  }, [tts, player]);

  // Check which chapters already have cached audio for this voice+speed
  useEffect(() => {
    if (!book || chapters.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = new Set<number>();
      for (let i = 0; i < chapters.length; i++) {
        const has = await hasCachedAudio(book.id, i, tts.voice, speed);
        if (has) results.add(i);
      }
      if (!cancelled) setCachedChaptersSet(results);
    })();
    return () => { cancelled = true; };
  }, [book, chapters.length, tts.voice, speed]);

  // Auto-advance to next chapter when player queue finishes
  useEffect(() => {
    if (!player.playing && player.currentTime > 0 && chapters.length > 0 && !ttsLoading) {
      const next = chapterIdx + 1;
      if (next < chapters.length) {
        setChapterIdx(next);
        startChapter(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playing]);

  const chapter = chapters[chapterIdx];

  const startChapter = async (idx: number) => {
    const ch = chapters[idx];
    if (!ch || !book) return;

    requestPersistentStorage().catch(() => {});
    if (prefs?.defaultVoice) tts.changeVoice(prefs.defaultVoice as never);
    tts.changeSpeed(speed);

    player.resetQueue();
    player.setMeta(book.id, book.title, ch.title);

    const hit = await getCachedAudio(book.id, idx, tts.voice, speed);
    if (hit && hit.blobs.length > 0) {
      hit.blobs.forEach((blob) => player.enqueueChunk(blob));
      setTtsLoading(false);
      return;
    }

    if (!initedRef.current) {
      tts.initWorker();
      initedRef.current = true;
    }

    genCollectorRef.current = {
      blobs: [], sentences: [],
      bookId: book.id, chapterIdx: idx,
      voice: tts.voice, speed,
    };
    setTtsLoading(true);
    tts.generate({ text: ch.text.slice(0, 4000) }, `${book.id}-ch${idx}`);
  };

  const togglePlay = async () => {
    if (!chapter || !book) return;
    if (player.playing) {
      player.pause();
      return;
    }
    // Resume if we have audio, otherwise start fresh
    if (player.duration > 0) {
      player.play();
    } else {
      await startChapter(chapterIdx);
    }
  };

  const jumpChapter = async (idx: number) => {
    if (idx < 0 || idx >= chapters.length) return;
    player.stop();
    setChapterIdx(idx);
    await startChapter(idx);
    setShowChapters(false);
  };

  const onSpeedChange = (v: number) => {
    setSpeed(v);
    tts.changeSpeed(v);
  };

  const pct = player.duration > 0
    ? Math.min(100, (player.currentTime / player.duration) * 100)
    : 0;
  const timeFmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Headphones size={28} className="text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">Nothing playing</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Open a document from your library to start listening.
        </p>
        <Link
          href="/library"
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
        >
          Go to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">

        <div className="w-56 h-72 sm:w-64 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 mb-8 relative">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-6"
              style={{ backgroundColor: book.coverColor || "#534AB7" }}
            >
              <BookOpen size={48} className="text-white/70 mb-3" />
              <p className="text-white/90 text-sm font-bold text-center leading-tight line-clamp-3">
                {book.title}
              </p>
              <span className="text-white/50 text-xs mt-2 uppercase font-semibold">
                {book.fileType}
              </span>
            </div>
          )}
          {(ttsLoading || tts.status === "loading") && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-white" />
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground text-center mb-1 font-[var(--font-heading)]">
          {book.title}
        </h2>
        {book.author && (
          <p className="text-sm text-muted-foreground text-center mb-1">{book.author}</p>
        )}
        <p className="text-xs text-muted-foreground mb-6">
          {chapter ? chapter.title : chapters.length === 0 ? "Open in reader to load chapters" : `Chapter ${chapterIdx + 1}`}
        </p>

        <div className="w-full max-w-sm mb-4">
          <div
            className="h-1.5 rounded-full bg-muted overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!player.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              player.seek(ratio * player.duration);
            }}
          >
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">{timeFmt(player.currentTime)}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{timeFmt(player.duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-5">
          <button
            onClick={() => jumpChapter(chapterIdx - 1)}
            disabled={chapterIdx === 0 || chapters.length === 0}
            className="p-2 text-muted-foreground hover:text-foreground transition disabled:opacity-30"
          >
            <SkipBack size={24} />
          </button>
          <button
            onClick={togglePlay}
            disabled={chapters.length === 0}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition disabled:opacity-40"
          >
            {player.playing ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          <button
            onClick={() => jumpChapter(chapterIdx + 1)}
            disabled={chapterIdx >= chapters.length - 1 || chapters.length === 0}
            className="p-2 text-muted-foreground hover:text-foreground transition disabled:opacity-30"
          >
            <SkipForward size={24} />
          </button>
        </div>

        <SpeedSlider value={speed} onChange={onSpeedChange} />

        {chapters.length === 0 && (
          <Link
            href={`/reader/${book.id}`}
            className="mt-6 text-xs text-primary font-semibold hover:underline"
          >
            Open in Reader to load text →
          </Link>
        )}
      </div>

      <div className="border-t border-border/50 bg-background">
        <button
          onClick={() => setShowChapters(!showChapters)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground"
        >
          <div className="flex items-center gap-2">
            <List size={16} />
            Chapters {chapters.length > 0 && <span className="text-muted-foreground font-normal">({chapters.length})</span>}
          </div>
          {showChapters ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <AnimatePresence>
          {showChapters && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-4 space-y-0.5 max-h-64 overflow-y-auto">
                {chapters.length === 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground py-3 text-center">
                      Open the book in the reader to load chapters
                    </p>
                    <Link
                      href={`/reader/${book.id}`}
                      className="block text-center text-sm text-primary font-semibold py-2"
                    >
                      Open in Reader →
                    </Link>
                  </>
                ) : (
                  chapters.map((ch, i) => (
                    <button
                      key={i}
                      onClick={() => jumpChapter(i)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition",
                        i === chapterIdx
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="truncate pr-2">{i + 1}. {ch.title}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {cachedChaptersSet.has(i) && <Download size={12} className="text-primary/70" />}
                        {i === chapterIdx && player.playing && <Volume2 size={14} />}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SpeedSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="w-full max-w-xs flex flex-col items-center gap-2">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground tabular-nums font-[var(--font-heading)]">
          {value.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground font-semibold">×</span>
      </div>
      <div className="relative w-full">
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="voca-speed-range w-full"
        />
        <div className="flex justify-between mt-1 px-1">
          {SPEED_TICKS.map((t) => (
            <button
              key={t}
              onClick={() => onChange(t)}
              className={cn(
                "text-[10px] font-semibold tabular-nums transition",
                Math.abs(value - t) < 0.03
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-foreground"
              )}
            >
              {t}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
