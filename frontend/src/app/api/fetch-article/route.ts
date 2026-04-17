import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

/**
 * POST /api/fetch-article
 * Server-side fetch + Readability extract for "Paste a link" import flow.
 *
 * Body: { url: string }
 * Returns: { title, byline, excerpt, content (plain text), length }
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the page
    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Voca/1.0; +https://voca.app) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page (${res.status})` },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Parse with Readability
    const dom = new JSDOM(html, { url: parsedUrl.toString() });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent?.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable content from this page" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: article.title || parsedUrl.hostname,
      byline: article.byline || null,
      excerpt: article.excerpt || null,
      content: article.textContent.trim(),
      length: article.length || article.textContent.trim().length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
