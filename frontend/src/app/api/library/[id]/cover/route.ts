import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(_req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await _req.json();

  if (!body.coverUrl)
    return NextResponse.json({ error: "coverUrl required" }, { status: 400 });

  const book = await db.book.update({
    where: { id, userId: user.id },
    data: { coverUrl: body.coverUrl },
  });

  return NextResponse.json({ ok: true, coverUrl: book.coverUrl });
}
