import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password)
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });

  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const resetToken = await db.passwordResetToken.findFirst({
    where: {
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetToken)
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: resetToken.userId },
    data: { password: hashed },
  });

  await db.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
