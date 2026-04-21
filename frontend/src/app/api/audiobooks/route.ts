import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const audiobooks = await db.audiobook.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      book: {
        select: { id: true, title: true, author: true, coverColor: true, coverUrl: true },
      },
    },
  });

  return NextResponse.json(audiobooks);
}
