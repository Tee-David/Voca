import { VocaVisualPanel } from "@/components/auth/VocaVisualPanel";
import { MobileAuthHero } from "@/components/auth/MobileAuthHero";
import { MobileAuthDrawer } from "@/components/auth/MobileAuthDrawer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Desktop: two-column grid ─────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-2 h-screen overflow-hidden bg-background">
        <VocaVisualPanel />
        <div className="relative h-full flex items-center justify-center p-6 overflow-y-auto lg:p-12">
          {children}
        </div>
      </div>

      {/* ── Mobile: hero background + bottom sheet drawer ── */}
      <MobileAuthHero />
      <MobileAuthDrawer>
        {children}
      </MobileAuthDrawer>
    </>
  );
}
