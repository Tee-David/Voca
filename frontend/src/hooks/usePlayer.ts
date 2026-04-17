"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Howl, Howler } from "howler";

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
  const currentHowl = useRef<Howl | null>(null);
  const queueRef = useRef<(Blob | ArrayBuffer)[]>([]);
  const playingIdx = useRef(0);
  const frameRef = useRef<number>();
  const onQueueEndRef = useRef<(() => void) | null>(null);

  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    chunkIndex: 0,
    bookId: null,
    bookTitle: null,
    chapterTitle: null,
  });

  const updateProgress = useCallback(() => {
    if (currentHowl.current && currentHowl.current.playing()) {
      setState((s) => ({
        ...s,
        currentTime: (currentHowl.current?.seek() as number) || 0,
      }));
      frameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    return () => {
      currentHowl.current?.unload();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const playBuffer = useCallback(
    (buffer: Blob | ArrayBuffer) => {
      currentHowl.current?.unload();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      const sound = new Howl({
        src: [url],
        format: ["wav"],
        html5: true, // Force HTML5 Audio to allow memory efficient streaming
        onplay: () => {
          setState((s) => ({ ...s, playing: true, duration: sound.duration() }));
          frameRef.current = requestAnimationFrame(updateProgress);
        },
        onpause: () => {
          setState((s) => ({ ...s, playing: false }));
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
        },
        onend: () => {
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
          URL.revokeObjectURL(url);
          playNext();
        },
        onstop: () => {
          setState((s) => ({ ...s, playing: false }));
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
          URL.revokeObjectURL(url);
        },
      });

      currentHowl.current = sound;
      sound.play();
    },
    [updateProgress]
  );

  const playNext = useCallback(() => {
    playingIdx.current++;
    if (playingIdx.current < queueRef.current.length) {
      setState((s) => ({ ...s, chunkIndex: playingIdx.current }));
      playBuffer(queueRef.current[playingIdx.current]);
    } else {
      setState((s) => ({ ...s, playing: false, currentTime: 0 }));
      // Fire queue-end callback (used for auto-chapter-advance)
      onQueueEndRef.current?.();
    }
  }, [playBuffer]);

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
    currentHowl.current?.play();
  }, []);

  const pause = useCallback(() => {
    currentHowl.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (currentHowl.current?.playing()) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const seek = useCallback((time: number) => {
    currentHowl.current?.seek(time);
    setState((s) => ({ ...s, currentTime: time }));
  }, []);

  const stop = useCallback(() => {
    currentHowl.current?.stop();
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
    currentHowl.current?.stop();
    queueRef.current = [];
    playingIdx.current = 0;
  }, []);

  const playSingleBuffer = useCallback(
    (buffer: Blob | ArrayBuffer) => {
      resetQueue();
      queueRef.current = [buffer];
      playingIdx.current = 0;
      playBuffer(buffer);
    },
    [playBuffer, resetQueue]
  );

  const setOnQueueEnd = useCallback((fn: (() => void) | null) => {
    onQueueEndRef.current = fn;
  }, []);

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
    setOnQueueEnd,
  };
}
