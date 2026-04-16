"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Headphones, BookAudio, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/library",    label: "Library",    icon: Library },
  { href: "/player",     label: "Playing",    icon: Headphones },
  { href: "/audiobooks", label: "Audiobooks", icon: BookAudio },
  { href: "/settings",   label: "Settings",   icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-5 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
      <nav className="pointer-events-auto flex items-center gap-1 bg-background/90 dark:bg-card/90 backdrop-blur-xl border border-border/60 shadow-xl shadow-black/10 rounded-full px-2 py-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/library" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center"
            >
              <motion.div
                className={cn(
                  "flex items-center gap-2 rounded-full transition-colors",
                  active
                    ? "bg-primary text-primary-foreground px-4 py-2.5"
                    : "text-muted-foreground hover:text-foreground px-3 py-2.5"
                )}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <AnimatePresence>
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
