"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAI } from "@/hooks/useAI";

type ReaderTheme = "light" | "dark" | "sepia";

interface RecapBannerProps {
  theme: ReaderTheme;
  bookId: string;
  previousChapterText: string | null;
  onExpand: () => void;
  onDismiss: () => void;
}

export function RecapBanner({ theme, bookId, previousChapterText, onExpand, onDismiss }: RecapBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const ai = useAI("recap");

  useEffect(() => {
    if (previousChapterText && !dismissed && ai.status === "idle") {
      ai.recap(previousChapterText.slice(0, 3000), `recap-banner-${bookId}-${Date.now()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousChapterText, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  if (!previousChapterText || dismissed) return null;

  const bgStyles =
    theme === "dark"
      ? "bg-primary/20 border-primary/30 text-white"
      : theme === "sepia"
      ? "bg-[#d4c5a9]/20 border-[#d4c5a9] text-[#5c4b37]"
      : "bg-primary/5 border-primary/20 text-foreground";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={cn("fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40 rounded-2xl border p-4 backdrop-blur-xl shadow-lg", bgStyles)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80 mb-2">
              <Sparkles size={12} className="text-primary" />
              Where You Left Off
            </h4>

            {ai.status === "loading" || ai.status === "generating" ? (
              <div className="flex items-center gap-2 text-sm opacity-70">
                <Loader2 size={14} className="animate-spin" />
                <span>Recapping previous chapter...</span>
              </div>
            ) : ai.status === "error" ? (
              <div className="text-xs opacity-70">Failed to generate recap.</div>
            ) : (
              <div className="text-sm font-medium leading-relaxed line-clamp-3">
                {ai.result}
              </div>
            )}
          </div>
          <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 transition">
            <X size={16} />
          </button>
        </div>

        {ai.status === "ready" && ai.result && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                handleDismiss();
                onExpand();
              }}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
            >
              Read full recap <ArrowRight size={12} />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
