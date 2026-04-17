"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type ReaderTheme = "light" | "dark" | "sepia";

interface SpeedControlProps {
  theme: ReaderTheme;
  themeText: string;
  speed: number;
  onChange: (next: number) => void;
  onSaveAsDefault?: () => void;
}

const PRESETS = [0.8, 1.0, 1.2, 1.5, 2.0];
const MIN = 0.5;
const MAX = 2.0;
const STEP = 0.05;
const AUTO_KEY = "voca:reader:autoSpeedIncrease";

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, Math.round(n / STEP) * STEP));

export function SpeedControl({ theme, themeText, speed, onChange, onSaveAsDefault }: SpeedControlProps) {
  const [autoIncrease, setAutoIncrease] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { setAutoIncrease(localStorage.getItem(AUTO_KEY) === "1"); } catch { /* ignore */ }
  }, []);

  function toggleAuto() {
    const next = !autoIncrease;
    setAutoIncrease(next);
    try { localStorage.setItem(AUTO_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  const ratio = (speed - MIN) / (MAX - MIN);
  const fillHeight = `${ratio * 100}%`;

  const trackBg = theme === "dark" ? "bg-white/10" : theme === "sepia" ? "bg-[#5b4636]/15" : "bg-foreground/10";

  return (
    <div className="space-y-5">
      {/* Big readout + ± pill */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onChange(clamp(speed - STEP))}
          disabled={speed <= MIN}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30",
            theme === "dark" ? "bg-white/8 text-white" : "bg-foreground/8 text-foreground"
          )}
          aria-label="Slower"
        >
          <Minus size={18} />
        </button>
        <div className={cn("min-w-[110px] text-center text-3xl font-black tabular-nums", themeText)}>
          {speed.toFixed(2)}<span className="text-lg opacity-60">×</span>
        </div>
        <button
          onClick={() => onChange(clamp(speed + STEP))}
          disabled={speed >= MAX}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30",
            theme === "dark" ? "bg-white/8 text-white" : "bg-foreground/8 text-foreground"
          )}
          aria-label="Faster"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Vertical slider */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="flex flex-col justify-between h-[180px] text-[10px] font-mono opacity-50">
          <span className={themeText}>{MAX.toFixed(1)}×</span>
          <span className={themeText}>1.0×</span>
          <span className={themeText}>{MIN.toFixed(1)}×</span>
        </div>
        <div
          className={cn("relative h-[180px] w-3 rounded-full overflow-hidden cursor-pointer", trackBg)}
          onPointerDown={(e) => {
            const target = e.currentTarget;
            target.setPointerCapture(e.pointerId);
            const rect = target.getBoundingClientRect();
            const move = (clientY: number) => {
              const r = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
              onChange(clamp(MIN + r * (MAX - MIN)));
            };
            move(e.clientY);
            const onMove = (ev: PointerEvent) => move(ev.clientY);
            const onUp = (ev: PointerEvent) => {
              target.releasePointerCapture(ev.pointerId);
              target.removeEventListener("pointermove", onMove);
              target.removeEventListener("pointerup", onUp);
            };
            target.addEventListener("pointermove", onMove);
            target.addEventListener("pointerup", onUp);
          }}
        >
          <div className="absolute left-0 right-0 bottom-0 bg-primary rounded-full" style={{ height: fillHeight }} />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary shadow-lg border-2 border-background"
            style={{ bottom: `calc(${fillHeight} - 10px)` }}
          />
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((p) => {
          const active = Math.abs(speed - p) < 0.01;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold tabular-nums transition active:scale-95",
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : theme === "dark"
                    ? "bg-white/8 text-white/80 hover:bg-white/12"
                    : "bg-foreground/8 text-foreground hover:bg-foreground/12"
              )}
            >
              {p.toFixed(p % 1 === 0 ? 0 : p === 1.5 || p === 0.8 || p === 1.2 ? 1 : 2)}×
            </button>
          );
        })}
      </div>

      {/* Auto-increase toggle */}
      <button
        onClick={toggleAuto}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl transition",
          theme === "dark" ? "bg-white/5 hover:bg-white/8" : "bg-muted hover:bg-muted/70"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            autoIncrease ? "bg-primary text-primary-foreground" : "bg-muted-foreground/15 text-muted-foreground"
          )}>
            <Zap size={14} />
          </div>
          <div className="text-left min-w-0">
            <div className={cn("text-[13px] font-semibold", themeText)}>Increase speed automatically</div>
            <div className={cn("text-[11px] opacity-60", themeText)}>+0.05× per 500 words played</div>
          </div>
        </div>
        <div className={cn(
          "w-9 h-5 rounded-full relative transition shrink-0",
          autoIncrease ? "bg-primary" : "bg-muted-foreground/30"
        )}>
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: autoIncrease ? "calc(100% - 18px)" : "2px" }}
          />
        </div>
      </button>

      {onSaveAsDefault && (
        <button
          onClick={onSaveAsDefault}
          className="w-full text-center text-[11px] font-bold uppercase tracking-wider text-primary hover:underline py-1"
        >
          Save as default
        </button>
      )}
    </div>
  );
}
