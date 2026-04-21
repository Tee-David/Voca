"use client";

import { useEffect, useRef } from "react";

/**
 * Wires player state + actions into the browser's MediaSession API.
 * On Android's Capacitor WebView this produces a lockscreen + pull-down
 * notification with cover art and play/pause/next/previous — no extra
 * plugin required. On desktop web it shows up in the OS media hub
 * (GNOME Sound, macOS Now Playing, Windows SMTC) for free.
 */

type MediaState = {
  playing: boolean;
  bookTitle: string | null;
  chapterTitle: string | null;
  coverUrl?: string | null;
  position?: number;
  duration?: number;
};

type MediaActions = {
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
};

function has(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

export function useMediaControls(state: MediaState, actions: MediaActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!has()) return;
    const ms = navigator.mediaSession;
    const bind = (t: MediaSessionAction, fn: (d: MediaSessionActionDetails) => void) => {
      try { ms.setActionHandler(t, fn); } catch { /* browser may not support this action */ }
    };

    bind("play", () => actionsRef.current.onPlay());
    bind("pause", () => actionsRef.current.onPause());
    bind("stop", () => actionsRef.current.onStop?.());
    bind("nexttrack", () => actionsRef.current.onNext?.());
    bind("previoustrack", () => actionsRef.current.onPrev?.());
    bind("seekto", (d) => {
      if (typeof d.seekTime === "number") actionsRef.current.onSeek?.(d.seekTime);
    });

    return () => {
      const acts: MediaSessionAction[] = ["play", "pause", "stop", "nexttrack", "previoustrack", "seekto"];
      for (const a of acts) {
        try { ms.setActionHandler(a, null); } catch { /* ignore */ }
      }
      try { ms.metadata = null; } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    if (!has() || !state.bookTitle) return;
    const ms = navigator.mediaSession;

    try {
      ms.metadata = new MediaMetadata({
        title: state.bookTitle,
        artist: state.chapterTitle ?? "",
        album: "Voca",
        artwork: state.coverUrl
          ? [
              { src: state.coverUrl, sizes: "96x96", type: "image/png" },
              { src: state.coverUrl, sizes: "192x192", type: "image/png" },
              { src: state.coverUrl, sizes: "512x512", type: "image/png" },
            ]
          : [],
      });
    } catch { /* some WebViews reject malformed artwork */ }

    try { ms.playbackState = state.playing ? "playing" : "paused"; } catch { /* ignore */ }

    if (typeof state.position === "number" && typeof state.duration === "number" && state.duration > 0) {
      try {
        ms.setPositionState({
          duration: state.duration,
          position: Math.min(state.position, state.duration),
          playbackRate: 1,
        });
      } catch { /* ignore */ }
    }
  }, [state.playing, state.bookTitle, state.chapterTitle, state.coverUrl, state.position, state.duration]);
}
