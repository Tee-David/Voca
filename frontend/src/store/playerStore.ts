import { create } from "zustand";

export interface PlayerState {
  // Current book
  bookId: string | null;
  bookTitle: string;
  bookType: string;

  // Playback
  isPlaying: boolean;
  isLoading: boolean;
  currentPage: number;
  currentWordIndex: number;
  words: string[];

  // Audio chunks (base64 or blob URLs)
  audioQueue: string[];
  currentAudioIndex: number;

  // Settings
  voice: string;
  speed: number;
  pitch: number;       // 0.5 - 2.0
  stability: number;   // 0 - 1 (controls pause between sentences)
  volume: number;      // 0 - 1

  // Actions
  setBook: (id: string, title: string, type: string) => void;
  setWords: (words: string[]) => void;
  setPlaying: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setCurrentWordIndex: (i: number) => void;
  setCurrentPage: (p: number) => void;
  setVoice: (v: string) => void;
  setSpeed: (v: number) => void;
  setPitch: (v: number) => void;
  setStability: (v: number) => void;
  setVolume: (v: number) => void;
  pushAudio: (url: string) => void;
  clearAudio: () => void;
  stop: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  bookId: null,
  bookTitle: "",
  bookType: "",
  isPlaying: false,
  isLoading: false,
  currentPage: 0,
  currentWordIndex: -1,
  words: [],
  audioQueue: [],
  currentAudioIndex: 0,
  voice: "af_bella",
  speed: 1.0,
  pitch: 1.0,
  stability: 0.5,
  volume: 1.0,

  setBook: (id, title, type) => set({ bookId: id, bookTitle: title, bookType: type }),
  setWords: (words) => set({ words, currentWordIndex: -1 }),
  setPlaying: (v) => set({ isPlaying: v }),
  setLoading: (v) => set({ isLoading: v }),
  setCurrentWordIndex: (i) => set({ currentWordIndex: i }),
  setCurrentPage: (p) => set({ currentPage: p }),
  setVoice: (v) => set({ voice: v }),
  setSpeed: (v) => set({ speed: v }),
  setPitch: (v) => set({ pitch: v }),
  setStability: (v) => set({ stability: v }),
  setVolume: (v) => set({ volume: v }),
  pushAudio: (url) => set((s) => ({ audioQueue: [...s.audioQueue, url] })),
  clearAudio: () => set({ audioQueue: [], currentAudioIndex: 0 }),
  stop: () => set({ isPlaying: false, currentWordIndex: -1, audioQueue: [], currentAudioIndex: 0 }),
}));
