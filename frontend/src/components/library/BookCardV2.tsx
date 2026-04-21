"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, File, Cloud, CloudOff, Heart, MoreVertical,
  Pencil, Star, ScanText, Trash2, Download, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBook, deleteOfflineBook, isBookOffline } from "@/lib/offline";
import { isNative } from "@/lib/native";

export type BookCardBook = {
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

interface Props {
  book: BookCardBook;
  /** True when the file has been cached for offline (not yet wired — placeholder). */
  offline?: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onRename: () => void;
  onOcr: () => void;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  epub: BookOpen,
  txt: File,
  docx: File,
};

function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function BookCardV2({ book, offline: offlineProp = false, onOpen, onFavorite, onDelete, onRename, onOcr }: Props) {
  const Icon = FILE_ICONS[book.fileType] ?? FileText;
  const percent = book.progress?.percentComplete ?? 0;
  const date = shortDate(book.lastOpenedAt ?? book.uploadedAt);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [offline, setOffline] = useState(offlineProp);
  const [downloading, setDownloading] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isNative()) return;
    let alive = true;
    isBookOffline(book.id).then((v) => { if (alive) setOffline(v); }).catch(() => {});
    return () => { alive = false; };
  }, [book.id]);

  async function toggleOffline() {
    if (downloading) return;
    setDownloading(true);
    try {
      if (offline) {
        await deleteOfflineBook(book.id);
        setOffline(false);
      } else {
        await downloadBook(book.id);
        setOffline(true);
      }
    } catch (err) {
      console.error("offline toggle failed", err);
    } finally {
      setDownloading(false);
      setSheetOpen(false);
    }
  }

  function startLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setSheetOpen(true);
      try { navigator.vibrate?.(8); } catch { /* ignore */ }
    }, 480);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }
  useEffect(() => () => cancelLongPress(), []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className="group relative"
    >
      <button
        onClick={onOpen}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true); }}
        className="w-full aspect-[2/3] rounded-lg overflow-hidden relative shadow-md hover:shadow-xl transition-shadow bg-muted"
      >
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-3"
            style={{ backgroundColor: book.coverColor || "#4338CA" }}
          >
            <Icon size={28} className="text-white/80 mb-2" />
            <p className="text-white/90 text-[11px] font-bold text-center leading-tight line-clamp-3">
              {book.title}
            </p>
          </div>
        )}

        {percent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/25">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        )}

        {book.isFavorite && (
          <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/70 rounded-full p-1">
            <Heart size={10} className="text-red-500 fill-red-500" />
          </div>
        )}
      </button>

      <div className="mt-2 px-0.5">
        <div className="flex items-start gap-1">
          <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug flex-1">
            {book.title}
          </p>
          <button
            aria-label="Book options"
            onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
            className="p-1 -mr-1 -mt-0.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition shrink-0"
          >
            <MoreVertical size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          {offline ? (
            <Cloud size={11} className="shrink-0 text-primary fill-primary/30" />
          ) : (
            <CloudOff size={11} className="shrink-0 opacity-50" />
          )}
          {percent > 0 && (
            <>
              <span className="font-semibold">{Math.round(percent)}%</span>
              <span className="opacity-40">·</span>
            </>
          )}
          {date && <span>{date}</span>}
          <span className="opacity-40">·</span>
          <span className="uppercase tracking-wider font-bold opacity-70">{book.fileType}</span>
        </div>
      </div>

      {sheetOpen && (
        <ActionsSheet
          book={book}
          offline={offline}
          downloading={downloading}
          onClose={() => setSheetOpen(false)}
          onFavorite={() => { onFavorite(); setSheetOpen(false); }}
          onDelete={() => { onDelete(); setSheetOpen(false); }}
          onRename={() => { onRename(); setSheetOpen(false); }}
          onOcr={() => { onOcr(); setSheetOpen(false); }}
          onOpen={() => { onOpen(); setSheetOpen(false); }}
          onToggleOffline={toggleOffline}
        />
      )}
    </motion.div>
  );
}

function ActionsSheet({
  book, offline, downloading, onClose, onFavorite, onDelete, onRename, onOcr, onOpen, onToggleOffline,
}: {
  book: BookCardBook;
  offline: boolean;
  downloading: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onRename: () => void;
  onOcr: () => void;
  onOpen: () => void;
  onToggleOffline: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-sm bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-2"
      >
        <div className="px-3 pt-2 pb-3 border-b border-border/40">
          <p className="text-sm font-bold text-foreground line-clamp-1">{book.title}</p>
          {book.author && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
          )}
        </div>
        <Row icon={<BookOpen size={16} />} label="Open" onClick={onOpen} />
        <Row icon={<Pencil size={16} />} label="Rename" onClick={onRename} />
        <Row
          icon={<Star size={16} className={book.isFavorite ? "text-amber-500 fill-amber-500" : ""} />}
          label={book.isFavorite ? "Unfavorite" : "Favorite"}
          onClick={onFavorite}
        />
        {book.fileType === "pdf" && (
          <Row icon={<ScanText size={16} />} label="Run OCR" onClick={onOcr} />
        )}
        {isNative() && (
          <Row
            icon={
              downloading
                ? <Loader2 size={16} className="animate-spin" />
                : offline
                  ? <Cloud size={16} className="text-primary" />
                  : <Download size={16} />
            }
            label={downloading ? "Working…" : offline ? "Remove from device" : "Download for offline"}
            onClick={onToggleOffline}
          />
        )}
        <div className="my-1 border-t border-border/40" />
        <Row icon={<Trash2 size={16} />} label="Delete" onClick={onDelete} destructive />
      </motion.div>
    </div>
  );
}

function Row({
  icon, label, onClick, destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
