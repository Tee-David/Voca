import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = "wedigcreativity@gmail.com";
  const password = "securePassword123";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      email,
      password: hashed,
      name: "David (Admin)",
    },
  });

  console.log(`Created user: ${user.email} (${user.id})`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
