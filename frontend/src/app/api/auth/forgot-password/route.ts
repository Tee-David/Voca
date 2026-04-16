import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email)
    return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  // In production, send email with reset link. For now, log it.
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  console.log(`[RESET] ${email} → ${resetUrl}`);

  return NextResponse.json({ ok: true });
}
