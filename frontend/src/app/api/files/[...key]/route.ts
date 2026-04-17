import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const objectKey = key.join("/");

    if (!objectKey) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const owns = await db.book.findFirst({
      where: { r2Key: objectKey, userId: session.user.id },
      select: { id: true },
    });
    if (!owns) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const BUCKET = process.env.R2_BUCKET_NAME!;

    // Forward client Range header to R2 so pdfjs can open pages progressively
    const rangeHeader = req.headers.get("range") ?? undefined;

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const response = await r2.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "Object body is empty" }, { status: 404 });
    }

    const stream = response.Body.transformToWebStream();

    const headers = new Headers();
    if (response.ContentType) headers.set("Content-Type", response.ContentType);
    if (response.ContentLength) headers.set("Content-Length", response.ContentLength.toString());
    if (response.ContentRange) headers.set("Content-Range", response.ContentRange);
    if (response.AcceptRanges) headers.set("Accept-Ranges", response.AcceptRanges);
    else headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=86400, immutable");

    // 206 Partial Content when Range was served; 200 otherwise
    const status = rangeHeader && response.ContentRange ? 206 : 200;
    return new NextResponse(stream, { status, headers });
  } catch (error: any) {
    console.error("Proxy file fetch error:", error);
    return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
  }
}

import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const objectKey = key.join("/");

    if (!objectKey) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const bodyBuffer = await req.arrayBuffer();
    const BUCKET = process.env.R2_BUCKET_NAME!;
    
    // Instead of streaming which is sometimes finicky in Next.js middleware, 
    // we use arrayBuffer since books are generally < 20MB.
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      Body: Buffer.from(bodyBuffer),
      ContentType: req.headers.get("Content-Type") || "application/octet-stream",
    });

    await r2.send(command);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Proxy file upload error:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}

