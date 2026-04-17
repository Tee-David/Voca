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
      <div className="flex items-center justify-between gap-1 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground px-4 py-2.5 shadow-sm"
                  : "px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 2}
                className="shrink-0"
              />
              {active && (
                <span className="text-[13px] font-bold whitespace-nowrap">
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
