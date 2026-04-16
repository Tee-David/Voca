import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUploadUrl } from "@/lib/r2";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/epub+zip": "epub",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileName, contentType, fileSize } = await req.json();

  if (!fileName || !contentType)
    return NextResponse.json({ error: "Missing fileName or contentType" }, { status: 400 });

  const fileType = ALLOWED_TYPES[contentType];
  if (!fileType)
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, EPUB, TXT, or DOCX." },
      { status: 400 }
    );

  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  const r2Key = `pdfs/${session.user.id}/${Date.now()}-${fileName}`;

  const uploadUrl = await getUploadUrl(r2Key, contentType);

  const book = await db.book.create({
    data: {
      userId: session.user.id,
      title,
      fileType,
      r2Key,
      fileSize: fileSize ?? null,
      coverColor: randomCoverColor(),
    },
  });

  return NextResponse.json({ uploadUrl, bookId: book.id, r2Key });
}

const COVER_COLORS = [
  "#F5C542", "#E8A838", "#C4563A", "#7B6CF6", "#534AB7",
  "#1D9E75", "#3B82F6", "#EC4899", "#8B5CF6", "#F97316",
];

function randomCoverColor() {
  return COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];
}
