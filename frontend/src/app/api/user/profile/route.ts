import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const user = await db.user.update({
    where: { id: session.user.id },
    data: { name: name || null },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user });
}
