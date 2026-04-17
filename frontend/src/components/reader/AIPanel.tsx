"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, Copy, RefreshCw, Loader2, Sparkles, Send, Zap, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAI } from "@/hooks/useAI";
import { getCachedEmbeddings } from "@/lib/bookCache";
import { getTopKParagraphs } from "@/lib/embeddings";

type ReaderTheme = "light" | "dark" | "sepia";

type GroqStatus = "idle" | "loading" | "ready" | "error";

export function AIPanel({
  action,
  theme,
  textContext,
  bookId,
  onClose,
}: {
  action: "summary" | "recap" | "quiz" | "chat";
  theme: ReaderTheme;
  textContext: string;
  bookId: string;
  onClose: () => void;
}) {
  const themeStyle = {
    bg:
      theme === "dark"
        ? "bg-[#1a1a2e] border-white/10"
        : theme === "sepia"
        ? "bg-[#f4ecd8] border-[#d4c5a9]"
        : "bg-white border-border",
    text: theme === "dark" ? "text-white" : "text-foreground",
    muted: theme === "dark" ? "text-white/60" : "text-foreground/60",
    buttonBg: theme === "dark" ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10",
    inputBg: theme === "dark" ? "bg-black/20" : "bg-black/5",
  };

  // --- Groq (cloud) state ---
  const [groqResult, setGroqResult] = useState<string | any>(null);
  const [groqStatus, setGroqStatus] = useState<GroqStatus>("idle");
  const [groqError, setGroqError] = useState<string | null>(null);
  const [useCloud, setUseCloud] = useState(true);

  // --- Client-side fallback (Transformers.js) ---
  const taskMap: Record<string, "summarize" | "recap" | "ask" | "embed" | "quiz"> = {
    summary: "summarize",
    recap: "recap",
    chat: "embed",
    quiz: "quiz",
  };
  const ai = useAI(taskMap[action] as any);

  // --- Chat State ---
  const [chatLog, setChatLog] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [chatQuery, setChatQuery] = useState("");
  const [chatEmbeddings, setChatEmbeddings] = useState<{ text: string; vector: number[] }[]>([]);
  const [pendingQuery, setPendingQuery] = useState("");
  const currentFlow = useRef<"embedding" | "asking" | null>(null);

  const effectiveStatus = useCloud ? groqStatus : ai.status;
  const effectiveResult = useCloud ? groqResult : ai.result;
  const effectiveError = useCloud ? groqError : ai.error;

  // --- Groq API call ---
  const callGroq = useCallback(
    async (task: string, context: string, question?: string, chapterTitle?: string) => {
      setGroqStatus("loading");
      setGroqError(null);
      setGroqResult(null);
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, context, question, chapterTitle }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          // If Groq is unavailable, fall back to client-side
          if (res.status === 503) {
            setUseCloud(false);
            return;
          }
          throw new Error(body.error || `API error ${res.status}`);
        }
        const data = await res.json();
        setGroqResult(typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2));
        setGroqStatus("ready");
      } catch (err: any) {
        setGroqError(err.message);
        setGroqStatus("error");
      }
    },
    []
  );

  // --- Load embeddings for chat ---
  useEffect(() => {
    if (action === "chat") {
      getCachedEmbeddings(bookId).then((data) => {
        if (data) setChatEmbeddings(data);
      });
    }
  }, [action, bookId]);

  // --- Auto-start simple tasks ---
  useEffect(() => {
    if (action === "chat") return;
    if (useCloud) {
      callGroq(
        action === "summary" ? "summarize" : action,
        textContext.slice(0, 12000)
      );
    } else {
      if (action === "summary") ai.summarize(textContext.slice(0, 4000), `summary-${bookId}`);
      else if (action === "recap") ai.recap(textContext.slice(0, 3000), `recap-${bookId}`);
      else if (action === "quiz") ai.quiz(textContext.slice(0, 2000), `quiz-${bookId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, useCloud]);

  // --- Chat: Groq path ---
  const submitChatGroq = useCallback(async () => {
    if (!chatQuery.trim()) return;
    const q = chatQuery.trim();
    setChatLog((prev) => [...prev, { role: "user", content: q }]);
    setChatQuery("");
    setGroqStatus("loading");
    setGroqError(null);

    // Build RAG context from embeddings via client-side worker
    let ragContext = textContext.slice(0, 6000);
    if (chatEmbeddings.length > 0) {
      // We'll embed the user query client-side, then do top-k lookup, then send context to Groq
      // For simplicity, use basic keyword match as a quick heuristic
      const keywords = q.toLowerCase().split(/\s+/);
      const scored = chatEmbeddings
        .map((e) => ({
          text: e.text,
          score: keywords.reduce((s, kw) => s + (e.text.toLowerCase().includes(kw) ? 1 : 0), 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (scored[0]?.score > 0) {
        ragContext = scored.map((s) => s.text).join("\n\n");
      }
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "ask", context: ragContext, question: q }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setChatLog((prev) => [...prev, { role: "ai", content: data.result }]);
      setGroqStatus("ready");
    } catch (err: any) {
      setChatLog((prev) => [...prev, { role: "ai", content: `Error: ${err.message}` }]);
      setGroqStatus("error");
    }
  }, [chatQuery, textContext, chatEmbeddings]);

  // --- Chat: Client-side fallback path ---
  useEffect(() => {
    if (action === "chat" && !useCloud && ai.status === "ready" && ai.result) {
      if (currentFlow.current === "embedding") {
        currentFlow.current = "asking";
        const topK = getTopKParagraphs(ai.result, chatEmbeddings, 3);
        const contextStr = topK.length > 0 ? topK.join("\n\n") : textContext.slice(0, 2000);
        ai.ask(contextStr, pendingQuery, `ask-${bookId}`);
      } else if (currentFlow.current === "asking") {
        currentFlow.current = null;
        setChatLog((prev) => [...prev, { role: "ai", content: ai.result as string }]);
      }
    }
  }, [action, useCloud, ai.status, ai.result, chatEmbeddings, pendingQuery, textContext, ai, bookId]);

  const submitChatLocal = () => {
    if (!chatQuery.trim() || ai.status === "generating" || ai.status === "loading") return;
    const q = chatQuery.trim();
    setChatLog((prev) => [...prev, { role: "user", content: q }]);
    setChatQuery("");
    setPendingQuery(q);
    currentFlow.current = "embedding";
    ai.embed(q, `embed-${bookId}`);
  };

  const submitChat = useCloud ? submitChatGroq : submitChatLocal;

  // --- Retry handler ---
  const handleRetry = () => {
    if (useCloud) {
      callGroq(
        action === "summary" ? "summarize" : action,
        textContext.slice(0, 12000)
      );
    } else {
      if (action === "summary") ai.summarize(textContext.slice(0, 4000), `summary-${bookId}`);
      else if (action === "recap") ai.recap(textContext.slice(0, 3000), `recap-${bookId}`);
      else if (action === "quiz") ai.quiz(textContext.slice(0, 2000), `quiz-${bookId}`);
    }
  };

  const isLoading = effectiveStatus === "loading" || effectiveStatus === "generating";

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "absolute bottom-0 inset-x-0 z-40 border-t rounded-t-3xl p-5 md:p-6 max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col",
        themeStyle.bg
      )}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className={cn("font-bold capitalize flex items-center gap-2", themeStyle.text)}>
          <Sparkles size={16} className="text-primary" />
          {action}
        </h3>
        <div className="flex items-center gap-2">
          {/* Cloud / Local toggle */}
          <button
            onClick={() => setUseCloud((v) => !v)}
            title={useCloud ? "Using Groq (cloud)" : "Using local (Transformers.js)"}
            className={cn(
              "p-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors",
              themeStyle.buttonBg,
              themeStyle.muted
            )}
          >
            {useCloud ? <Zap size={12} className="text-amber-400" /> : <Cpu size={12} />}
            {useCloud ? "Cloud" : "Local"}
          </button>
          <button onClick={onClose} className={cn("p-1 rounded-full transition-colors", themeStyle.buttonBg, themeStyle.muted)}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* --- SUMMARY / RECAP / QUIZ VIEW --- */}
        {action !== "chat" && (
          <div className="space-y-4">
            <div className="min-h-[120px]">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <p className={cn("text-xs font-semibold tracking-wide uppercase", themeStyle.muted)}>
                    {useCloud ? "Generating with Groq..." : ai.status === "loading" ? `Loading Model (${Math.round(ai.progress?.progress ?? 0)}%)` : "Generating..."}
                  </p>
                </div>
              )}

              {effectiveStatus === "error" && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                  <p className="font-semibold mb-1">Failed to generate</p>
                  <p className="text-xs opacity-80">{effectiveError}</p>
                </div>
              )}

              {effectiveStatus === "ready" && effectiveResult && (
                <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", themeStyle.text)}>
                  {effectiveResult}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/10 justify-end">
              <button
                disabled={!effectiveResult || effectiveStatus !== "ready"}
                onClick={() => {
                  if (effectiveResult) navigator.clipboard.writeText(
                    typeof effectiveResult === "string" ? effectiveResult : JSON.stringify(effectiveResult)
                  ).catch(() => {});
                }}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50", themeStyle.buttonBg, themeStyle.text)}
              >
                <Copy size={14} /> Copy
              </button>
              <button
                disabled={isLoading}
                onClick={handleRetry}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50", themeStyle.buttonBg, themeStyle.text)}
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Retry
              </button>
            </div>
          </div>
        )}

        {/* --- CHAT VIEW --- */}
        {action === "chat" && (
          <div className="flex flex-col h-[60vh]">
            {chatEmbeddings.length === 0 && (
              <div className={cn("text-xs mb-3 flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary")}>
                <Loader2 size={12} className="animate-spin" />
                No smart index found for this book. Responses will rely on the current chapter only.
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pb-4">
              {chatLog.length === 0 && effectiveStatus !== "loading" && (
                <div className={cn("text-center text-sm py-10 opacity-70", themeStyle.text)}>
                  Ask questions about the book.{" "}
                  {useCloud
                    ? "Groq will answer using relevant book passages."
                    : "RAG will fetch relevant paragraphs to answer you."}
                </div>
              )}
              {chatLog.map((log, i) => (
                <div key={i} className={cn("text-sm p-3 rounded-xl max-w-[90%]", log.role === "user" ? "ml-auto bg-primary text-primary-foreground" : cn("mr-auto", themeStyle.inputBg, themeStyle.text))}>
                  <strong className="text-xs opacity-70 block mb-1">{log.role === "user" ? "You" : "AI"}</strong>
                  {log.content}
                </div>
              ))}
              {isLoading && (
                <div className={cn("text-sm p-3 rounded-xl max-w-[90%] mr-auto flex items-center gap-2", themeStyle.inputBg, themeStyle.text)}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="opacity-70">
                    {useCloud ? "Thinking..." : ai.status === "loading" ? "Loading models..." : `Thinking (${currentFlow.current})...`}
                  </span>
                </div>
              )}
              {effectiveStatus === "error" && (
                <div className="text-destructive text-sm text-center p-2">{effectiveError}</div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-auto">
              <input
                type="text"
                placeholder="Ask a question..."
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitChat()}
                className={cn("flex-1 text-sm rounded-xl px-4 py-3 outline-none", themeStyle.inputBg, themeStyle.text)}
              />
              <button
                onClick={submitChat}
                disabled={!chatQuery.trim() || isLoading}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
