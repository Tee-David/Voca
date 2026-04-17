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

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
    });

    const response = await r2.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "Object body is empty" }, { status: 404 });
    }

    // Convert S3's ReadableStream into a DOM ReadableStream for Next.js response
    const stream = response.Body.transformToWebStream();

    const headers = new Headers();
    if (response.ContentType) headers.set("Content-Type", response.ContentType);
    if (response.ContentLength) headers.set("Content-Length", response.ContentLength.toString());
    // Give generous cache headers so it doesn't get repeatedly downloaded
    headers.set("Cache-Control", "public, max-age=86400, immutable");

    return new NextResponse(stream, { headers });
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

