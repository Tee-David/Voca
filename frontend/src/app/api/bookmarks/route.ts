import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookId = req.nextUrl.searchParams.get("bookId");

  const bookmarks = await db.bookmark.findMany({
    where: {
      userId: session.user.id,
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
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, page, text, note, color } = await req.json();

  if (!bookId || page == null || !text)
    return NextResponse.json({ error: "bookId, page, and text are required" }, { status: 400 });

  const book = await db.book.findFirst({
    where: { id: bookId, userId: session.user.id },
  });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const bookmark = await db.bookmark.create({
    data: {
      userId: session.user.id,
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
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.bookmark.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
