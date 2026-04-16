import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await _req.json();

  if (!body.coverUrl)
    return NextResponse.json({ error: "coverUrl required" }, { status: 400 });

  const book = await db.book.update({
    where: { id, userId: session.user.id },
    data: { coverUrl: body.coverUrl },
  });

  return NextResponse.json({ ok: true, coverUrl: book.coverUrl });
}
