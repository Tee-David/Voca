import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "wedigcreativity@gmail.com";

// DELETE /api/admin/users/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting own account
  const targetUser = await db.user.findUnique({ where: { id }, select: { email: true } });
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetUser.email === ADMIN_EMAIL) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/users/[id] — update name or reset password
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, string> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.password) {
    const bcrypt = await import("bcryptjs");
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
