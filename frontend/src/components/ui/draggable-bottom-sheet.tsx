"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface DraggableBottomSheetProps {
  children: React.ReactNode;
  className?: string;
  snapPoints?: number[]; // Percentages of viewport height, e.g. [0.1, 0.5, 0.85]
  defaultSnapPoint?: number;
}

export function DraggableBottomSheet({
  children,
  className,
  snapPoints = [0.1, 0.5, 0.85],
  defaultSnapPoint = 0.5,
}: DraggableBottomSheetProps) {
  const [vh, setVh] = useState(0);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(
    snapPoints.indexOf(defaultSnapPoint) !== -1 ? snapPoints.indexOf(defaultSnapPoint) : 1
  );
  const controls = useAnimation();

  // Initialize VH
  useEffect(() => {
    const updateVh = () => setVh(window.innerHeight);
    updateVh();
    window.addEventListener("resize", updateVh);
    return () => window.removeEventListener("resize", updateVh);
  }, []);

  // Snap to current point when VH changes or index changes
  useEffect(() => {
    if (vh === 0) return;
    const yOffset = -vh * snapPoints[currentSnapIndex];
    controls.start({
      y: yOffset,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    });
  }, [vh, currentSnapIndex, snapPoints, controls]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (vh === 0) return;

      const currentY = -vh * snapPoints[currentSnapIndex] + info.offset.y;

      // Add velocity factor for "throw" effect
      const projectedY = currentY + info.velocity.y * 0.1;

      // Find closest snap point
      let closestIndex = 0;
      let minDistance = Infinity;

      snapPoints.forEach((point, index) => {
        const pointY = -vh * point;
        const distance = Math.abs(projectedY - pointY);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setCurrentSnapIndex(closestIndex);
    },
    [vh, snapPoints, currentSnapIndex]
  );

  if (vh === 0) return null;

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: -vh * snapPoints[snapPoints.length - 1], bottom: -vh * snapPoints[0] }}
      dragElastic={0.1}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ y: -vh * defaultSnapPoint }}
      className={cn(
        "fixed left-0 md:left-[60px] right-0 flex flex-col bg-background border-t border-border shadow-2xl rounded-t-3xl overflow-hidden z-[40]",
        className
      )}
      style={{ 
        height: `${snapPoints[snapPoints.length - 1] * 100}vh`,
        bottom: `-${snapPoints[snapPoints.length - 1] * 100}vh`, // We position it off screen bottom and transform Y up
      }}
    >
      <div className="flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing w-full touch-none bg-background/50 hover:bg-background/80 transition-colors z-10 sticky top-0 backdrop-blur-md border-b border-border/10">
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex-1 overflow-y-auto w-full relative">
        {children}
      </div>
    </motion.div>
  );
}
