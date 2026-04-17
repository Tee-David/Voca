"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Upload, BookOpen, Search, MoreVertical, Star, Trash2,
  FileText, File, Loader2, X, Heart, Clock, Headphones,
  Bookmark, TrendingUp, Play,
  LayoutGrid, List as ListIcon, Pencil, ScanText,
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

type Stats = {
  bookCount: number;
  bookmarkCount: number;
  audiobookCount: number;
  totalMinutes: number;
  recentBooks: Book[];
};

type Tab = "all" | "favorites" | "pdf" | "epub" | "txt" | "docx";
type ViewMode = "grid" | "list";

const VIEW_MODE_KEY = "voca:library:view";

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  epub: BookOpen,
  txt: File,
  docx: File,
};

const ACCEPT = ".pdf,.epub,.txt,.docx,application/pdf,application/epub+zip,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function LibraryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [menuBookId, setMenuBookId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  const setView = (m: ViewMode) => {
    setViewMode(m);
    try { localStorage.setItem(VIEW_MODE_KEY, m); } catch { /* ignore */ }
  };

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

  useEffect(() => {
    if (!menuBookId) return;
    const close = () => setMenuBookId(null);
    // defer by a tick so the toggle click itself doesn't immediately close the menu
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", close);
    };
  }, [menuBookId]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, []);

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

      const { uploadUrl, r2Key, fileType } = await res.json();
      setUploadProgress(20);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(20 + (e.loaded / e.total) * 60);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setUploadProgress(85);

      const confirmRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, r2Key, fileName: file.name, fileType, fileSize: file.size }),
      });

      if (!confirmRes.ok) throw new Error("Failed to save book");

      setUploadProgress(100);
      await fetchBooks();
      fetch("/api/stats").then((r) => r.ok ? r.json() : null).then(setStats).catch(() => {});
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

  async function renameBook(bookId: string, currentTitle: string) {
    const next = window.prompt("Rename book", currentTitle)?.trim();
    setMenuBookId(null);
    if (!next || next === currentTitle) return;
    const res = await fetch(`/api/library/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    if (!res.ok) return alert("Rename failed");
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, title: next } : b)));
  }

  async function runOcrFor(bookId: string) {
    setMenuBookId(null);
    if (!confirm("Run OCR on this PDF? This can take a few minutes.")) return;
    const res = await fetch(`/api/library/${bookId}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "eng" }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      return alert(`OCR failed: ${msg || res.status}`);
    }
    await fetchBooks();
  }

  const filtered = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const continueReading = books
    .filter((b) => b.progress && b.progress.percentComplete > 0 && b.progress.percentComplete < 100)
    .sort((a, b) => {
      const aDate = a.progress?.lastReadAt ? new Date(a.progress.lastReadAt).getTime() : 0;
      const bDate = b.progress?.lastReadAt ? new Date(b.progress.lastReadAt).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, 4);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "favorites", label: "Favorites" },
    { key: "pdf", label: "PDF" },
    { key: "epub", label: "EPUB" },
    { key: "txt", label: "TXT" },
    { key: "docx", label: "DOCX" },
  ];

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* ─── Hero / Welcome ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {books.length === 0
              ? "Upload your first book to get started"
              : `You have ${books.length} ${books.length === 1 ? "book" : "books"} in your library`}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="self-start sm:self-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition shadow-lg shadow-primary/25"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFileChange} className="hidden" />
      </div>

      {/* ─── Curved book gallery ─── */}
      {books.length > 0 && <CoverGallery books={books} onOpen={(id) => router.push(`/reader/${id}`)} />}

      {/* ─── Stats Cards ─── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { icon: BookOpen, label: "Books", value: stats.bookCount, color: "text-primary bg-primary/10" },
            { icon: Clock, label: "Minutes listened", value: stats.totalMinutes, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
            { icon: Bookmark, label: "Bookmarks", value: stats.bookmarkCount, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
            { icon: Headphones, label: "Audiobooks", value: stats.audiobookCount, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Continue Reading ─── */}
      {continueReading.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Continue Reading</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {continueReading.map((book) => (
              <button
                key={book.id}
                onClick={() => router.push(`/reader/${book.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition text-left group"
              >
                <div
                  className="w-12 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: book.coverColor || "#4338CA" }}
                >
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={16} className="text-white/70" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${book.progress?.percentComplete ?? 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {Math.round(book.progress?.percentComplete ?? 0)}%
                    </span>
                  </div>
                </div>
                <Play size={16} className="text-muted-foreground group-hover:text-primary transition shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Upload progress ─── */}
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

      {/* ─── Library Section ─── */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground mb-4">Your Library</h2>

        {/* Search + filter tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 flex-1 min-w-0">
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
            <div className="shrink-0 flex items-center rounded-full bg-muted/50 p-0.5">
              <button
                aria-label="Grid view"
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 rounded-full transition",
                  viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                aria-label="List view"
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 rounded-full transition",
                  viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListIcon size={14} />
              </button>
            </div>
          </div>
        </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <BookOpen size={32} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {search ? "No results" : "Your library is empty"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {search
              ? `Nothing matches "${search}"`
              : "Upload a PDF, EPUB, TXT, or DOCX file to start reading and listening."}
          </p>
          {!search && (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/25"
            >
              <Upload size={16} />
              Upload your first book
            </button>
          )}
        </div>
      )}

      {/* Book grid */}
      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              menuOpen={menuBookId === book.id}
              onMenuToggle={() => setMenuBookId(menuBookId === book.id ? null : book.id)}
              onFavorite={() => toggleFavorite(book.id, book.isFavorite)}
              onDelete={() => deleteBook(book.id)}
              onRename={() => renameBook(book.id, book.title)}
              onOcr={() => runOcrFor(book.id)}
              onOpen={() => router.push(`/reader/${book.id}`)}
            />
          ))}

          {/* Upload more card */}
          <button
            onClick={() => fileRef.current?.click()}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition">
              <Upload size={18} className="text-muted-foreground group-hover:text-primary transition" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition">
              Add book
            </span>
          </button>
        </div>
      )}

      {/* Book list */}
      {!loading && filtered.length > 0 && viewMode === "list" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {filtered.map((book, i) => (
            <BookRow
              key={book.id}
              book={book}
              first={i === 0}
              menuOpen={menuBookId === book.id}
              onMenuToggle={() => setMenuBookId(menuBookId === book.id ? null : book.id)}
              onFavorite={() => toggleFavorite(book.id, book.isFavorite)}
              onDelete={() => deleteBook(book.id)}
              onRename={() => renameBook(book.id, book.title)}
              onOcr={() => runOcrFor(book.id)}
              onOpen={() => router.push(`/reader/${book.id}`)}
            />
          ))}
        </div>
      )}

      {/* ─── Quick Tips (only if few books) ─── */}
      {!loading && books.length > 0 && books.length <= 3 && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" />
            Getting Started
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Upload documents", desc: "Drag & drop PDF, EPUB, TXT, or DOCX files into your library" },
              { title: "Listen with AI voices", desc: "Choose from 9 natural voices and adjust speed to your preference" },
              { title: "Export audiobooks", desc: "Convert any document to an audiobook you can download and play anywhere" },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-1 rounded-full bg-primary/30 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoverGallery({ books, onOpen }: { books: Book[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setScroll(el.scrollLeft);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const items = books.slice(0, 12);
  if (items.length === 0) return null;

  return (
    <div className="mb-10 -mx-4 sm:-mx-6 lg:-mx-8">
      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 sm:px-10 py-6"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((book, idx) => {
          const el = ref.current;
          const center = el ? scroll + el.clientWidth / 2 : 0;
          const itemCenter = 192 + idx * (160 + 20);
          const distance = Math.abs(itemCenter - center);
          const maxDist = 400;
          const closeness = Math.max(0, 1 - distance / maxDist);
          const scale = 0.82 + closeness * 0.18;
          const rotate = (itemCenter - center) / 40;
          const translateY = (1 - closeness) * 20;
          return (
            <button
              key={book.id}
              onClick={() => onOpen(book.id)}
              className="shrink-0 snap-center transition-transform duration-200 origin-bottom"
              style={{
                transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                opacity: 0.5 + closeness * 0.5,
              }}
            >
              <div
                className="w-[140px] sm:w-[160px] aspect-[3/4] rounded-xl overflow-hidden shadow-xl"
                style={{ backgroundColor: book.coverColor || "#4338CA" }}
              >
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <BookOpen size={24} className="text-white/70 mb-2" />
                    <p className="text-white/90 text-[11px] font-bold text-center leading-tight line-clamp-3">
                      {book.title}
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookCard({
  book,
  menuOpen,
  onMenuToggle,
  onFavorite,
  onDelete,
  onRename,
  onOcr,
  onOpen,
}: {
  book: Book;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onRename: () => void;
  onOcr: () => void;
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
        className="w-full aspect-[3/4] rounded-xl overflow-hidden relative shadow-md hover:shadow-xl transition-shadow"
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-3"
            style={{ backgroundColor: book.coverColor || "#4338CA" }}
          >
            <Icon size={28} className="text-white/80 mb-2" />
            <p className="text-white/90 text-[11px] font-bold text-center leading-tight line-clamp-3">
              {book.title}
            </p>
            <span className="text-white/50 text-[9px] mt-1.5 uppercase font-bold tracking-wider">
              {book.fileType}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {percent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/20">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        )}

        {/* Favorite badge */}
        {book.isFavorite && (
          <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/70 rounded-full p-1">
            <Heart size={10} className="text-red-500 fill-red-500" />
          </div>
        )}

        {/* Percent badge */}
        {percent > 0 && percent < 100 && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            {Math.round(percent)}%
          </div>
        )}
      </button>

      {/* Title + menu */}
      <div className="flex items-start justify-between mt-2 gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{book.title}</p>
          {book.author && (
            <p className="text-[10px] text-muted-foreground truncate">{book.author}</p>
          )}
        </div>
        <div className="relative">
          <button
            aria-label="Book options"
            onClick={onMenuToggle}
            className="p-1.5 -mr-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
          >
            <MoreVertical size={14} />
          </button>
          <BookMenu
            open={menuOpen}
            book={book}
            onFavorite={onFavorite}
            onDelete={onDelete}
            onRename={onRename}
            onOcr={onOcr}
          />
        </div>
      </div>
    </motion.div>
  );
}

function BookMenu({
  open,
  book,
  onFavorite,
  onDelete,
  onRename,
  onOcr,
}: {
  open: boolean;
  book: Book;
  onFavorite: () => void;
  onDelete: () => void;
  onRename: () => void;
  onOcr: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 top-8 z-30 bg-background border border-border rounded-xl shadow-xl py-1 min-w-[170px]"
        >
          <button onClick={onRename} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition">
            <Pencil size={13} />
            Rename
          </button>
          <button onClick={onFavorite} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition">
            <Star size={13} className={book.isFavorite ? "text-amber-500 fill-amber-500" : ""} />
            {book.isFavorite ? "Unfavorite" : "Favorite"}
          </button>
          {book.fileType === "pdf" && (
            <button onClick={onOcr} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition">
              <ScanText size={13} />
              Run OCR
            </button>
          )}
          <div className="my-1 border-t border-border" />
          <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition">
            <Trash2 size={13} />
            Delete
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BookRow({
  book,
  first,
  menuOpen,
  onMenuToggle,
  onFavorite,
  onDelete,
  onRename,
  onOcr,
  onOpen,
}: {
  book: Book;
  first: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onRename: () => void;
  onOcr: () => void;
  onOpen: () => void;
}) {
  const Icon = FILE_ICONS[book.fileType] || FileText;
  const percent = book.progress?.percentComplete ?? 0;
  const sizeMb = book.fileSize ? (book.fileSize / 1024 / 1024).toFixed(1) : null;

  return (
    <div className={cn("relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-accent/40 transition", !first && "border-t border-border")}>
      <button onClick={onOpen} className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 text-left">
        <div
          className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-sm"
          style={{ backgroundColor: book.coverColor || "#4338CA" }}
        >
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon size={16} className="text-white/70" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
            {book.isFavorite && <Heart size={11} className="text-red-500 fill-red-500 shrink-0" />}
          </div>
          {book.author && (
            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="uppercase font-bold tracking-wider">{book.fileType}</span>
            {book.pageCount ? <><span className="opacity-40">·</span><span>{book.pageCount} pages</span></> : null}
            {sizeMb ? <><span className="opacity-40">·</span><span>{sizeMb} MB</span></> : null}
            {percent > 0 && <><span className="opacity-40">·</span><span className="text-primary font-semibold">{Math.round(percent)}% read</span></>}
          </div>
        </div>
      </button>

      {percent > 0 && percent < 100 && (
        <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="relative shrink-0">
        <button
          aria-label="Book options"
          onClick={onMenuToggle}
          className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
        >
          <MoreVertical size={16} />
        </button>
        <BookMenu
          open={menuOpen}
          book={book}
          onFavorite={onFavorite}
          onDelete={onDelete}
          onRename={onRename}
          onOcr={onOcr}
        />
      </div>
    </div>
  );
}
