import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, currentPage, currentPosition, percentComplete, totalTimeSec } =
    await req.json();

  if (!bookId)
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });

  const progress = await db.readingProgress.upsert({
    where: { bookId },
    create: {
      bookId,
      userId: user.id,
      currentPage: currentPage ?? 0,
      currentPosition: currentPosition ?? 0,
      percentComplete: percentComplete ?? 0,
      totalTimeSec: totalTimeSec ?? 0,
    },
    update: {
      currentPage: currentPage ?? undefined,
      currentPosition: currentPosition ?? undefined,
      percentComplete: percentComplete ?? undefined,
      totalTimeSec: totalTimeSec ?? undefined,
    },
  });

  return NextResponse.json(progress);
}
