import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/** Generate a presigned proxy URL for direct browser → R2 upload */
export async function getUploadUrl(key: string, contentType: string) {
  // Use our internal proxy to avoid Cloudflare R2 CORS issues from the browser
  return `/api/files/${key}`;
}

/** Get a public URL for reading a stored file */
export function getPublicUrl(key: string) {
  return `${PUBLIC_URL}/${key}`;
}

/** Generate a presigned URL or proxy URL for direct browser → R2 download */
export async function getDownloadUrl(key: string) {
  // Use our internal proxy to avoid Cloudflare R2 CORS issues from the browser
  return `/api/files/${key}`;
}

/** Delete a file from R2 */
export async function deleteFile(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
