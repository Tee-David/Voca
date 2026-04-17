import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://2d711a476e3b0a13d5ab8d5c68a81735.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: "1ec1af523742f0d6109601ec9ac0252a",
    secretAccessKey: "0c72920fa7c3cad01d5a6ef2d939ecef4617089beeb396c333655fdd7d7b782c",
  },
});

async function setCors() {
  const command = new PutBucketCorsCommand({
    Bucket: "voca",
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*", "https://voca-cyan.vercel.app", "http://localhost:3000"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  try {
    await s3.send(command);
    console.log("CORS updated successfully.");
  } catch (err) {
    console.error("Error setting CORS:", err);
  }
}

setCors();
