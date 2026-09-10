import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { clientIp, enforce } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body as { email?: unknown }).email;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const trimmedEmail = email.trim();
  // Case-folded for the rate-limit key only — see mobile-login.
  const rateKeyEmail = trimmedEmail.toLowerCase();

  // Was unbounded: one row per request, forever, per email.
  const limited = enforce([
    { key: `reset:email:${rateKeyEmail}`, limit: 3, windowSec: 3600 },
    { key: `reset:ip:${clientIp(req)}`, limit: 10, windowSec: 3600 },
  ]);
  if (limited) return limited;

  const user = await db.user.findUnique({ where: { email: trimmedEmail } });

  // Always return success to prevent email enumeration.
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate any outstanding tokens so only the newest link works.
  await db.$transaction([
    db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    }),
  ]);

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  // There is no mailer configured. Password reset is therefore NOT functional
  // in production: the link never reaches the user, and writing it to stdout
  // puts a live credential into the platform logs. Fail loudly rather than
  // pretending this worked. (Plan: the new server makes SMTP_URL a required
  // env var in production, so this state cannot ship.)
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[RESET] No mailer configured — reset link generated but NOT delivered. " +
        "Configure SMTP before relying on password reset.",
    );
  } else {
    console.log(`[RESET] ${trimmedEmail} -> ${resetUrl}`);
  }

  return NextResponse.json({ ok: true });
}
