"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileAuthHero() {
  const pathname = usePathname();
  const isLogin = pathname === "/login" || pathname.startsWith("/login");

  return (
    <div className="lg:hidden fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#0d0b1a] overflow-hidden">
      {/* Purple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a3c] via-[#0d0b1a] to-[#050510]" />
      <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-[#6C63FF]/20 blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-violet-500/15 blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        {/* Logo */}
        <div className="h-16 w-16 rounded-2xl bg-[#6C63FF] flex items-center justify-center shadow-2xl shadow-[#6C63FF]/40 mb-5">
          <span className="text-3xl font-black text-white">V</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Voca</h1>
        <p className="text-white/60 text-sm max-w-[260px] leading-relaxed">
          Listen to your books and documents with AI-powered voices
        </p>
      </div>
    </div>
  );
}
