import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getUploadUrl } from "@/lib/r2";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/epub+zip": "epub",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

// Step 1: Get presigned URL (no DB record yet)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Step 2: Confirm upload — create the book record
  if (body.confirm && body.r2Key) {
    const { r2Key, title: rawTitle, fileName, fileType, fileSize } = body;
    const cleanName = (fileName ?? "Untitled")
      .replace(/\.[^/.]+$/, "") // remove extension
      .replace(/[_-]+/g, " ") // underscores/dashes to spaces
      .replace(/(\b[A-Fa-f0-9]{20,}\b|\bToaz\.info\b|\bZ-Library\b|\bPDF\b|\bEPUB\b|\(z-lib\.org\))/ig, "") // strip hashes and common tags
      .replace(/\s{2,}/g, " ") // compress spaces
      .trim();
    const title = rawTitle || toTitleCase(cleanName);

    const book = await db.book.create({
      data: {
        userId: user.id,
        title,
        fileType: fileType ?? "pdf",
        r2Key,
        fileSize: fileSize ?? null,
        coverColor: randomCoverColor(),
      },
    });

    return NextResponse.json(book);
  }

  // Step 1: Just return presigned URL
  const { fileName, contentType, fileSize } = body;

  if (!fileName || !contentType)
    return NextResponse.json({ error: "Missing fileName or contentType" }, { status: 400 });

  const fileType = ALLOWED_TYPES[contentType];
  if (!fileType)
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, EPUB, TXT, or DOCX." },
      { status: 400 }
    );

  const r2Key = `pdfs/${user.id}/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(r2Key, contentType);

  return NextResponse.json({ uploadUrl, r2Key, fileType });
}

const COVER_COLORS = [
  "#F5C542", "#E8A838", "#C4563A", "#7B6CF6", "#534AB7",
  "#1D9E75", "#3B82F6", "#EC4899", "#8B5CF6", "#F97316",
];

function randomCoverColor() {
  return COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];
}

function toTitleCase(str: string): string {
  const lower = ["a","an","the","and","but","or","for","nor","on","at","to","by","in","of","up","as","is"];
  return str
    .split(/\s+/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i > 0 && lower.includes(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}
