import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
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

  const range = req.headers.get("range") ?? undefined;

  const cmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: r2Key,
    ...(range ? { Range: range } : {}),
  });

  let obj;
  try {
    obj = await r2.send(cmd);
  } catch {
    return NextResponse.json({ error: "File fetch failed" }, { status: 502 });
  }
  if (!obj.Body) return NextResponse.json({ error: "File empty" }, { status: 404 });

  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    epub: "application/epub+zip",
    txt: "text/plain; charset=utf-8",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  const headers: Record<string, string> = {
    "Content-Type": contentTypes[book.fileType] || "application/octet-stream",
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };
  if (obj.ContentLength != null) headers["Content-Length"] = String(obj.ContentLength);
  if (obj.ContentRange) headers["Content-Range"] = obj.ContentRange;
  if (obj.ETag) headers["ETag"] = obj.ETag;

  // Stream body directly — no in-memory buffering (important for large PDFs on Vercel)
  const stream = (obj.Body as { transformToWebStream?: () => ReadableStream }).transformToWebStream?.();
  if (stream) {
    return new NextResponse(stream, {
      status: range ? 206 : 200,
      headers,
    });
  }

  // Fallback: buffer (only hit if transformToWebStream is unavailable)
  const bytes = await (obj.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return new NextResponse(Buffer.from(bytes), { status: 200, headers });
}
