import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDownloadUrl, getUploadUrl } from "@/lib/r2";
import { db } from "@/lib/db";

/**
 * Issue a short-lived presigned R2 URL so the browser can fetch directly
 * (one round-trip instead of Browser → Vercel → R2). Ownership is verified
 * against the user's library before signing.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { r2Key, op = "get", contentType } = (await req.json().catch(() => ({}))) as {
    r2Key?: string;
    op?: "get" | "put";
    contentType?: string;
  };
  if (!r2Key) return NextResponse.json({ error: "r2Key required" }, { status: 400 });

  if (op === "get") {
    const owns = await db.book.findFirst({
      where: { r2Key, userId: user.id },
      select: { id: true },
    });
    if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const url = await getDownloadUrl(r2Key);
    return NextResponse.json({ url, expiresIn: 3600 });
  }

  if (op === "put") {
    const url = await getUploadUrl(r2Key, contentType ?? "application/octet-stream");
    return NextResponse.json({ url, expiresIn: 3600 });
  }

  return NextResponse.json({ error: "Invalid op" }, { status: 400 });
}
