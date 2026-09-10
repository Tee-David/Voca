import { NextResponse, type NextRequest } from "next/server";

/**
 * Exact-origin CORS allowlist for /api/*.
 *
 * This used to accept any origin matching /^https:\/\/(?:[a-z0-9-]+\.)*vercel\.app$/i
 * while also sending Access-Control-Allow-Credentials: true — which let anyone
 * deploy to a free *.vercel.app subdomain and read authenticated responses on
 * behalf of a logged-in visitor. Never reintroduce a pattern match here.
 *
 * Preview deployments must be added by their exact origin via
 * NEXT_PUBLIC_EXTRA_CORS_ORIGINS (comma-separated).
 */
const CAPACITOR_ORIGINS = [
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

const DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function buildAllowlist(): Set<string> {
  const origins = [...CAPACITOR_ORIGINS];

  // The deployed web origin(s). NEXTAUTH_URL is the canonical one.
  for (const raw of [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.NEXT_PUBLIC_EXTRA_CORS_ORIGINS ?? "").split(","),
  ]) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      origins.push(new URL(trimmed).origin);
    } catch {
      // Ignore malformed config rather than allowing everything.
    }
  }

  if (process.env.NODE_ENV !== "production") origins.push(...DEV_ORIGINS);

  return new Set(origins);
}

const ALLOWED_ORIGINS = buildAllowlist();

function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

function applyCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");

  // Always vary on Origin so a shared cache can't serve one origin's
  // CORS headers to another.
  res.headers.set("Vary", "Origin");

  if (isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin!);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.headers.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges");
    res.headers.set("Access-Control-Max-Age", "86400");
  }
  return res;
}

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return applyCors(req, new NextResponse(null, { status: 204 }));
  }
  return applyCors(req, NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"],
};
