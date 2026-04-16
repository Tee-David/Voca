"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, WifiOff, RefreshCw, Check } from "lucide-react";
import { VocaMark } from "@/components/brand/VocaLogo";

const HF_URL = process.env.NEXT_PUBLIC_HF_TTS_URL || "";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/library";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  function handleGoogle() {
    setNotice("Google sign-in is coming soon. Use email & password for now.");
    setTimeout(() => setNotice(""), 3500);
  }

  return (
    <div className="w-full max-w-[420px] flex flex-col">
      <div className="flex-1 flex flex-col justify-center">

        {/* Mobile logo — only visible on small screens */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <VocaMark size={40} />
          <span className="font-extrabold text-xl tracking-tight text-foreground">Voca</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Sign in to your account to continue listening
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </div>
          )}
          {notice && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-xl px-4 py-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {notice}
            </div>
          )}

          {/* Email */}
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="text-sm font-semibold text-foreground block mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember / forgot row */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span
                className={`h-4 w-4 rounded border flex items-center justify-center transition ${
                  remember
                    ? "bg-primary border-primary"
                    : "bg-background border-input hover:border-primary/60"
                }`}
              >
                {remember && <Check size={12} strokeWidth={3} className="text-primary-foreground" />}
              </span>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm text-foreground">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-primary font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/35 disabled:opacity-60 transition mt-1"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              : <>Sign in <ArrowRight size={16} /></>
            }
          </button>

          {/* OR divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wider">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 bg-background border border-input rounded-xl py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          {/* TTS server status */}
          {HF_URL && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {ttsStatus === "checking" && (
                <><RefreshCw size={11} className="animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Connecting to server…</span></>
              )}
              {ttsStatus === "waking" && (
                <><RefreshCw size={11} className="animate-spin text-amber-500" /><span className="text-xs text-amber-500">TTS server waking up…</span></>
              )}
              {ttsStatus === "online" && (
                <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span><span className="text-xs text-green-600">TTS server online</span></>
              )}
              {ttsStatus === "offline" && (
                <><WifiOff size={11} className="text-destructive" /><span className="text-xs text-destructive">TTS offline — using browser TTS</span></>
              )}
            </div>
          )}

          {/* Sign up link */}
          <div className="pt-2 text-center">
            <p className="text-sm text-muted-foreground">
              New to Voca?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
