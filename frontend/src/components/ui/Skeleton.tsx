"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shimmer-animated skeleton loading placeholder.
 * Use `variant` to pick a shape, `className` for sizing.
 */
export function Skeleton({
  className,
  variant = "rect",
  children,
  loading = true,
}: {
  className?: string;
  variant?: "rect" | "circle" | "text";
  children?: ReactNode;
  loading?: boolean;
}) {
  if (!loading) return <>{children}</>;

  return (
    <div
      className={cn(
        "animate-skeleton bg-gradient-to-r from-muted via-muted/40 to-muted bg-[length:200%_100%] rounded-lg",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded h-4",
        className
      )}
      aria-hidden="true"
    />
  );
}

/** Pre-built skeleton for a single book card in the library grid */
export function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[2/3] rounded-xl" />
      <Skeleton variant="text" className="w-3/4 h-3" />
      <Skeleton variant="text" className="w-1/2 h-2.5" />
    </div>
  );
}

/** Pre-built skeleton for the library grid */
export function LibraryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Pre-built skeleton for a book row in list view */
export function BookRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
      <Skeleton className="w-12 h-16 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-2/3 h-3.5" />
        <Skeleton variant="text" className="w-1/3 h-2.5" />
        <Skeleton variant="text" className="w-1/4 h-2" />
      </div>
      <Skeleton className="w-24 h-1.5 rounded-full hidden sm:block" />
    </div>
  );
}

/** Pre-built skeleton for the reader page content area */
export function ReaderContentSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-4">
      <Skeleton variant="text" className="w-1/3 h-6 mb-6" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn("h-4", i % 4 === 3 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Pre-built skeleton for the voice selector grid */
export function VoiceGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-2">
          <Skeleton variant="circle" className="w-16 h-16" />
          <Skeleton variant="text" className="w-12 h-3" />
          <Skeleton variant="text" className="w-8 h-2" />
        </div>
      ))}
    </div>
  );
}

/** Pre-built skeleton for the AI panel content */
export function AIPanelSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-5/6 h-4" />
      <Skeleton variant="text" className="w-4/5 h-4" />
      <Skeleton variant="text" className="w-2/3 h-4" />
    </div>
  );
}

/** Pre-built skeleton for stats cards */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <Skeleton variant="circle" className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton variant="text" className="w-10 h-5" />
            <Skeleton variant="text" className="w-16 h-2.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
