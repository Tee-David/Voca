"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { VocaMark } from "@/components/brand/VocaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/library": "Library",
  "/player": "Now Playing",
  "/audiobooks": "Audiobooks",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const matchedPath = Object.keys(PAGE_TITLES).find(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const title = matchedPath ? PAGE_TITLES[matchedPath] : "";

  // Hide on reader pages — reader has its own top bar
  if (pathname.startsWith("/reader/")) return null;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto">
        {/* Left: logo (mobile) + page title */}
        <div className="flex items-center gap-3">
          <VocaMark size={32} className="lg:hidden shrink-0" />
          <h1 className="text-lg font-bold text-foreground font-[family-name:var(--font-heading)]">
            {title}
          </h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition relative">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ml-1">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
