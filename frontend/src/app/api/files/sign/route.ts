import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDownloadUrl, getUploadUrl } from "@/lib/r2";
import { db } from "@/lib/db";
import { isOwnedKey } from "@/lib/storageKey";

/**
 * Issue a short-lived presigned R2 URL so the browser can talk to R2 directly
 * (one round-trip instead of Browser -> Vercel -> R2).
 *
 * The op:"put" branch previously performed NO validation at all, so any
 * authenticated user could presign a PUT for `pdfs/<anyOtherUserId>/...` and
 * overwrite or plant another user's book file. Both branches now verify the
 * key belongs to the caller.
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

  if (!r2Key) {
    return NextResponse.json({ error: "r2Key required" }, { status: 400 });
  }

  // Structural check first: well-formed, no traversal, inside the caller's
  // own prefix. This is what makes the op:"put" branch safe.
  if (!isOwnedKey(r2Key, user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (op === "get") {
    // Also require a library row, so a user can't read keys under their own
    // prefix that they never actually registered.
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
