"use client";

import { useEffect, useState } from "react";
import { Headphones, Loader2, Play, Download, Clock, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Audiobook = {
  id: string;
  voice: string;
  speed: number;
  status: string;
  progress: number;
  duration: number | null;
  fileSize: number | null;
  createdAt: string;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverColor: string | null;
    coverUrl: string | null;
  };
};

export default function AudiobooksPage() {
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudiobooks() {
      try {
        const res = await apiFetch("/api/audiobooks");
        if (res.ok) setAudiobooks(await res.json());
      } finally {
        setLoading(false);
      }
    }
    fetchAudiobooks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Audiobooks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {audiobooks.length > 0
            ? `${audiobooks.length} exported ${audiobooks.length === 1 ? "audiobook" : "audiobooks"}`
            : "Exported audio from your documents"}
        </p>
      </div>

      {audiobooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Headphones size={28} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No audiobooks yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Open a document in the reader and use the export button to generate an audiobook.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {audiobooks.map((ab) => (
            <div
              key={ab.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/30 transition"
            >
              {/* Mini cover */}
              <div
                className="w-12 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                style={{ backgroundColor: ab.book.coverColor || "#534AB7" }}
              >
                {ab.book.coverUrl ? (
                  <img src={ab.book.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Mic size={18} className="text-white/70" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{ab.book.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ab.voice} · {ab.speed}×
                </p>
                {ab.status === "generating" && (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden w-full max-w-[120px]">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${ab.progress}%` }} />
                  </div>
                )}
                {ab.status === "complete" && ab.duration && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {Math.round(ab.duration / 60)} min
                  </p>
                )}
              </div>

              {/* Action */}
              <div>
                {ab.status === "complete" ? (
                  <button className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition">
                    <Play size={18} />
                  </button>
                ) : ab.status === "generating" ? (
                  <Loader2 size={18} className="animate-spin text-primary" />
                ) : (
                  <span className="text-xs text-muted-foreground">{ab.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
