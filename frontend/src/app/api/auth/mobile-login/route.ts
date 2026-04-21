import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { MOBILE_JWT_SALT } from "@/lib/session";

const MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(req: Request) {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await encode({
    token: { id: user.id, email: user.email, name: user.name },
    secret,
    salt: MOBILE_JWT_SALT,
    maxAge: MAX_AGE,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
    expiresIn: MAX_AGE,
  });
}
