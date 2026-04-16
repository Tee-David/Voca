"use client";

import { Play, Pause, SkipForward, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MiniPlayerProps {
  playing: boolean;
  bookId: string | null;
  bookTitle: string | null;
  chapterTitle: string | null;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onStop: () => void;
}

export function MiniPlayer({
  playing,
  bookId,
  bookTitle,
  chapterTitle,
  currentTime,
  duration,
  onToggle,
  onStop,
}: MiniPlayerProps) {
  if (!bookId) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:bottom-0 lg:left-[72px] inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60">
      {/* Progress line */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Book info */}
        <Link href={`/reader/${bookId}`} className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {bookTitle || "Unknown"}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {chapterTitle || ""}
          </p>
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button
            onClick={onStop}
            className="p-2 text-muted-foreground hover:text-foreground transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
