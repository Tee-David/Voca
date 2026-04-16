"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Headphones, BookAudio, Settings } from "lucide-react";
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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 dark:bg-card/95 backdrop-blur-xl border-t border-border/40">
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/library" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground px-4 py-2.5"
                  : "text-muted-foreground hover:text-foreground px-3 py-2.5"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {active && (
                <span className="text-sm font-semibold whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-150">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
