import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3/dist-cjs/index.js";
import fs from "fs";

const envStr = fs.readFileSync(".env.local", "utf-8");
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1);
    process.env[key] = val;
  }
});

const s3 = new S3Client({
  region: "weur",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag", "Content-Length", "Accept-Ranges"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });

    await s3.send(command);
    console.log("CORS configuration successfully updated.");
  } catch (err) {
    console.error("Error setting CORS:", err);
  }
}

main();
