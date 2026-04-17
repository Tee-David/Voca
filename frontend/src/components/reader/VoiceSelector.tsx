"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Loader2, Pin } from "lucide-react";
import { KOKORO_VOICES, type VoiceId, type TTSStatus } from "@/hooks/useKokoro";
import { cn } from "@/lib/utils";

interface VoiceSelectorProps {
  selectedVoice: VoiceId;
  defaultVoice?: VoiceId;
  ttsStatus: TTSStatus;
  onSelect: (voice: VoiceId) => void;
  onSetDefault?: (voice: VoiceId) => void;
  onSample: (voiceId: string) => void;
  onSampleReady: (cb: (voice: string, audio: Blob) => void) => void;
}

const FEATURED_IDS: VoiceId[] = ["af_bella", "am_adam", "bf_emma", "am_michael"];

const AVATAR_TINTS: Record<string, string> = {
  af_bella: "from-pink-300 to-rose-400",
  af_nicole: "from-rose-300 to-pink-500",
  af_sarah: "from-fuchsia-300 to-pink-400",
  af_sky: "from-sky-300 to-indigo-400",
  am_adam: "from-blue-300 to-indigo-500",
  am_michael: "from-emerald-300 to-teal-500",
  bf_emma: "from-violet-300 to-purple-500",
  bf_isabella: "from-amber-300 to-orange-500",
  bm_george: "from-slate-300 to-zinc-500",
};

export function VoiceSelector({
  selectedVoice,
  defaultVoice,
  ttsStatus,
  onSelect,
  onSetDefault,
  onSample,
  onSampleReady,
}: VoiceSelectorProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.addEventListener("ended", () => setPlayingVoice(null));
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    onSampleReady((voice: string, blob: Blob) => {
      setLoadingVoice(null);
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(blob);
        audioRef.current.play().catch(() => {});
        setPlayingVoice(voice);
      }
    });
  }, [onSampleReady]);

  function handleSample(voiceId: string) {
    if (playingVoice === voiceId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    if (ttsStatus !== "ready" && ttsStatus !== "generating") return;
    setLoadingVoice(voiceId);
    onSample(voiceId);
  }

  const featured = FEATURED_IDS
    .map((id) => KOKORO_VOICES.find((v) => v.id === id))
    .filter((v): v is (typeof KOKORO_VOICES)[number] => Boolean(v));
  const us = KOKORO_VOICES.filter((v) => v.accent === "American");
  const uk = KOKORO_VOICES.filter((v) => v.accent === "British");

  const renderTile = (v: (typeof KOKORO_VOICES)[number]) => {
    const selected = selectedVoice === v.id;
    const isDefault = defaultVoice === v.id;
    const isPlaying = playingVoice === v.id;
    const isLoading = loadingVoice === v.id;
    const tint = AVATAR_TINTS[v.id] ?? "from-slate-300 to-slate-500";

    return (
      <button
        key={v.id}
        onClick={() => onSelect(v.id)}
        className={cn(
          "group flex flex-col items-center gap-1.5 p-2 rounded-2xl transition active:scale-95",
          selected ? "bg-primary/10" : "hover:bg-muted/60"
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-lg font-bold text-white shadow",
              tint,
              selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {v.name[0]}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSample(v.id);
            }}
            disabled={ttsStatus === "loading" || ttsStatus === "idle"}
            aria-label={`Play sample of ${v.name}`}
            className={cn(
              "absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-md",
              "bg-background border border-border/60",
              isPlaying && "bg-primary border-primary text-primary-foreground",
              (ttsStatus === "loading" || ttsStatus === "idle") && "opacity-40"
            )}
          >
            {isLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={11} />
            ) : (
              <Play size={11} className="ml-[1px]" />
            )}
          </button>

          {isDefault && (
            <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
              <Pin size={10} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center min-w-0 w-full">
          <span className={cn("text-[12px] font-semibold truncate w-full text-center", selected ? "text-primary" : "text-foreground")}>
            {v.name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {v.gender === "F" ? "Female" : "Male"}
          </span>
        </div>

        {onSetDefault && !isDefault && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetDefault(v.id); }}
            className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition"
          >
            Pin default
          </button>
        )}
        {onSetDefault && isDefault && (
          <span className="text-[9px] uppercase tracking-wider font-bold text-primary">Default</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {ttsStatus === "loading" && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Loading model…
        </div>
      )}

      <Section label="Featured">
        <div className="grid grid-cols-3 gap-1">
          {featured.map(renderTile)}
        </div>
      </Section>

      <Section label="English · US">
        <div className="grid grid-cols-3 gap-1">
          {us.map(renderTile)}
        </div>
      </Section>

      <Section label="English · UK">
        <div className="grid grid-cols-3 gap-1">
          {uk.map(renderTile)}
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2 px-1">
        {label}
      </div>
      {children}
    </div>
  );
}
