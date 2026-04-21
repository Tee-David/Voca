"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />

      <main className="lg:ml-[72px] pb-20 lg:pb-0 min-h-dvh flex flex-col">
        <TopBar />
        <div className="flex-1">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
