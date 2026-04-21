"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  coverColor: string | null;
  coverUrl: string | null;
  uploadedAt: string;
  progress?: { percentComplete: number } | null;
};

const TABS = ["All", "PDF", "EPUB", "TXT", "DOCX"];

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/api/library")
      .then((r) => r.json())
      .then(setBooks)
      .finally(() => setLoading(false));
  }, []);

  const filtered = books.filter((b) => {
    if (tab !== "All" && b.fileType.toUpperCase() !== tab) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 max-w-6xl mx-auto">
      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition",
              tab === t
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Books list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No books found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((book) => (
            <Link key={book.id} href={`/reader?id=${book.id}`}>
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-card hover:bg-muted/40 border border-border/30 transition">
                {/* Thumbnail */}
                <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg overflow-hidden shrink-0 shadow-sm">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: book.coverColor || "#534AB7" }}
                    >
                      <BookOpen size={20} className="text-white/70" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {book.fileType.toUpperCase()} Import
                  </p>
                  {book.progress && book.progress.percentComplete > 0 && (
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden w-24">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${book.progress.percentComplete}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
