import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [bookCount, bookmarkCount, audiobookCount, recentBooks, totalListeningTime] =
    await Promise.all([
      db.book.count({ where: { userId } }),
      db.bookmark.count({ where: { userId } }),
      db.audiobook.count({ where: { userId } }),
      db.book.findMany({
        where: { userId, lastOpenedAt: { not: null } },
        orderBy: { lastOpenedAt: "desc" },
        take: 4,
        include: { progress: true },
      }),
      db.readingProgress.aggregate({
        where: { userId },
        _sum: { totalTimeSec: true },
      }),
    ]);

  const totalMinutes = Math.round((totalListeningTime._sum.totalTimeSec ?? 0) / 60);

  return NextResponse.json({
    bookCount,
    bookmarkCount,
    audiobookCount,
    totalMinutes,
    recentBooks,
  });
}
