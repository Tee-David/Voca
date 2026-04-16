"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={cn("w-[104px] h-8", className)} />;

  const options = [
    { value: "light", icon: Sun },
    { value: "system", icon: Monitor },
    { value: "dark", icon: Moon },
  ] as const;

  return (
    <div className={cn("flex items-center gap-0.5 p-1 rounded-xl bg-muted/60", className)}>
      {options.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={value.charAt(0).toUpperCase() + value.slice(1)}
        >
          <Icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
