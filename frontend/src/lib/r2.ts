import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/** Presigned URL for uploads (1h TTL). Keeps browser → R2 direct, CORS required on bucket. */
export async function getUploadUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

/** Public URL when bucket is public, otherwise use getDownloadUrl */
export function getPublicUrl(key: string) {
  if (!PUBLIC_URL) throw new Error("R2_PUBLIC_URL not set");
  return `${PUBLIC_URL}/${key}`;
}

/** Presigned URL for downloads (1h TTL). Bypasses the Next.js proxy for direct R2 fetch. */
export async function getDownloadUrl(key: string) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

/** Delete a file from R2 */
export async function deleteFile(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
