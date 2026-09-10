import { NextResponse } from "next/server";

/**
 * Minimal fixed-window rate limiter.
 *
 * There was no rate limiting anywhere, which left several routes as cheap
 * denial-of-service and abuse vectors:
 *   - /api/auth/{register,mobile-login} and /api/user/password each run bcrypt
 *     at cost 12 (~250ms of Node CPU) inside the request path
 *   - /api/auth/forgot-password minted unbounded token rows per email
 *   - /api/ai proxies a paid Groq key with no per-user quota
 *   - /api/fetch-article made unbounded outbound requests
 *
 * Caveat, stated honestly: this is per-instance in-memory state. Vercel runs
 * many warm lambdas, so the effective limit is (limit x instances) and counters
 * reset on cold start. That is a large improvement over no limit at all, but it
 * is not a substitute for the shared-store limiter in the new server (plan
 * §3.5). Do not treat these numbers as hard guarantees.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drop expired buckets so the map can't grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, limit, remaining: limit - 1, retryAfterSec: 0 };
  }

  existing.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { ok: false, limit, remaining: 0, retryAfterSec };
  }
  return { ok: true, limit, remaining: limit - existing.count, retryAfterSec };
}

/** Best-effort client IP. Spoofable, so pair with a per-identity limit. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Apply one or more limits. Returns a 429 response if any is exceeded,
 * otherwise null. Checks all limits so a caller can combine per-IP and
 * per-identity windows.
 */
export function enforce(
  limits: { key: string; limit: number; windowSec: number }[],
): NextResponse | null {
  let worst: RateLimitResult | null = null;

  for (const { key, limit, windowSec } of limits) {
    const result = rateLimit(key, limit, windowSec);
    if (!result.ok && (!worst || result.retryAfterSec > worst.retryAfterSec)) {
      worst = result;
    }
  }

  if (!worst) return null;

  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(worst.retryAfterSec),
        "RateLimit-Limit": String(worst.limit),
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(worst.retryAfterSec),
      },
    },
  );
}
