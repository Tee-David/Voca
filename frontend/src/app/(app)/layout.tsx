import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Page content — offset for sidebar on desktop, padded for bottom nav on mobile */}
      <main className="lg:ml-[72px] pb-20 lg:pb-0 min-h-dvh">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
