"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Heart, Loader2, Download, CheckCircle2 } from "lucide-react";
import { KOKORO_VOICES, type VoiceId, useKokoro } from "@/hooks/useKokoro";
import { getCachedPreview, putCachedPreview } from "@/lib/bookCache";
import { cn } from "@/lib/utils";

const TABS = ["Explore", "Recents", "Favorites"];
const PREVIEW_TEXT = "Hello! This is a preview of my voice.";
const FAV_KEY = "voca:fav-voices";

const GENDER_COLORS: Record<string, { bg: string; ring: string }> = {
  F: { bg: "bg-gradient-to-br from-pink-200 to-rose-300 dark:from-pink-800 dark:to-rose-900", ring: "ring-pink-300 dark:ring-pink-700" },
  M: { bg: "bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-800 dark:to-indigo-900", ring: "ring-blue-300 dark:ring-blue-700" },
};

export default function VoicesPage() {
  const [tab, setTab] = useState("Explore");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cachedPreviews, setCachedPreviews] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingVoiceRef = useRef<string | null>(null);
  const tts = useKokoro();

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener("ended", () => setPlayingVoice(null));
    return () => { audioRef.current?.pause(); };
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  // Scan IndexedDB to see which voices already have a cached preview
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = new Set<string>();
      for (const v of KOKORO_VOICES) {
        const blob = await getCachedPreview(v.id).catch(() => null);
        if (blob) found.add(v.id);
      }
      if (!cancelled) setCachedPreviews(found);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    tts.onSample(async (voice: string, blob: Blob) => {
      setLoadingVoice(null);
      await putCachedPreview(voice, blob).catch(() => {});
      setCachedPreviews((prev) => new Set(prev).add(voice));
      playBlob(voice, blob);
    });
  }, [tts]);

  // Once worker becomes ready, flush any pending preview request
  useEffect(() => {
    if (tts.status === "ready" && pendingVoiceRef.current) {
      const voiceId = pendingVoiceRef.current;
      pendingVoiceRef.current = null;
      tts.playSample(voiceId, PREVIEW_TEXT);
    }
  }, [tts.status]);

  function playBlob(voice: string, blob: Blob) {
    if (!audioRef.current) return;
    audioRef.current.src = URL.createObjectURL(blob);
    audioRef.current.play().catch(() => {});
    setPlayingVoice(voice);
  }

  async function handlePreview(voiceId: string) {
    // Toggle off if already playing
    if (playingVoice === voiceId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }

    // Stop any currently-playing preview
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlayingVoice(null);
    }

    // Cache hit — play instantly, no model needed
    const cached = await getCachedPreview(voiceId);
    if (cached) {
      playBlob(voiceId, cached);
      return;
    }

    // Cache miss — need model. Kick off download if not ready.
    setLoadingVoice(voiceId);
    if (tts.status === "ready") {
      tts.playSample(voiceId, PREVIEW_TEXT);
      return;
    }
    pendingVoiceRef.current = voiceId;
    if (tts.status === "idle" || tts.status === "error") {
      tts.initWorker();
    }
  }

  function toggleFav(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const displayVoices = tab === "Favorites"
    ? KOKORO_VOICES.filter((v) => favorites.has(v.id))
    : KOKORO_VOICES;

  return (
    <div className="px-4 sm:px-6 py-4 max-w-lg mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition",
              tab === t
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* TTS loading status */}
      {(tts.status === "loading") && (
        <div className="flex flex-col gap-2 mb-4 px-4 py-3 rounded-xl bg-primary/10 text-primary text-xs font-semibold">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Downloading offline AI voice model...
            </span>
            <span>{tts.downloadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${tts.downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Offline model download — separate from per-voice preview */}
      {(tts.status === "idle" || tts.status === "error") && (
        <div className="mb-4">
          <button
            onClick={() => tts.initWorker()}
            className="w-full py-3 rounded-xl bg-card border border-primary/30 text-primary text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-primary/5 transition"
          >
            <Download size={14} />
            Download voices for offline use
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2 px-2">
            Previews below play instantly once cached — no download needed first.
          </p>
          {tts.status === "error" && (
            <p className="text-[10px] text-destructive text-center mt-2">Failed to load model. Please check connection.</p>
          )}
        </div>
      )}

      {/* Trending voices */}
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        {tab === "Favorites" ? "Your Favorites" : "Trending Voices"}
      </h3>

      <div className="space-y-2">
        {displayVoices.map((v) => {
          const isPlaying = playingVoice === v.id;
          const isLoading = loadingVoice === v.id;
          const isFav = favorites.has(v.id);
          const colors = GENDER_COLORS[v.gender];

          return (
            <div
              key={v.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30 hover:bg-muted/30 transition"
            >
              {/* Avatar */}
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ring-2",
                colors.bg, colors.ring
              )}>
                {v.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {v.name} — {v.accent}
                  {cachedPreviews.has(v.id) && (
                    <span title="Preview cached — plays instantly" className="inline-flex items-center">
                      <CheckCircle2 size={12} className="text-primary" />
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {v.gender === "F" ? "Female" : "Male"} · {v.accent} English
                </p>
              </div>

              {/* Fav */}
              <button
                onClick={() => toggleFav(v.id)}
                className="p-1.5 text-muted-foreground hover:text-red-400 transition"
              >
                <Heart size={16} className={isFav ? "fill-red-400 text-red-400" : ""} />
              </button>

              {/* Preview */}
              <button
                onClick={() => handlePreview(v.id)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition",
                  isPlaying
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                )}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} className="ml-0.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {displayVoices.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          No favorite voices yet. Tap the heart to save voices.
        </p>
      )}
    </div>
  );
}
