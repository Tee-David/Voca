import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, userId: user.id },
    include: {
      progress: true,
      bookmarks: { orderBy: { page: "asc" } },
    },
  });

  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.book.update({ where: { id }, data: { lastOpenedAt: new Date() } });

  return NextResponse.json(book);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (body.title !== undefined) allowed.title = body.title;
  if (body.author !== undefined) allowed.author = body.author;
  if (body.isFavorite !== undefined) allowed.isFavorite = body.isFavorite;
  if (body.coverUrl !== undefined) allowed.coverUrl = body.coverUrl;
  if (body.pageCount !== undefined) allowed.pageCount = body.pageCount;
  if (body.wordCount !== undefined) allowed.wordCount = body.wordCount;

  const book = await db.book.update({
    where: { id, userId: user.id },
    data: allowed,
  });

  return NextResponse.json(book);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, userId: user.id },
  });

  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteFile(book.r2Key);
  await db.book.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
