"use client";

import {
  createContext, useCallback, useContext, useMemo, useRef, useState, useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { onHardwareBack } from "@/lib/native";

type Variant = "bottom" | "right" | "left" | "fullscreen";

interface SheetEntry {
  id: string;
  title: string;
  variant: Variant;
  /** Sheet body. Omit + set `external: true` to let the caller render inline (state stays live). */
  content?: ReactNode;
  /** When true, sheet-stack tracks open/close + esc/back-stack but doesn't render a surface. */
  external?: boolean;
  surfaceClassName?: string;
  onClose?: () => void;
}

interface SheetStackContextValue {
  open: (entry: SheetEntry) => void;
  push: (entry: SheetEntry) => void;
  back: () => void;
  closeAll: () => void;
  closeTop: () => void;
  isOpen: (id: string) => boolean;
  topId: string | null;
}

const SheetStackContext = createContext<SheetStackContextValue | null>(null);

export function useSheetStack() {
  const ctx = useContext(SheetStackContext);
  if (!ctx) throw new Error("useSheetStack must be used within SheetStackProvider");
  return ctx;
}

export function SheetStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetEntry[]>([]);

  const open = useCallback((entry: SheetEntry) => {
    setStack([entry]);
  }, []);

  const push = useCallback((entry: SheetEntry) => {
    setStack((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      top?.onClose?.();
      return prev.slice(0, -1);
    });
  }, []);

  const closeTop = back;

  const closeAll = useCallback(() => {
    setStack((prev) => {
      prev.forEach((e) => e.onClose?.());
      return [];
    });
  }, []);

  const isOpen = useCallback(
    (id: string) => stack.some((e) => e.id === id),
    [stack]
  );

  const topId = stack.length > 0 ? stack[stack.length - 1].id : null;

  // Esc closes top
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeTop(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTop]);

  // Android hardware back / edge-swipe closes top sheet before router/history.back
  useEffect(() => {
    if (stack.length === 0) return;
    return onHardwareBack(() => {
      closeTop();
      return true;
    });
  }, [stack.length, closeTop]);

  const value = useMemo(
    () => ({ open, push, back, closeAll, closeTop, isOpen, topId }),
    [open, push, back, closeAll, closeTop, isOpen, topId]
  );

  return (
    <SheetStackContext.Provider value={value}>
      {children}
      <SheetHost stack={stack} onBack={back} onClose={closeAll} />
    </SheetStackContext.Provider>
  );
}

function SheetHost({
  stack, onBack, onClose,
}: {
  stack: SheetEntry[];
  onBack: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  const renderable = stack.filter((e) => !e.external);
  return createPortal(
    <AnimatePresence>
      {renderable.length > 0 && (
        <>
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-[2px]"
          />
          {renderable.map((entry, idx) => (
            <SheetSurface
              key={entry.id}
              entry={entry}
              isTop={idx === renderable.length - 1}
              canBack={renderable.length > 1}
              onBack={onBack}
              onCloseAll={onClose}
            />
          ))}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function SheetSurface({
  entry, isTop, canBack, onBack, onCloseAll,
}: {
  entry: SheetEntry;
  isTop: boolean;
  canBack: boolean;
  onBack: () => void;
  onCloseAll: () => void;
}) {
  const dragControls = useDragControls();
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      let closed = false;
      if (entry.variant === "right") closed = info.offset.x > 120 || info.velocity.x > 600;
      else if (entry.variant === "left") closed = info.offset.x < -120 || info.velocity.x < -600;
      else closed = info.offset.y > 100 || info.velocity.y > 600;
      if (closed) onCloseAll();
    },
    [entry.variant, onCloseAll]
  );

  if (entry.variant === "left") {
    return (
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: -600, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={cn(
          "fixed top-0 left-0 bottom-0 z-[1001] w-[min(92vw,360px)] bg-card border-r border-border/60 shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          isTop ? "" : "pointer-events-none",
          entry.surfaceClassName
        )}
      >
        <SheetHeader title={entry.title} canBack={canBack} onBack={onBack} onClose={onCloseAll} dragGrip onPointerDownGrip={(e) => dragControls.start(e)} />
        <div className="flex-1 overflow-y-auto px-4 pb-6">{entry.content}</div>
      </motion.div>
    );
  }

  if (entry.variant === "right") {
    return (
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: 0, right: 600 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[1001] w-[min(100vw,420px)] bg-card border-l border-border/60 shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          isTop ? "" : "pointer-events-none",
          entry.surfaceClassName
        )}
      >
        <SheetHeader title={entry.title} canBack={canBack} onBack={onBack} onClose={onCloseAll} dragGrip onPointerDownGrip={(e) => dragControls.start(e)} />
        <div className="flex-1 overflow-y-auto px-4 pb-6">{entry.content}</div>
      </motion.div>
    );
  }

  if (entry.variant === "fullscreen") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed inset-0 z-[1001] bg-background flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          isTop ? "" : "pointer-events-none",
          entry.surfaceClassName
        )}
      >
        <SheetHeader title={entry.title} canBack={canBack} onBack={onBack} onClose={onCloseAll} />
        <div className="flex-1 overflow-y-auto px-4 pb-6">{entry.content}</div>
      </motion.div>
    );
  }

  // bottom (default)
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 600 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      className={cn(
        "fixed left-0 right-0 bottom-0 z-[1001] max-h-[88vh] bg-card border-t border-border/60 shadow-2xl flex flex-col pb-[env(safe-area-inset-bottom)]",
        "rounded-t-[var(--radius-sheet)]",
        isTop ? "" : "pointer-events-none translate-y-2 opacity-90",
        entry.surfaceClassName
      )}
      style={{ animation: "voca-sheet-in 260ms var(--ease-sheet) both" }}
    >
      <div
        className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="w-12 h-1.5 rounded-full bg-muted" />
      </div>
      <SheetHeader title={entry.title} canBack={canBack} onBack={onBack} onClose={onCloseAll} />
      <div className="flex-1 overflow-y-auto px-4 pb-6">{entry.content}</div>
    </motion.div>
  );
}

function SheetHeader({
  title, canBack, onBack, onClose, dragGrip, onPointerDownGrip,
}: {
  title: string;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
  dragGrip?: boolean;
  onPointerDownGrip?: (e: React.PointerEvent) => void;
}) {
  return (
    <div className="sheet-header relative" onPointerDown={dragGrip ? onPointerDownGrip : undefined}>
      <div>
        {canBack ? (
          <button onClick={onBack} aria-label="Back"><ChevronLeft size={18} /></button>
        ) : (
          <span aria-hidden />
        )}
      </div>
      <div>{title}</div>
      <div>
        <button onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
    </div>
  );
}

/**
 * Imperative helper to declaratively open a sheet from within a component tree.
 *
 * Usage:
 *   const sheets = useSheetStack();
 *   sheets.open({ id: "voices", title: "Voices", variant: "bottom", content: <VoiceSelector ... /> });
 */
