"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones, Play, Pause, SkipBack, SkipForward,
  ChevronDown, ChevronUp, List, Loader2, BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  coverColor: string | null;
  coverUrl: string | null;
};

export default function PlayerPage() {
  const router = useRouter();
  const [lastBook, setLastBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChapters, setShowChapters] = useState(false);

  // Simulated playback state (will be replaced by real TTS hook)
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1.0);

  useEffect(() => {
    async function fetchLastBook() {
      try {
        const res = await fetch("/api/library?sort=opened");
        if (res.ok) {
          const books: Book[] = await res.json();
          if (books.length > 0) setLastBook(books[0]);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLastBook();
  }, []);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  function cycleSpeed() {
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!lastBook) {
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
      {/* Main player view */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">

        {/* Book cover */}
        <div className="w-56 h-72 sm:w-64 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 mb-8">
          {lastBook.coverUrl ? (
            <img src={lastBook.coverUrl} alt={lastBook.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-6"
              style={{ backgroundColor: lastBook.coverColor || "#534AB7" }}
            >
              <BookOpen size={48} className="text-white/70 mb-3" />
              <p className="text-white/90 text-sm font-bold text-center leading-tight line-clamp-3">
                {lastBook.title}
              </p>
              <span className="text-white/50 text-xs mt-2 uppercase font-semibold">
                {lastBook.fileType}
              </span>
            </div>
          )}
        </div>

        {/* Title + author */}
        <h2 className="text-xl font-bold text-foreground text-center mb-1">{lastBook.title}</h2>
        {lastBook.author && (
          <p className="text-sm text-muted-foreground text-center mb-1">{lastBook.author}</p>
        )}
        <p className="text-xs text-muted-foreground mb-6">Chapter 1 — Page 1</p>

        {/* Progress bar */}
        <div className="w-full max-w-sm mb-6">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">0:00</span>
            <span className="text-[10px] text-muted-foreground font-medium">--:--</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-6">
          <button className="p-2 text-muted-foreground hover:text-foreground transition">
            <SkipBack size={24} />
          </button>
          <button
            onClick={() => {
              setPlaying(!playing);
              if (!playing) router.push(`/reader/${lastBook.id}`);
            }}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition"
          >
            {playing ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground transition">
            <SkipForward size={24} />
          </button>
        </div>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="mt-4 px-3 py-1 rounded-full bg-muted text-xs font-bold text-foreground hover:bg-muted/70 transition"
        >
          {speed}×
        </button>
      </div>

      {/* Chapters toggle */}
      <div className="border-t border-border/50 bg-background">
        <button
          onClick={() => setShowChapters(!showChapters)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground"
        >
          <div className="flex items-center gap-2">
            <List size={16} />
            Chapters
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
              <div className="px-5 pb-4 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground py-3 text-center">
                  Open the book in the reader to see chapters
                </p>
                <Link
                  href={`/reader/${lastBook.id}`}
                  className="block text-center text-sm text-primary font-semibold py-2"
                >
                  Open in Reader →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
