import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * POST /api/progress — upsert the caller's reading position for a book.
 *
 * This route was an IDOR. ReadingProgress.bookId is @unique, so the upsert ran
 * `where: { bookId }` and its `update` branch carried no userId filter and did
 * no ownership check — any authenticated user who knew or guessed a bookId
 * could overwrite another user's currentPage / percentComplete / totalTimeSec.
 *
 * Fixed by verifying the book belongs to the caller before touching the row.
 *
 * Note: the schema constraint is deliberately left as `bookId @unique` here.
 * Changing it to @@unique([bookId, userId]) turns Book->ReadingProgress from
 * one-to-one into one-to-many, which changes the shape the library routes and
 * the UI already consume. The ownership check above closes the vulnerability;
 * the constraint is corrected properly in the new server, where MediaProgress
 * is @@unique([userId, libraryItemId]) from the start.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { bookId, currentPage, currentPosition, percentComplete, totalTimeSec } =
    body as Record<string, unknown>;

  if (!bookId || typeof bookId !== "string") {
    return NextResponse.json({ error: "Missing bookId" }, { status: 400 });
  }

  // Ownership gate — the check that was missing.
  const book = await db.book.findFirst({
    where: { id: bookId, userId: user.id },
    select: { id: true },
  });
  if (!book) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const progress = await db.readingProgress.upsert({
    where: { bookId },
    create: {
      bookId,
      userId: user.id,
      currentPage: clampInt(currentPage, 0, 100_000) ?? 0,
      currentPosition: clampFloat(currentPosition, 0, Number.MAX_SAFE_INTEGER) ?? 0,
      percentComplete: clampFloat(percentComplete, 0, 100) ?? 0,
      totalTimeSec: clampInt(totalTimeSec, 0, 100_000_000) ?? 0,
    },
    update: {
      currentPage: clampInt(currentPage, 0, 100_000),
      currentPosition: clampFloat(currentPosition, 0, Number.MAX_SAFE_INTEGER),
      percentComplete: clampFloat(percentComplete, 0, 100),
      totalTimeSec: clampInt(totalTimeSec, 0, 100_000_000),
    },
  });

  return NextResponse.json(progress);
}

/**
 * Coerce and bound a numeric field. Returns undefined for absent or unusable
 * values so Prisma leaves the column alone. Guards against the unvalidated
 * numbers the route used to accept (Number("1e999") -> Infinity).
 */
function clampFloat(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, min), max);
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  const n = clampFloat(value, min, max);
  return n === undefined ? undefined : Math.round(n);
}
