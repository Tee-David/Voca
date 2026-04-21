import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await db.userPreferences.findUnique({
    where: { userId: user.id },
  });

  if (!prefs) {
    const created = await db.userPreferences.create({
      data: { userId: user.id },
    });
    return NextResponse.json(created);
  }

  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user)
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
    where: { userId: user.id },
    create: { userId: user.id, ...allowed },
    update: allowed,
  });

  return NextResponse.json(prefs);
}
