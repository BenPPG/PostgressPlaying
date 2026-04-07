import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete in dependency order (children before parents)
  await prisma.follow.deleteMany();
  await prisma.storyListItem.deleteMany();
  await prisma.storyList.deleteMany();
  await prisma.seriesStory.deleteMany();
  await prisma.series.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.storyTag.deleteMany();
  await prisma.story.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleared.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
