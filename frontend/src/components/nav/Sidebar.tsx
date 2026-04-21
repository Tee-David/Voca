"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Plus, Library, Mic, Headphones, Settings, LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import { VocaMark } from "@/components/brand/VocaLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/library",    label: "Home",        icon: Home },
  { href: "/import",     label: "Import",      icon: Plus },
  { href: "/books",      label: "Library",     icon: Library },
  { href: "/voices",     label: "Voices",      icon: Mic },
  { href: "/audiobooks", label: "Audiobooks",  icon: Headphones },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col bg-background border-r border-border/60 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <VocaMark size={40} className="shrink-0" />
        <motion.span
          animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
          transition={{ duration: 0.15 }}
          className="text-lg font-extrabold text-foreground whitespace-nowrap overflow-hidden"
        >
          Voca
        </motion.span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 mt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative",
                  "rounded-2xl",
                  active
                    ? "bg-primary/12 text-primary shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className="shrink-0 ml-0.5" />
                <motion.span
                  animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "text-sm whitespace-nowrap overflow-hidden",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {label}
                </motion.span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-0.5 px-2 pb-3">
        {/* Divider */}
        <div className="h-px bg-border/60 mx-2 mb-1" />

        {bottomItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-all duration-200",
                  "rounded-[var(--radius-lg)]",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className="shrink-0 ml-0.5" />
                <motion.span
                  animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "text-sm whitespace-nowrap overflow-hidden",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {label}
                </motion.span>
              </div>
            </Link>
          );
        })}

        {/* User profile */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 mt-1",
            "rounded-2xl bg-muted/40",
            "transition-colors duration-200 hover:bg-muted/60"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
          <motion.div
            animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {user?.email}
            </p>
          </motion.div>
          <motion.button
            animate={{ opacity: expanded ? 1 : 0, scale: expanded ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1 text-muted-foreground hover:text-destructive transition shrink-0"
            title="Sign out"
          >
            <LogOut size={14} />
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
}
