import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp, enforce } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, email, password } = body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const trimmedEmail = email.trim();
  // Case-folded for the rate-limit key only — see mobile-login for why the
  // stored address is left as typed.
  const rateKeyEmail = trimmedEmail.toLowerCase();

  // bcrypt at cost 12 is ~250ms of Node CPU per call, so an unthrottled
  // signup endpoint is a cheap CPU-exhaustion vector as well as a spam one.
  const limited = enforce([
    { key: `register:ip:${clientIp(req)}`, limit: 10, windowSec: 60 },
    { key: `register:email:${rateKeyEmail}`, limit: 5, windowSec: 60 },
  ]);
  if (limited) return limited;

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 120) : null,
      email: trimmedEmail,
      password: hashed,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
