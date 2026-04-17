"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, FolderInput, FileText, Download, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ReaderTheme = "light" | "dark" | "sepia";

interface TitleActionCardProps {
  open: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  themeText: string;
  bookId: string;
  title: string;
  coverUrl?: string | null;
  fileType: string;
  pageCount?: number | null;
  wordCount?: number;
  r2Key: string;
  onTitleSaved: (newTitle: string) => void;
  onDownload: () => void;
  onMove?: () => void;
}

export function TitleActionCard({
  open,
  onClose,
  theme,
  themeText,
  bookId,
  title,
  coverUrl,
  fileType,
  pageCount,
  wordCount,
  r2Key,
  onTitleSaved,
  onDownload,
  onMove,
}: TitleActionCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingNotice, setMovingNotice] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDraftTitle(title); }, [title]);

  // outside click dismisses
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const meta: string[] = [];
  if (typeof wordCount === "number" && wordCount > 0) {
    meta.push(`${Math.round(wordCount / 1000)}k words`);
  }
  if (typeof pageCount === "number" && pageCount > 0) meta.push(`${pageCount} pages`);
  meta.push(fileType.toUpperCase());

  async function saveTitle() {
    const next = draftTitle.trim();
    if (!next || next === title) { setRenaming(false); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      onTitleSaved(next);
      setRenaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openOriginal() {
    if (!r2Key) return;
    window.open(`/api/files/${r2Key}`, "_blank", "noopener");
  }

  function handleMove() {
    if (onMove) { onMove(); return; }
    setMovingNotice(true);
    setTimeout(() => setMovingNotice(false), 1800);
  }

  return (
    <>
      {/* faint backdrop, click anywhere to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={cardRef}
        className={cn(
          "fixed top-[calc(env(safe-area-inset-top)+3.75rem)] left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)]",
          "float-card p-4",
          theme === "dark"
            ? "bg-[#1f1f2e]/95 border border-white/8"
            : theme === "sepia"
              ? "bg-[#eedfc4]/95 border border-[#d4c5a9]/60"
              : "bg-card/97 border border-border/50"
        )}
        style={{ animation: "voca-pop-in 220ms var(--ease-pop) both" }}
      >
        <div className="flex items-start gap-3">
          <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted shrink-0 shadow border border-border/40">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {renaming ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") { setRenaming(false); setDraftTitle(title); }
                  }}
                  className={cn(
                    "flex-1 bg-transparent border-b border-primary/50 text-base font-bold outline-none py-1",
                    themeText
                  )}
                />
                <button
                  onClick={saveTitle}
                  disabled={saving}
                  className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => { setRenaming(false); setDraftTitle(title); }}
                  className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <h3 className={cn("text-base font-bold leading-tight line-clamp-2", themeText)}>{title}</h3>
            )}
            <p className={cn("text-[11px] mt-1 opacity-70", themeText)}>
              {meta.join(" · ")}
            </p>
            {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
          </div>
        </div>

        {/* 4-icon inline action row */}
        <div className="grid grid-cols-4 gap-1.5 mt-4">
          <ActionPill
            theme={theme}
            label="Rename"
            icon={<Pencil size={16} />}
            onClick={() => setRenaming(true)}
          />
          <ActionPill
            theme={theme}
            label={movingNotice ? "Soon" : "Move"}
            icon={<FolderInput size={16} />}
            onClick={handleMove}
            disabled={movingNotice}
          />
          <ActionPill
            theme={theme}
            label="Original"
            icon={<FileText size={16} />}
            onClick={openOriginal}
            disabled={!r2Key}
          />
          <ActionPill
            theme={theme}
            label="Download"
            icon={<Download size={16} />}
            onClick={onDownload}
          />
        </div>
      </div>
    </>
  );
}

function ActionPill({
  theme,
  label,
  icon,
  onClick,
  disabled,
}: {
  theme: ReaderTheme;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 rounded-2xl transition active:scale-95 disabled:opacity-50",
        theme === "dark"
          ? "bg-white/5 hover:bg-white/10 text-white/85"
          : theme === "sepia"
            ? "bg-[#5b4636]/5 hover:bg-[#5b4636]/10 text-[#5b4636]"
            : "bg-muted hover:bg-muted/70 text-foreground"
      )}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
