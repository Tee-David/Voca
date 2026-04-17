"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2, RotateCcw, RotateCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ReaderTheme = "light" | "dark" | "sepia";

interface PlayerPillProps {
  theme: ReaderTheme;
  themeText: string;
  playing: boolean;
  loading: boolean;
  hasChapter: boolean;
  speed: number;
  currentTime: number;
  duration: number;
  chapterLabel: string;
  coverUrl?: string | null;
  autoHide?: boolean;
  onPlay: () => void;
  onSeekRelative: (delta: number) => void;
  onSpeedCycle: () => void;
  onChapterChevron: () => void;
  onTimelineSeek: (ratio: number) => void;
  formatTime: (s: number) => string;
}

const tinyVibrate = () => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
};

export function PlayerPill({
  theme,
  themeText,
  playing,
  loading,
  hasChapter,
  speed,
  currentTime,
  duration,
  chapterLabel,
  coverUrl,
  autoHide = true,
  onPlay,
  onSeekRelative,
  onSpeedCycle,
  onChapterChevron,
  onTimelineSeek,
  formatTime,
}: PlayerPillProps) {
  const [hidden, setHidden] = useState(false);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wake = () => {
    setHidden(false);
    if (idleRef.current) clearTimeout(idleRef.current);
    if (!autoHide || !playing) return;
    idleRef.current = setTimeout(() => setHidden(true), 3000);
  };

  useEffect(() => {
    wake();
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [playing, autoHide]);

  useEffect(() => {
    if (!autoHide) { setHidden(false); return; }
    const onAny = () => wake();
    window.addEventListener("pointermove", onAny, { passive: true });
    window.addEventListener("touchstart", onAny, { passive: true });
    window.addEventListener("keydown", onAny);
    return () => {
      window.removeEventListener("pointermove", onAny);
      window.removeEventListener("touchstart", onAny);
      window.removeEventListener("keydown", onAny);
    };
  }, [autoHide, playing]);

  const ratio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const trackBg = theme === "dark" ? "bg-white/10" : theme === "sepia" ? "bg-[#5b4636]/15" : "bg-foreground/10";

  return (
    <div
      className={cn(
        "fixed z-30 left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none",
        // bottom positioning respects mobile bottom-nav (5rem) + safe area
        "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-5",
        hidden ? "translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"
      )}
      onPointerDown={() => wake()}
    >
      <div
        className={cn(
          "pointer-events-auto float-card w-[min(94vw,560px)] px-4 pt-2.5 pb-3",
          theme === "dark"
            ? "bg-[#1f1f2e]/95 border border-white/5"
            : theme === "sepia"
              ? "bg-[#eedfc4]/95 border border-[#d4c5a9]/60"
              : "bg-card/95 border border-border/50"
        )}
        style={{ animation: "voca-pop-in 220ms var(--ease-pop) both" }}
      >
        {/* Chapter chevron row */}
        <button
          onClick={() => { tinyVibrate(); onChapterChevron(); }}
          className={cn(
            "mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5 hover:opacity-80 transition",
            themeText
          )}
        >
          <span className="truncate max-w-[260px]">{chapterLabel}</span>
          <ChevronDown size={12} className="opacity-60" />
        </button>

        {/* Compact timeline */}
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("text-[10px] font-mono tabular-nums opacity-60", themeText)}>
            {formatTime(currentTime)}
          </span>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const r = (e.clientX - rect.left) / rect.width;
              onTimelineSeek(Math.max(0, Math.min(1, r)));
              tinyVibrate();
            }}
            className={cn("flex-1 h-1 rounded-full relative overflow-hidden", trackBg)}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${ratio * 100}%` }}
            />
          </button>
          <span className={cn("text-[10px] font-mono tabular-nums opacity-60", themeText)}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Control row: avatar · ⟲10 · ●play● · ⟳10 · speed */}
        <div className="flex items-center justify-between">
          <div
            className="w-9 h-12 rounded-md overflow-hidden bg-muted shrink-0 shadow-sm border border-border/40"
            aria-hidden
          >
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
            )}
          </div>

          <button
            onClick={() => { tinyVibrate(); onSeekRelative(-10); }}
            disabled={!duration}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition disabled:opacity-30 active:scale-95",
              theme === "dark" ? "text-white/85 hover:bg-white/5" : "text-foreground/85 hover:bg-foreground/5"
            )}
            title="Back 10s"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw size={22} strokeWidth={2} />
              <span className="absolute text-[8px] font-black">10</span>
            </div>
          </button>

          <button
            onClick={() => { tinyVibrate(); onPlay(); }}
            disabled={loading || !hasChapter}
            className={cn(
              "w-[58px] h-[58px] rounded-full flex items-center justify-center transition shadow-xl disabled:opacity-50",
              "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
            )}
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : playing ? (
              <Pause size={24} strokeWidth={2.5} />
            ) : (
              <Play size={24} strokeWidth={2.5} className="ml-0.5" />
            )}
          </button>

          <button
            onClick={() => { tinyVibrate(); onSeekRelative(10); }}
            disabled={!duration}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition disabled:opacity-30 active:scale-95",
              theme === "dark" ? "text-white/85 hover:bg-white/5" : "text-foreground/85 hover:bg-foreground/5"
            )}
            title="Forward 10s"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw size={22} strokeWidth={2} />
              <span className="absolute text-[8px] font-black">10</span>
            </div>
          </button>

          <button
            onClick={() => { tinyVibrate(); onSpeedCycle(); }}
            className={cn(
              "min-w-[44px] h-11 rounded-full px-2 flex items-center justify-center text-[13px] font-black tabular-nums transition active:scale-95",
              theme === "dark" ? "text-white/85 hover:bg-white/5" : "text-foreground/85 hover:bg-foreground/5"
            )}
            title="Playback speed"
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  );
}
