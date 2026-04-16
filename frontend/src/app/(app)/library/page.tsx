"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, BookOpen, Search, MoreVertical, Star, Trash2,
  FileText, File, Loader2, X, Heart, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  coverColor: string | null;
  coverUrl: string | null;
  isFavorite: boolean;
  fileSize: number | null;
  pageCount: number | null;
  uploadedAt: string;
  lastOpenedAt: string | null;
  progress: { percentComplete: number; currentPage: number; lastReadAt: string } | null;
};

type Tab = "all" | "favorites" | "pdf" | "epub" | "txt" | "docx";

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  epub: BookOpen,
  txt: File,
  docx: File,
};

const ACCEPT = ".pdf,.epub,.txt,.docx,application/pdf,application/epub+zip,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function LibraryPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [menuBookId, setMenuBookId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      const filter = tab === "all" || tab === "favorites" ? "" : `?filter=${tab}`;
      const res = await fetch(`/api/library${filter}`);
      if (res.ok) {
        let data: Book[] = await res.json();
        if (tab === "favorites") data = data.filter((b) => b.isFavorite);
        setBooks(data);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Upload failed");
        return;
      }

      const { uploadUrl } = await res.json();
      setUploadProgress(30);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(30 + (e.loaded / e.total) * 65);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject());
        xhr.onerror = reject;
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setUploadProgress(100);
      await fetchBooks();
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  async function toggleFavorite(bookId: string, current: boolean) {
    await fetch(`/api/library/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, isFavorite: !current } : b))
    );
    setMenuBookId(null);
  }

  async function deleteBook(bookId: string) {
    if (!confirm("Delete this book? This cannot be undone.")) return;
    await fetch(`/api/library/${bookId}`, { method: "DELETE" });
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    setMenuBookId(null);
  }

  const filtered = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "favorites", label: "Favorites" },
    { key: "pdf", label: "PDF" },
    { key: "epub", label: "EPUB" },
    { key: "txt", label: "TXT" },
    { key: "docx", label: "DOCX" },
  ];

  return (
    <div
      className="max-w-4xl mx-auto px-4 py-6"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Bookshelf</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition shadow-md shadow-primary/20"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
      </div>

      {/* Upload progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-primary" />
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-primary/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-primary">{Math.round(uploadProgress)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + filter tabs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search books…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-primary/10 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-background border-2 border-dashed border-primary rounded-2xl p-12 text-center">
              <Upload size={40} className="text-primary mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">Drop your file here</p>
              <p className="text-sm text-muted-foreground">PDF, EPUB, TXT, or DOCX</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {search ? "No results" : "No books yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search
              ? `Nothing matches "${search}"`
              : "Upload a PDF, EPUB, TXT, or DOCX to start listening."}
          </p>
          {!search && (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
            >
              <Upload size={15} />
              Upload your first book
            </button>
          )}
        </div>
      )}

      {/* Book grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              menuOpen={menuBookId === book.id}
              onMenuToggle={() => setMenuBookId(menuBookId === book.id ? null : book.id)}
              onFavorite={() => toggleFavorite(book.id, book.isFavorite)}
              onDelete={() => deleteBook(book.id)}
              onOpen={() => router.push(`/reader/${book.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({
  book,
  menuOpen,
  onMenuToggle,
  onFavorite,
  onDelete,
  onOpen,
}: {
  book: Book;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const Icon = FILE_ICONS[book.fileType] || FileText;
  const percent = book.progress?.percentComplete ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative"
    >
      {/* Cover */}
      <button
        onClick={onOpen}
        className="w-full aspect-[3/4] rounded-xl overflow-hidden relative shadow-md hover:shadow-lg transition-shadow"
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-4"
            style={{ backgroundColor: book.coverColor || "#534AB7" }}
          >
            <Icon size={32} className="text-white/80 mb-2" />
            <p className="text-white/90 text-xs font-bold text-center leading-tight line-clamp-3">
              {book.title}
            </p>
            <span className="text-white/50 text-[10px] mt-1 uppercase font-semibold">
              {book.fileType}
            </span>
          </div>
        )}

        {/* Progress bar at bottom */}
        {percent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/20">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        )}

        {/* Favorite badge */}
        {book.isFavorite && (
          <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/70 rounded-full p-1">
            <Heart size={12} className="text-red-500 fill-red-500" />
          </div>
        )}

        {/* Percent badge */}
        {percent > 0 && percent < 100 && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {Math.round(percent)}%
          </div>
        )}
      </button>

      {/* Title + menu */}
      <div className="flex items-start justify-between mt-2 gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
          {book.author && (
            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-1 text-muted-foreground hover:text-foreground transition"
          >
            <MoreVertical size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-8 z-30 bg-background border border-border rounded-xl shadow-xl py-1 min-w-[140px]"
              >
                <button
                  onClick={onFavorite}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition"
                >
                  <Star size={14} className={book.isFavorite ? "text-amber-500 fill-amber-500" : ""} />
                  {book.isFavorite ? "Unfavorite" : "Favorite"}
                </button>
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
