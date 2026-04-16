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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 dark:bg-card/95 backdrop-blur-xl border-t border-border/60">
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/library" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center justify-center"
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
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
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
      </div>
    </nav>
  );
}
