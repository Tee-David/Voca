"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";

interface MobileAuthDrawerProps {
  children: React.ReactNode;
}

// Snap points as fraction of viewport height the drawer occupies
const SNAP_OPEN = 0.80;   // fully open
const SNAP_PEEK = 0.08;   // just a handle peeking

export function MobileAuthDrawer({ children }: MobileAuthDrawerProps) {
  const [vh, setVh] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    const set = () => setVh(window.innerHeight);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Auto-open after mount
  useEffect(() => {
    if (vh === 0) return;
    const t = setTimeout(() => {
      setIsOpen(true);
      controls.start({ y: -vh * SNAP_OPEN, transition: { type: "spring", stiffness: 260, damping: 28 } });
    }, 200);
    return () => clearTimeout(t);
  }, [vh, controls]);

  function snapTo(open: boolean) {
    const target = open ? SNAP_OPEN : SNAP_PEEK;
    setIsOpen(open);
    controls.start({ y: -vh * target, transition: { type: "spring", stiffness: 300, damping: 30 } });
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (vh === 0) return;
    const currentFraction = (-(isOpen ? -vh * SNAP_OPEN : -vh * SNAP_PEEK) + info.offset.y) / vh;
    const projected = currentFraction + info.velocity.y * 0.001;
    snapTo(projected < -(SNAP_OPEN + SNAP_PEEK) / 2);
  }

  if (vh === 0) return null;

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: -vh * SNAP_OPEN, bottom: -vh * SNAP_PEEK }}
      dragElastic={0.05}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ y: -vh * SNAP_PEEK }}
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{ top: "100%" }}
    >
      {/* Sheet surface */}
      <div className="bg-background rounded-t-3xl shadow-2xl shadow-black/30 min-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <button
          onClick={() => snapTo(!isOpen)}
          className="flex justify-center pt-4 pb-2 w-full"
          aria-label={isOpen ? "Collapse form" : "Expand form"}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </button>

        {/* Form content */}
        <div className="flex-1 flex items-start justify-center px-6 pt-4 pb-10 overflow-y-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
