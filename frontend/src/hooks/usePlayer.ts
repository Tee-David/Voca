"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type PlayerState = {
  playing: boolean;
  currentTime: number;
  duration: number;
  chunkIndex: number;
  bookId: string | null;
  bookTitle: string | null;
  chapterTitle: string | null;
};

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<(Blob | ArrayBuffer)[]>([]);
  const playingIdx = useRef(0);

  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    chunkIndex: 0,
    bookId: null,
    bookTitle: null,
    chapterTitle: null,
  });

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      setState((s) => ({ ...s, currentTime: audio.currentTime }));
    });
    audio.addEventListener("ended", () => {
      playNext();
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    playingIdx.current++;
    if (playingIdx.current < queueRef.current.length) {
      setState((s) => ({ ...s, chunkIndex: playingIdx.current }));
      playBuffer(queueRef.current[playingIdx.current]);
    } else {
      setState((s) => ({ ...s, playing: false }));
    }
  }, []);

  const playBuffer = useCallback((buffer: Blob | ArrayBuffer) => {
    const audio = audioRef.current;
    if (!audio) return;

    const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    audio.src = url;
    audio.play().catch(() => {});
    setState((s) => ({ ...s, playing: true, duration: 0 }));

    audio.onloadedmetadata = () => {
      setState((s) => ({ ...s, duration: audio.duration }));
    };
  }, []);

  const enqueueChunk = useCallback(
    (buffer: Blob | ArrayBuffer) => {
      queueRef.current.push(buffer);
      if (queueRef.current.length === 1) {
        playingIdx.current = 0;
        playBuffer(buffer);
      }
    },
    [playBuffer]
  );

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setState((s) => ({ ...s, playing: true }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.playing) pause();
    else play();
  }, [state.playing, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    queueRef.current = [];
    playingIdx.current = 0;
    setState({
      playing: false,
      currentTime: 0,
      duration: 0,
      chunkIndex: 0,
      bookId: null,
      bookTitle: null,
      chapterTitle: null,
    });
  }, []);

  const setMeta = useCallback(
    (bookId: string, bookTitle: string, chapterTitle: string) => {
      setState((s) => ({ ...s, bookId, bookTitle, chapterTitle }));

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: chapterTitle,
          artist: "Voca",
          album: bookTitle,
        });
        navigator.mediaSession.setActionHandler("play", play);
        navigator.mediaSession.setActionHandler("pause", pause);
      }
    },
    [play, pause]
  );

  const resetQueue = useCallback(() => {
    queueRef.current = [];
    playingIdx.current = 0;
  }, []);

  const playSingleBuffer = useCallback(
    (buffer: Blob | ArrayBuffer) => {
      queueRef.current = [buffer];
      playingIdx.current = 0;
      playBuffer(buffer);
    },
    [playBuffer]
  );

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    stop,
    enqueueChunk,
    resetQueue,
    setMeta,
    playSingleBuffer,
  };
}
