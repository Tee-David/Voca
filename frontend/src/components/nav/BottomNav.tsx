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
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn(
                "text-[10px] whitespace-nowrap",
                active ? "font-bold" : "font-medium"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
