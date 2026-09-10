import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { clientIp, enforce } from "@/lib/rateLimit";

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforce([
    { key: `pwchange:user:${sessionUser.id}`, limit: 5, windowSec: 300 },
    { key: `pwchange:ip:${clientIp(req)}`, limit: 20, windowSec: 300 },
  ]);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body as Record<string, unknown>;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const dbUser = await db.user.findUnique({ where: { id: sessionUser.id }, select: { password: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: sessionUser.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
