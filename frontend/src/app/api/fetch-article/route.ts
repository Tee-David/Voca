import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { getSessionUser } from "@/lib/session";
import { safeFetchHtml, SsrfError } from "@/lib/ssrf";
import { clientIp, enforce } from "@/lib/rateLimit";

/**
 * POST /api/fetch-article
 * Server-side fetch + Readability extract for the "Paste a link" import flow.
 *
 * Body: { url: string }
 * Returns: { title, byline, excerpt, content (plain text), length }
 *
 * This route previously had NO authentication check and validated only the URL
 * protocol, making it an open SSRF proxy. It now requires a session and routes
 * every outbound request through the guard in @/lib/ssrf.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforce([
    { key: `article:user:${user.id}`, limit: 30, windowSec: 3600 },
    { key: `article:ip:${clientIp(req)}`, limit: 60, windowSec: 3600 },
  ]);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const url = (body as { url?: unknown }).url;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const { url: finalUrl, html } = await safeFetchHtml(url);

    const dom = new JSDOM(html, { url: finalUrl.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent?.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable content from this page" },
        { status: 422 },
      );
    }

    const content = article.textContent.trim();

    return NextResponse.json({
      title: article.title || finalUrl.hostname,
      byline: article.byline || null,
      excerpt: article.excerpt || null,
      content,
      length: article.length || content.length,
    });
  } catch (err) {
    if (err instanceof SsrfError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Never echo internal error text back to the caller.
    console.error("fetch-article failed", err);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 502 });
  }
}
