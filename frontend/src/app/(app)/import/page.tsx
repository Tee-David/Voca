"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Globe, Upload, ScanText, Type, Loader2, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const ACTIONS = [
  { icon: Globe, label: "Paste a link", desc: "Import from URL", id: "link" },
  { icon: Upload, label: "Upload a file", desc: "PDF, EPUB, DOCX, TXT", id: "upload" },
  { icon: ScanText, label: "Scan text", desc: "OCR from image", id: "scan" },
  { icon: Type, label: "Write text", desc: "Paste or type text", id: "write" },
] as const;

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\.[^.]+$/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState<"link" | "write" | null>(null);
  const [inputValue, setInputValue] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      // Step 1: get presigned upload URL
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const presignRes = await apiFetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: ext,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, r2Key } = await presignRes.json();

      // Step 2: upload to R2
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      // Step 3: confirm — create book record
      const confirmRes = await apiFetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          r2Key,
          title: toTitleCase(file.name),
          fileType: ext,
          fileSize: file.size,
        }),
      });
      if (!confirmRes.ok) throw new Error("Failed to save book");
      const book = await confirmRes.json();
      router.push(`/reader?id=${book.id}`);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitInput() {
    if (!inputValue.trim()) return;
    setUploading(true);
    setError("");
    try {
      if (activeAction === "link") {
        // Phase 8c: Use server-side Readability extraction
        const url = inputValue.trim();
        const extractRes = await apiFetch("/api/fetch-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!extractRes.ok) {
          const body = await extractRes.json().catch(() => ({}));
          throw new Error(body.error || `Failed to extract article (${extractRes.status})`);
        }
        const article = await extractRes.json();
        const content = article.byline
          ? `${article.title}\nBy ${article.byline}\n\n${article.content}`
          : `${article.title}\n\n${article.content}`;
        const file = new File(
          [content],
          `${(article.title || "Article").slice(0, 80)}.txt`,
          { type: "text/plain" }
        );
        await handleFile(file);
      } else {
        const file = new File([inputValue], "Pasted Text.txt", { type: "text/plain" });
        await handleFile(file);
      }
    } catch (e: any) {
      setError(e.message || "Action failed");
      setUploading(false);
    }
  }

  function handleAction(id: string) {
    setError("");
    setInputValue("");
    if (id === "upload" || id === "scan") {
      // scan also opens file picker for image OCR in this stub
      fileRef.current?.click();
    } else if (id === "link" || id === "write") {
      setActiveAction(id as "link" | "write");
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.epub,.txt,.docx,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="grid grid-cols-2 gap-3 mt-2">
        {ACTIONS.map(({ icon: Icon, label, desc, id }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            disabled={uploading}
            className={cn(
              "flex flex-col items-center gap-2 p-5 rounded-2xl border border-border/60",
              "bg-card hover:bg-muted/60 transition text-center focus:outline-none focus:ring-2 focus:ring-primary/50",
              (uploading || (activeAction && activeAction !== id)) && "opacity-50",
              activeAction === id && "border-primary bg-primary/5"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Icon size={20} className="text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-[10px] text-muted-foreground">{desc}</span>
          </button>
        ))}
      </div>

      {activeAction && (
        <div className="mt-4 p-4 border border-border/60 rounded-2xl bg-card transition-all flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {activeAction === "link" ? "Paste Web Link" : "Paste or Type Text"}
            </h3>
            <button disabled={uploading} onClick={() => setActiveAction(null)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          {activeAction === "link" ? (
            <input
              type="url"
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary/50 transition-colors"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={uploading}
              autoFocus
            />
          ) : (
            <textarea
              placeholder="Type or paste your text here..."
              className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none border border-transparent focus:border-primary/50 transition-colors min-h-[120px] resize-none"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={uploading}
              autoFocus
            />
          )}
          <button
            onClick={handleSubmitInput}
            disabled={!inputValue.trim() || uploading}
            className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {activeAction === "link" ? "Import Article" : "Save Document"}
          </button>
        </div>
      )}

      {uploading && !activeAction && (
        <div className="flex items-center gap-2 mt-6 justify-center text-primary">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm font-semibold">Uploading...</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center mt-4">{error}</p>
      )}

      {/* Drop zone */}
      <div
        className="mt-8 border-2 border-dashed border-border/60 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 transition"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag & drop a file here, or <span className="text-primary font-semibold">browse</span>
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">PDF, EPUB, DOCX, TXT</p>
      </div>
    </div>
  );
}
