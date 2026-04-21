"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";
import { loadStoredAuthToken } from "@/lib/authToken";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const [mobileToken, setMobileToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    loadStoredAuthToken().then(setMobileToken);
  }, []);

  useEffect(() => {
    if (mobileToken === undefined) return;
    if (status === "unauthenticated" && !mobileToken) router.replace("/login");
  }, [status, mobileToken, router]);

  if (mobileToken === undefined) return null;
  if (status !== "authenticated" && !mobileToken) return null;

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
