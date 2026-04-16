"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface GridMotionProps {
  items?: (string | React.ReactNode)[];
  gradientColor?: string;
}

const GridMotion = ({ items = [], gradientColor = "black" }: GridMotionProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoOffsets = useRef<number[]>([0, 0, 0, 0]);
  const isHovered = useRef(false);

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, i) => `Item ${i + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);
    const speeds = [0.3, -0.2, 0.25, -0.15];

    const updateMotion = () => {
      rowRefs.current.forEach((row, index) => {
        if (!row) return;
        if (!isHovered.current) {
          autoOffsets.current[index] += speeds[index];
        }
        gsap.to(row, {
          x: autoOffsets.current[index],
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    };

    const removeLoop = gsap.ticker.add(updateMotion);
    return () => { removeLoop(); };
  }, []);

  return (
    <div
      className="grid-motion-noscroll"
      ref={gridRef}
      onMouseEnter={() => { isHovered.current = true; }}
      onMouseLeave={() => { isHovered.current = false; }}
    >
      <section
        className="grid-motion-intro"
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`,
        }}
      >
        <div className="grid-motion-container">
          {[...Array(4)].map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid-motion-row"
              ref={(el) => { rowRefs.current[rowIndex] = el; }}
            >
              {[...Array(7)].map((_, itemIndex) => {
                const content = combinedItems[rowIndex * 7 + itemIndex];
                return (
                  <div key={itemIndex} className="grid-motion-row-item">
                    <div className="grid-motion-row-item-inner">
                      {typeof content === "string" && content.startsWith("http") ? (
                        <div
                          className="grid-motion-row-item-img"
                          style={{ backgroundImage: `url(${content})` }}
                        />
                      ) : (
                        <div className="grid-motion-row-item-content">{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="grid-motion-fullview" />
      </section>
    </div>
  );
};

export default GridMotion;
