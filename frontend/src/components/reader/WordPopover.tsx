"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Mic, BookOpen, Copy, Bookmark, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ReaderTheme = "light" | "dark" | "sepia";

export interface WordPopoverProps {
  open: boolean;
  word: string;
  /** Sentence the word belongs to — used by "Hear it". */
  sentence: string;
  /** Page coords (clientX/clientY) of the tap. */
  anchor: { x: number; y: number } | null;
  theme: ReaderTheme;
  onClose: () => void;
  onHear: (text: string) => void;
  onFixPronunciation: (word: string) => void;
  onCopy: (text: string) => void;
  onHighlight: (snippet: string) => void;
}

type DefineState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; gloss: string; partOfSpeech?: string }
  | { status: "empty" }
  | { status: "error"; message: string };

export function WordPopover({
  open,
  word,
  sentence,
  anchor,
  theme,
  onClose,
  onHear,
  onFixPronunciation,
  onCopy,
  onHighlight,
}: WordPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [define, setDefine] = useState<DefineState>({ status: "idle" });
  const [pos, setPos] = useState<{ left: number; top: number; placeAbove: boolean } | null>(null);

  // Position the popover after mount so we can measure size.
  useEffect(() => {
    if (!open || !anchor) return;
    setDefine({ status: "idle" });
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = anchor.x - rect.width / 2;
      left = Math.max(margin, Math.min(vw - rect.width - margin, left));

      const placeAbove = anchor.y - rect.height - 14 > margin;
      const top = placeAbove ? anchor.y - rect.height - 12 : Math.min(anchor.y + 14, vh - rect.height - margin);

      setPos({ left, top, placeAbove });
    });
  }, [open, anchor]);

  // Outside click + scroll dismisses
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function handleDefine() {
    const w = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!w) { setDefine({ status: "empty" }); return; }
    setDefine({ status: "loading" });
    try {
      const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`);
      if (!res.ok) {
        setDefine({ status: "empty" });
        return;
      }
      const data = await res.json();
      const en = data?.en;
      if (!Array.isArray(en) || en.length === 0) { setDefine({ status: "empty" }); return; }
      const first = en.find((d) => Array.isArray(d?.definitions) && d.definitions.length > 0) ?? en[0];
      const rawGloss: string = first?.definitions?.[0]?.definition ?? "";
      const gloss = rawGloss.replace(/<[^>]+>/g, "").trim();
      if (!gloss) { setDefine({ status: "empty" }); return; }
      setDefine({ status: "ok", gloss, partOfSpeech: first?.partOfSpeech });
    } catch (err) {
      setDefine({ status: "error", message: err instanceof Error ? err.message : "Lookup failed" });
    }
  }

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Actions for ${word}`}
      style={{
        position: "fixed",
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        opacity: pos ? 1 : 0,
        transition: "opacity 120ms ease",
      }}
      className={cn(
        "z-[60] float-card max-w-[300px] min-w-[220px] p-2",
        theme === "dark"
          ? "bg-[#1f1f2e]/97 border border-white/10 text-white"
          : theme === "sepia"
            ? "bg-[#eedfc4]/98 border border-[#d4c5a9]/60 text-[#5b4636]"
            : "bg-card/98 border border-border/60 text-foreground"
      )}
    >
      {/* Word + close */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-2">
        <span className="text-sm font-bold truncate">{word}</span>
        <button onClick={onClose} className="p-0.5 opacity-50 hover:opacity-100" aria-label="Close">
          <X size={12} />
        </button>
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        <Action label="Hear" icon={<Volume2 size={15} />} onClick={() => { onHear(sentence || word); }} theme={theme} />
        <Action label="Fix" icon={<Mic size={15} />} onClick={() => { onFixPronunciation(word); onClose(); }} theme={theme} />
        <Action label="Define" icon={<BookOpen size={15} />} onClick={handleDefine} theme={theme} active={define.status !== "idle"} />
        <Action label="Copy" icon={<Copy size={15} />} onClick={() => { onCopy(word); }} theme={theme} />
        <Action label="Mark" icon={<Bookmark size={15} />} onClick={() => { onHighlight(sentence || word); onClose(); }} theme={theme} />
      </div>

      {/* Definition surface */}
      {define.status !== "idle" && (
        <div className="mt-1 px-2 py-2 rounded-xl bg-foreground/5 text-[12px] leading-snug">
          {define.status === "loading" && (
            <span className="flex items-center gap-1.5 opacity-70"><Loader2 size={12} className="animate-spin" /> Looking up…</span>
          )}
          {define.status === "ok" && (
            <>
              {define.partOfSpeech && (
                <span className="block text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">{define.partOfSpeech}</span>
              )}
              <span className="block">{define.gloss}</span>
            </>
          )}
          {define.status === "empty" && <span className="opacity-70">No definition found.</span>}
          {define.status === "error" && <span className="opacity-70">Couldn&apos;t reach Wiktionary.</span>}
        </div>
      )}
    </div>
  );
}

function Action({
  label, icon, onClick, theme, active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  theme: ReaderTheme;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition active:scale-95",
        active
          ? "bg-primary text-primary-foreground"
          : theme === "dark"
            ? "hover:bg-white/8 text-white/85"
            : "hover:bg-foreground/8 text-foreground/85"
      )}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
