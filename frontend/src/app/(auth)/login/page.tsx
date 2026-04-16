"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, WifiOff, RefreshCw } from "lucide-react";

const HF_URL = process.env.NEXT_PUBLIC_HF_TTS_URL || "";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/library";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ttsStatus, setTtsStatus] = useState<"checking" | "online" | "waking" | "offline">("checking");

  const checkTTS = useCallback(async () => {
    if (!HF_URL) { setTtsStatus("online"); return; }
    try {
      const res = await fetch(`${HF_URL}/health`, { signal: AbortSignal.timeout(5000) });
      setTtsStatus(res.ok ? "online" : "waking");
    } catch {
      setTtsStatus((p) => {
        if (p === "checking") setTimeout(checkTTS, 4000);
        return "waking";
      });
    }
  }, []);

  useEffect(() => { checkTTS(); }, [checkTTS]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <span className="text-3xl font-black text-white">V</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue listening</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 text-sm font-semibold shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-60 transition mt-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          {/* TTS server status */}
          {HF_URL && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {ttsStatus === "checking" && <><RefreshCw size={11} className="animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking TTS server…</span></>}
              {ttsStatus === "waking" && <><RefreshCw size={11} className="animate-spin text-amber-500" /><span className="text-xs text-amber-500">TTS server waking up…</span></>}
              {ttsStatus === "online" && <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span><span className="text-xs text-green-600">TTS server online</span></>}
              {ttsStatus === "offline" && <><WifiOff size={11} className="text-destructive" /><span className="text-xs text-destructive">TTS offline — using browser TTS</span></>}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          New to Voca?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh"><Loader2 className="animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
