import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await db.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  if (!prefs) {
    const created = await db.userPreferences.create({
      data: { userId: session.user.id },
    });
    return NextResponse.json(created);
  }

  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (body.defaultVoice !== undefined) allowed.defaultVoice = body.defaultVoice;
  if (body.defaultSpeed !== undefined) allowed.defaultSpeed = Number(body.defaultSpeed);
  if (body.defaultPitch !== undefined) allowed.defaultPitch = Number(body.defaultPitch);
  if (body.stability !== undefined) allowed.stability = Number(body.stability);
  if (body.autoScroll !== undefined) allowed.autoScroll = Boolean(body.autoScroll);
  if (body.highlightWords !== undefined) allowed.highlightWords = Boolean(body.highlightWords);
  if (body.theme !== undefined) allowed.theme = String(body.theme);
  if (body.emailNotifs !== undefined) allowed.emailNotifs = Boolean(body.emailNotifs);

  const prefs = await db.userPreferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...allowed },
    update: allowed,
  });

  return NextResponse.json(prefs);
}
