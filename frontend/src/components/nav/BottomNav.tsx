"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Library, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/library", label: "Home",    icon: Home },
  { href: "/import",  label: "Import",  icon: Plus },
  { href: "/books",   label: "Library", icon: Library },
  { href: "/voices",  label: "Voices",  icon: Mic },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 dark:bg-card/95 backdrop-blur-xl border-t border-border/40">
      <div className="mx-auto w-full max-w-md flex items-stretch justify-around gap-1 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center h-8 w-12 rounded-full transition-colors",
                  active && "bg-primary/15"
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  className="shrink-0"
                />
              </span>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] leading-none tracking-wide truncate max-w-full px-1",
                  active ? "font-bold" : "font-semibold"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
