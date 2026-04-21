import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter");
    const sort = url.searchParams.get("sort") || "recent";

    const where: Record<string, unknown> = {
      userId: user.id,
      archivedAt: null,
    };
    if (filter && filter !== "all") where.fileType = filter;

    const orderBy =
      sort === "title"
        ? { title: "asc" as const }
        : sort === "opened"
          ? { lastOpenedAt: "desc" as const }
          : { uploadedAt: "desc" as const };

    const limitParam = url.searchParams.get("limit");
    const take = limitParam ? parseInt(limitParam, 10) : undefined;

    const books = await db.book.findMany({
      where,
      orderBy,
      ...(take && take > 0 ? { take } : {}),
      include: {
        progress: { select: { percentComplete: true, currentPage: true, lastReadAt: true } },
      },
    });

    return NextResponse.json(books);
  } catch (error: any) {
    console.error("LIBRARY ERROR:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
