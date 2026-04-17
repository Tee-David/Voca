"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  currentTime: number;
  duration: number;
  onSeek: (ratio: number) => void;
  formatTime: (s: number) => string;
  theme: "light" | "dark" | "sepia";
  bars?: number;
};

export function WaveformScrubber({
  currentTime,
  duration,
  onSeek,
  formatTime,
  theme,
  bars = 48,
}: Props) {
  const barHeights = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(Math.sin(i * 1.37) * 0.5 + Math.cos(i * 0.71) * 0.5 + Math.sin(i * 0.29) * 0.3);
      out.push(0.25 + (v % 1) * 0.75);
    }
    return out;
  }, [bars]);

  const ratio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const trackRef = useRef<HTMLDivElement>(null);

  function seekAt(clientX: number) {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(r);
  }

  const playedBg =
    theme === "dark" ? "bg-white" : theme === "sepia" ? "bg-[#5b4636]" : "bg-foreground";
  const upcomingBg =
    theme === "dark" ? "bg-white/25" : theme === "sepia" ? "bg-[#5b4636]/30" : "bg-foreground/25";

  return (
    <div>
      <div
        ref={trackRef}
        onClick={(e) => seekAt(e.clientX)}
        onTouchStart={(e) => seekAt(e.touches[0].clientX)}
        className="flex items-center justify-between gap-[2px] h-10 cursor-pointer select-none touch-none"
      >
        {barHeights.map((h, i) => {
          const pct = (i + 0.5) / bars;
          const played = pct <= ratio;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full transition-colors",
                played ? playedBg : upcomingBg
              )}
              style={{ height: `${h * 100}%` }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <span className={cn("text-[11px] font-semibold tabular-nums", theme === "dark" ? "text-white/70" : "text-foreground/70")}>
          {formatTime(currentTime)}
        </span>
        <span className={cn("text-[11px] font-semibold tabular-nums", theme === "dark" ? "text-white/70" : "text-foreground/70")}>
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
