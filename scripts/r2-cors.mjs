/**
 * Apply the R2 bucket CORS policy from environment variables.
 *
 * Replaces the old frontend/{fix,set}-cors.mjs, which hardcoded live R2
 * credentials into a git-tracked file and set AllowedOrigins to ["*"].
 *
 * Usage:
 *   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET_NAME=voca CORS_ORIGINS=https://voca-cyan.vercel.app,http://localhost:3000 \
 *   node scripts/r2-cors.mjs
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

// Exact origins only. A wildcard here plus credentialed requests is what made
// the bucket world-readable by CORS.
const origins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (!origins.length) {
  console.error("CORS_ORIGINS must list at least one exact origin (comma-separated).");
  process.exit(1);
}
if (origins.includes("*")) {
  console.error('Refusing to apply a wildcard origin. List exact origins instead.');
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const Bucket = process.env.R2_BUCKET_NAME;

await s3.send(
  new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          // PUT is needed for presigned direct uploads; HEAD+GET for Range reads.
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["Content-Type", "Content-Length"],
          // pdf.js needs these exposed or Range loading silently degrades to a
          // full-file download.
          ExposeHeaders: ["Content-Range", "Accept-Ranges", "ETag", "Content-Length"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);

const applied = await s3.send(new GetBucketCorsCommand({ Bucket }));
console.log(`CORS applied to bucket "${Bucket}":`);
console.log(JSON.stringify(applied.CORSRules, null, 2));
