import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const audiobooks = await db.audiobook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      book: {
        select: { id: true, title: true, author: true, coverColor: true, coverUrl: true },
      },
    },
  });

  return NextResponse.json(audiobooks);
}
