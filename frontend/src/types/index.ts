export type FileType = "pdf" | "txt" | "epub" | "docx";

export interface Book {
  id: string;
  title: string;
  author?: string | null;
  fileType: FileType;
  r2Key: string;
  fileSize?: number | null;
  pageCount?: number | null;
  coverColor?: string | null;
  uploadedAt: string;
  progress?: ReadingProgress | null;
}

export interface ReadingProgress {
  currentPage: number;
  currentPosition: number;
  lastReadAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  text: string;
  note?: string | null;
  createdAt: string;
}

export interface Audiobook {
  id: string;
  bookId: string;
  voice: string;
  speed: number;
  status: "pending" | "generating" | "complete" | "failed";
  progress: number;
  duration?: number | null;
  r2Key?: string | null;
  createdAt: string;
}

export interface KokoroVoice {
  id: string;
  name: string;
  gender: "male" | "female";
  accent: "american" | "british";
  emoji: string;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  { id: "af_bella", name: "Bella", gender: "female", accent: "american", emoji: "👩" },
  { id: "af_sarah", name: "Sarah", gender: "female", accent: "american", emoji: "👩‍🦱" },
  { id: "af_nicole", name: "Nicole", gender: "female", accent: "american", emoji: "👩‍🦳" },
  { id: "am_adam", name: "Adam", gender: "male", accent: "american", emoji: "👨" },
  { id: "am_michael", name: "Michael", gender: "male", accent: "american", emoji: "👨‍🦱" },
  { id: "bf_emma", name: "Emma", gender: "female", accent: "british", emoji: "👩‍🦰" },
  { id: "bf_isabella", name: "Isabella", gender: "female", accent: "british", emoji: "👸" },
  { id: "bm_george", name: "George", gender: "male", accent: "british", emoji: "🧔" },
  { id: "bm_lewis", name: "Lewis", gender: "male", accent: "british", emoji: "👨‍🦳" },
];

export interface PlayerState {
  bookId: string | null;
  bookTitle: string;
  isPlaying: boolean;
  currentPage: number;
  currentWordIndex: number;
  speed: number;
  pitch: number;
  stability: number;
  voice: string;
  audioQueue: string[];
}
