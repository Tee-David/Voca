"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Preloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-48 sm:w-56"
          >
            {/*
              The SVG uses hardcoded purple fills. In dark mode we invert the
              letter fill to white via a CSS filter on the text elements.
              We embed a modified version that uses currentColor for letters.
            */}
            <svg width="100%" viewBox="0 0 680 340" role="img" xmlns="http://www.w3.org/2000/svg">
              <title>Voca</title>
              {/* V */}
              <text x="190" y="238" textAnchor="middle" className="fill-[#534AB7] dark:fill-white"
                style={{ fontFamily: "'Arial Rounded MT Bold', Arial, sans-serif", fontSize: 96, fontWeight: 800 }}>V</text>
              {/* O = mic */}
              <ellipse cx="278" cy="193" rx="43" ry="52" fill="none" className="stroke-[#CECBF6] dark:stroke-[#7F77DD]" strokeWidth={13} />
              <path d="M263 244 Q263 273 278 273 Q293 273 293 244" fill="none" className="stroke-[#CECBF6] dark:stroke-[#7F77DD]" strokeWidth={9} strokeLinecap="round" />
              <rect x="266" y="153" width="24" height="50" rx="12" className="fill-[#AFA9EC] dark:fill-[#7F77DD]" />
              <rect x="272" y="166" width="12" height="24" rx="6" fill="#1D9E75" />
              {/* C */}
              <text x="364" y="238" textAnchor="middle" className="fill-[#534AB7] dark:fill-white"
                style={{ fontFamily: "'Arial Rounded MT Bold', Arial, sans-serif", fontSize: 96, fontWeight: 800 }}>C</text>
              {/* A */}
              <text x="436" y="238" textAnchor="middle" className="fill-[#534AB7] dark:fill-white"
                style={{ fontFamily: "'Arial Rounded MT Bold', Arial, sans-serif", fontSize: 96, fontWeight: 800 }}>A</text>
              {/* Sound waves */}
              <g opacity={0.5}>
                <path d="M477 185 Q485 193 477 201" fill="none" className="stroke-[#534AB7] dark:stroke-white" strokeWidth={3} strokeLinecap="round" />
                <path d="M486 176 Q498 193 486 210" fill="none" className="stroke-[#7F77DD] dark:stroke-white/70" strokeWidth={2.5} strokeLinecap="round" />
                <path d="M494 168 Q510 193 494 218" fill="none" className="stroke-[#AFA9EC] dark:stroke-white/50" strokeWidth={2} strokeLinecap="round" />
              </g>
              {/* Tagline */}
              <text x="340" y="308" textAnchor="middle" className="fill-muted-foreground"
                style={{ fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 400, letterSpacing: 2 }}>
                READ ANYTHING. LISTEN ANYWHERE.
              </text>
            </svg>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
