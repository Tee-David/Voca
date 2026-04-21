import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { r2 } from "@/lib/r2";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.R2_BUCKET_NAME!;
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
const BACKEND_KEY = process.env.BACKEND_API_KEY || "";

// POST  → kick off OCR for a book (blocking — waits for OCRmyPDF to finish).
// GET   → return current ocrStatus (for polling).

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, userId: user.id },
    select: { id: true, ocrStatus: true, ocrError: true, ocrUpdatedAt: true, r2Key: true },
  });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(book);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!BACKEND_URL)
    return NextResponse.json(
      { error: "OCR service not configured (BACKEND_URL missing)" },
      { status: 503 }
    );

  const { id } = await params;
  const book = await db.book.findFirst({
    where: { id, userId: user.id },
  });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (book.fileType !== "pdf")
    return NextResponse.json({ error: "OCR only supports PDFs" }, { status: 400 });

  // Accept options from body
  const body = await req.json().catch(() => ({}));
  const language = typeof body.language === "string" ? body.language : "eng";
  const force = body.force === true;

  await db.book.update({
    where: { id },
    data: { ocrStatus: "processing", ocrError: null, ocrUpdatedAt: new Date() },
  });

  try {
    // 1. Pull original PDF from R2
    const srcObj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: book.r2Key }));
    if (!srcObj.Body) throw new Error("Source PDF missing in R2");
    const srcBytes = await srcObj.Body.transformToByteArray();

    // 2. Send to HF Space /ocr
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(srcBytes)], { type: "application/pdf" }), "in.pdf");
    form.append("language", language);
    form.append("force", force ? "true" : "false");

    const ocrRes = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/ocr`, {
      method: "POST",
      body: form,
      headers: BACKEND_KEY ? { Authorization: `Bearer ${BACKEND_KEY}` } : undefined,
      signal: AbortSignal.timeout(15 * 60 * 1000),
    });
    if (!ocrRes.ok) {
      const text = await ocrRes.text().catch(() => "");
      throw new Error(`OCR service ${ocrRes.status}: ${text.slice(0, 500)}`);
    }
    const outBytes = Buffer.from(await ocrRes.arrayBuffer());

    // 3. Write OCR'd PDF back to R2 under pdfs-ocr/<orig-key>
    const newKey = book.r2Key.replace(/^pdfs\//, "pdfs-ocr/");
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: newKey,
        Body: outBytes,
        ContentType: "application/pdf",
      })
    );

    // 4. Flip book to new key, mark done
    await db.book.update({
      where: { id },
      data: {
        r2Key: newKey,
        fileSize: outBytes.byteLength,
        ocrStatus: "done",
        ocrError: null,
        ocrUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, r2Key: newKey, size: outBytes.byteLength });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.book.update({
      where: { id },
      data: {
        ocrStatus: "failed",
        ocrError: message.slice(0, 500),
        ocrUpdatedAt: new Date(),
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
