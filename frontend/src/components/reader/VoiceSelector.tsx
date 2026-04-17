"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Check, Volume2, Loader2, Pin, PinOff } from "lucide-react";
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

const GENDER_COLORS: Record<string, string> = {
  F: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  M: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-foreground">Voice</h3>
        {ttsStatus === "loading" && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" /> Loading model…
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {KOKORO_VOICES.map((v) => {
          const selected = selectedVoice === v.id;
          const isDefault = defaultVoice === v.id;
          const isPlaying = playingVoice === v.id;
          const isLoading = loadingVoice === v.id;

          return (
            <div
              key={v.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition cursor-pointer",
                selected
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted border border-transparent"
              )}
              onClick={() => onSelect(v.id)}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  GENDER_COLORS[v.gender]
                )}
              >
                {v.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{v.name}</span>
                  {selected && <Check size={14} className="text-primary" />}
                  {isDefault && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                      <Pin size={9} /> Default
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {v.accent} · {v.gender === "F" ? "Female" : "Male"}
                </span>
              </div>

              {/* Set default button */}
              {onSetDefault && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault(v.id);
                  }}
                  title={isDefault ? "Current default" : "Set as default"}
                  className={cn(
                    "p-2 rounded-lg transition shrink-0",
                    isDefault
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  )}
                >
                  {isDefault ? <Pin size={14} /> : <PinOff size={14} />}
                </button>
              )}

              {/* Sample button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSample(v.id);
                }}
                disabled={ttsStatus === "loading" || ttsStatus === "idle"}
                className={cn(
                  "p-2 rounded-lg transition shrink-0",
                  isPlaying
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  (ttsStatus === "loading" || ttsStatus === "idle") && "opacity-40"
                )}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={14} />
                ) : (
                  <Play size={14} className="ml-0.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
