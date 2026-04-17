import { PrismaClient } from "@prisma/client";
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

const prisma = new PrismaClient();
async function main() {
  const books = await prisma.book.findMany({ take: 1 });
  console.log("Books DB connected!", books);
}
main().catch(err => console.error("Prisma Error:", err)).finally(() => prisma.$disconnect());
