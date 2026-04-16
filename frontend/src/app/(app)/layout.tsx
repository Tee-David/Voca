import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

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
