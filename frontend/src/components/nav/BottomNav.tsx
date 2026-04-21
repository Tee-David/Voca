"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Mic, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/library", label: "Home",    icon: Home },
  { href: "/books",   label: "Library", icon: Library },
  { href: "/voices",  label: "Voices",  icon: Mic },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on reader pages — reader has its own nav
  if (pathname.startsWith("/reader/")) return null;
  const hideFab = pathname.startsWith("/import");

  return (
    <>
      {/* Floating + FAB — bottom-right, above nav */}
      {!hideFab && (
        <Link
          href="/import"
          aria-label="Import new content"
          className={cn(
            "lg:hidden fixed z-50 flex items-center justify-center",
            "right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)]",
            "w-14 h-14 rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-[0_8px_28px_-6px_rgba(67,56,202,0.5)]",
            "hover:shadow-[0_12px_36px_-6px_rgba(67,56,202,0.6)]",
            "active:scale-95",
            "transition-all duration-200"
          )}
        >
          <Plus size={24} strokeWidth={2.5} />
        </Link>
      )}

      {/* Bottom navigation bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 dark:bg-card/95 backdrop-blur-xl border-t border-border/40">
        <div className="mx-auto w-full max-w-md flex items-stretch justify-around gap-1 px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition-colors duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center h-7 w-10 rounded-full transition-colors",
                    active && "bg-primary/15"
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.4 : 2}
                    className="shrink-0"
                  />
                </span>
                <span
                  className={cn(
                    "text-[9px] leading-none tracking-wide truncate max-w-full px-0.5",
                    active ? "font-bold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
