import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookId = req.nextUrl.searchParams.get("bookId");

  const bookmarks = await db.bookmark.findMany({
    where: {
      userId: user.id,
      ...(bookId ? { bookId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      book: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(bookmarks);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, page, text, note, color } = await req.json();

  if (!bookId || page == null || !text)
    return NextResponse.json({ error: "bookId, page, and text are required" }, { status: 400 });

  const book = await db.book.findFirst({
    where: { id: bookId, userId: user.id },
  });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const bookmark = await db.bookmark.create({
    data: {
      userId: user.id,
      bookId,
      page,
      text: text.slice(0, 500),
      note: note?.slice(0, 1000) ?? null,
      color: color ?? "yellow",
    },
  });

  return NextResponse.json(bookmark);
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.bookmark.deleteMany({
    where: { id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
