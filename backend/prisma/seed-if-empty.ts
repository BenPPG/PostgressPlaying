import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log("Database is empty, running seed...");
    execSync("tsx prisma/seed.ts", { stdio: "inherit" });
  } else {
    console.log(`Database already has ${userCount} users, skipping seed.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
