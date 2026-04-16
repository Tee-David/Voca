"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
      aria-label="Toggle theme"
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{
          rotate: isDark ? 180 : 0,
          scale: isDark ? 0 : 1,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Sun className="h-5 w-5 text-amber-500" />
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{
          rotate: isDark ? 0 : -180,
          scale: isDark ? 1 : 0,
          opacity: isDark ? 1 : 0,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Moon className="h-5 w-5 text-blue-400" />
      </motion.div>
    </button>
  );
}
