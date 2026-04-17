"use client";

import { MessageSquare, FileText, Brain, Rewind } from "lucide-react";
import { cn } from "@/lib/utils";

type ReaderTheme = "light" | "dark" | "sepia";
export type AiAction = "chat" | "summary" | "quiz" | "recap";

interface AiRailProps {
  theme: ReaderTheme;
  active?: AiAction | null;
  onSelect: (action: AiAction) => void;
  variant?: "rail" | "chips";
}

const ITEMS: Array<{ id: AiAction; label: string; icon: typeof MessageSquare; comingSoon?: boolean }> = [
  { id: "chat", label: "Chat", icon: MessageSquare, comingSoon: true },
  { id: "summary", label: "Summary", icon: FileText, comingSoon: true },
  { id: "quiz", label: "Quiz", icon: Brain, comingSoon: true },
  { id: "recap", label: "Recap", icon: Rewind, comingSoon: true },
];

export function AiRail({ theme, active, onSelect, variant = "rail" }: AiRailProps) {
  if (variant === "chips") {
    return (
      <div className="flex flex-wrap gap-2">
        {ITEMS.map(({ id, label, icon: Icon, comingSoon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={cn(
                "pill",
                isActive ? "pill-primary" : "pill-surface",
                comingSoon && "opacity-90"
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
              {comingSoon && (
                <span className="ml-0.5 text-[9px] uppercase tracking-wider opacity-60 font-bold">soon</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop rail — vertical column, hidden under lg
  return (
    <aside
      className={cn(
        "hidden lg:flex fixed z-20 left-[88px] top-1/2 -translate-y-1/2 flex-col gap-2 p-2 rounded-3xl",
        theme === "dark"
          ? "bg-[#1f1f2e]/70 border border-white/5"
          : theme === "sepia"
            ? "bg-[#eedfc4]/70 border border-[#d4c5a9]/40"
            : "bg-card/80 border border-border/50",
        "backdrop-blur-xl shadow-card"
      )}
      aria-label="AI tools"
    >
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              "group relative w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-95",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg"
                : theme === "dark"
                  ? "text-white/75 hover:bg-white/5"
                  : "text-foreground/75 hover:bg-foreground/5"
            )}
            title={label}
          >
            <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
            <span
              className={cn(
                "absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap pointer-events-none",
                "opacity-0 group-hover:opacity-100 transition",
                theme === "dark" ? "bg-[#28283a] text-white" : "bg-foreground text-background"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
