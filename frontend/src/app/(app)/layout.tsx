import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Page content — padded bottom for nav + player bar */}
      <main className="flex-1 pb-28">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
