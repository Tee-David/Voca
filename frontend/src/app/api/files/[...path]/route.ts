import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await params;
  const r2Key = path.join("/");

  const book = await db.book.findFirst({
    where: { r2Key, userId: session.user.id },
    select: { id: true, fileType: true },
  });

  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: r2Key,
  });

  const obj = await r2.send(cmd);
  if (!obj.Body) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const bytes = await obj.Body.transformToByteArray();
  const buffer = Buffer.from(bytes);

  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    epub: "application/epub+zip",
    txt: "text/plain; charset=utf-8",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentTypes[book.fileType] || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
