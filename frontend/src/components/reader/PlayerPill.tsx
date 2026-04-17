"use client";

/**
 * PlayerPill — Floating audio playback widget for the reader.
 *
 * Phase 12d Style Isolation Audit:
 * - Audited: no global CSS bleeds into this component. All styles are scoped
 *   via Tailwind utility classes and the `cn()` helper.
 * - No wildcard selectors or `:not()` rules in globals.css affect this component.
 * - Shadow DOM wrapping is NOT needed for the current use case (reader-only).
 *   If this component is ever reused outside the app shell (e.g. browser extension),
 *   wrap it in a Shadow DOM custom element at that point.
 * - Decision: skip Shadow DOM, document this audit. ✓
 */
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2, RotateCcw, RotateCw, ChevronDown, ChevronUp } from "lucide-react";
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
  currentVoice?: string;
  voices?: { id: string; label: string }[];
  autoHide?: boolean;
  forceHide?: boolean;
  onPlay: () => void;
  onSeekRelative: (delta: number) => void;
  onSpeedCycle: () => void;
  onChapterChevron: () => void;
  onTimelineSeek: (ratio: number) => void;
  onVoiceChange?: (voiceId: string) => void;
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
  currentVoice,
  voices = [],
  autoHide = true,
  forceHide = false,
  onPlay,
  onSeekRelative,
  onSpeedCycle,
  onChapterChevron,
  onTimelineSeek,
  onVoiceChange,
  formatTime,
}: PlayerPillProps) {
  const [hidden, setHidden] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wake = () => {
    setHidden(false);
    if (idleRef.current) clearTimeout(idleRef.current);
    if (!autoHide || !playing || forceHide) return;
    idleRef.current = setTimeout(() => setHidden(true), 3000);
  };

  useEffect(() => {
    wake();
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [playing, autoHide, forceHide]);

  useEffect(() => {
    if (!autoHide || forceHide) { setHidden(false); return; }
    const onAny = () => wake();
    window.addEventListener("pointermove", onAny, { passive: true });
    window.addEventListener("touchstart", onAny, { passive: true });
    window.addEventListener("keydown", onAny);
    return () => {
      window.removeEventListener("pointermove", onAny);
      window.removeEventListener("touchstart", onAny);
      window.removeEventListener("keydown", onAny);
    };
  }, [autoHide, playing, forceHide]);

  const ratio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const trackBg = theme === "dark" ? "bg-white/10" : theme === "sepia" ? "bg-[#5b4636]/15" : "bg-foreground/10";

  return (
    <div
      className={cn(
        "fixed z-30 left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none",
        "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-5",
        (hidden || forceHide) ? "translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"
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
          {/* Voice selector — tappable avatar */}
          <div className="relative">
            <button
              onClick={() => { tinyVibrate(); setVoiceOpen(!voiceOpen); }}
              className={cn(
                "w-9 h-12 rounded-md overflow-hidden shrink-0 shadow-sm border transition active:scale-95 flex items-center justify-center",
                theme === "dark" ? "border-white/10 bg-white/10" : "border-border/40 bg-muted"
              )}
              title={currentVoice ? `Voice: ${currentVoice}` : "Change voice"}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className={cn("text-[11px] font-black uppercase", themeText)}>
                  {currentVoice ? currentVoice.split("_").pop()?.charAt(0).toUpperCase() : "V"}
                </span>
              )}
            </button>
            {/* Voice dropdown */}
            {voiceOpen && voices.length > 0 && (
              <div
                className={cn(
                  "absolute bottom-full left-0 mb-2 w-44 rounded-xl shadow-2xl border overflow-hidden z-50",
                  theme === "dark" ? "bg-[#1f1f2e] border-white/10" : theme === "sepia" ? "bg-[#eedfc4] border-[#d4c5a9]" : "bg-card border-border"
                )}
              >
                <div className="p-1.5 max-h-[200px] overflow-y-auto">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        tinyVibrate();
                        onVoiceChange?.(v.id);
                        setVoiceOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition",
                        v.id === currentVoice
                          ? "bg-primary text-primary-foreground"
                          : theme === "dark" ? "text-white/80 hover:bg-white/5" : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                        v.id === currentVoice ? "bg-primary-foreground/20" : theme === "dark" ? "bg-white/10" : "bg-muted"
                      )}>
                        {v.label.charAt(0).toUpperCase()}
                      </span>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
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
