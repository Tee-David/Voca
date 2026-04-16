"use client";

import { VocaMark } from "@/components/brand/VocaLogo";

export function MobileAuthHero() {
  return (
    <div className="lg:hidden fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#0d0b1a] overflow-hidden">
      {/* Purple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a3c] via-[#0d0b1a] to-[#050510]" />
      <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-[#6C63FF]/25 blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-violet-500/20 blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        <VocaMark size={64} className="shadow-2xl shadow-[#6C63FF]/40 mb-5" />
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Voca</h1>
        <p className="text-white/70 text-sm max-w-[280px] leading-relaxed">
          Your documents. Listening made simple.
        </p>
      </div>
    </div>
  );
}
