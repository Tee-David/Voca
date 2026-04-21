"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Check } from "lucide-react";
import { VocaMark } from "@/components/brand/VocaLogo";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-[420px] flex flex-col">
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <VocaMark size={40} />
          <span className="font-extrabold text-xl tracking-tight text-foreground">Voca</span>
        </div>

        <Link href="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition">
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account with <strong>{email}</strong> exists, we&apos;ve sent a password reset link.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
                Forgot password?
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="text-sm font-semibold text-foreground block mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                  : <><Mail size={16} /> Send reset link</>
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
