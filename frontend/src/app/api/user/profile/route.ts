import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const updated = await db.user.update({
    where: { id: sessionUser.id },
    data: { name: name || null },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user: updated });
}
