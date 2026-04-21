import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "wedigcreativity@gmail.com";

// GET /api/admin/users — list all users with stats
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          books: true,
          bookmarks: true,
          audiobooks: true,
        },
      },
      progress: {
        orderBy: { lastReadAt: "desc" },
        take: 1,
        select: { lastReadAt: true },
      },
    },
  });

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
    lastActiveAt: u.progress[0]?.lastReadAt ?? null,
    stats: {
      books: u._count.books,
      bookmarks: u._count.bookmarks,
      audiobooks: u._count.audiobooks,
    },
  }));

  return NextResponse.json({ users: result });
}

// POST /api/admin/users — create a new user directly
export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser || sessionUser.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const created = await db.user.create({
    data: { name: name || null, email, password: hashed },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
