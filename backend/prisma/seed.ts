import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

faker.seed(12345);

const TAGS = [
  { name: "Fantasy", slug: "fantasy" },
  { name: "Science Fiction", slug: "science-fiction" },
  { name: "Horror", slug: "horror" },
  { name: "Romance", slug: "romance" },
  { name: "Mystery", slug: "mystery" },
  { name: "Comedy", slug: "comedy" },
  { name: "Drama", slug: "drama" },
  { name: "Thriller", slug: "thriller" },
  { name: "Adventure", slug: "adventure" },
  { name: "Historical", slug: "historical" },
  { name: "Supernatural", slug: "supernatural" },
  { name: "Slice of Life", slug: "slice-of-life" },
];

const STORY_STATUSES = ["PUBLISHED", "DRAFT"] as const;

const USER_COUNT = 50;
const STORIES_PER_USER_MIN = 3;
const STORIES_PER_USER_MAX = 12;
const COMMENTS_PER_STORY_MIN = 0;
const COMMENTS_PER_STORY_MAX = 8;
const LIKES_PER_STORY_MIN = 0;
const LIKES_PER_STORY_MAX = 20;
const FOLLOWS_PER_USER_MIN = 1;
const FOLLOWS_PER_USER_MAX = 8;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomUnique<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];

  while (copy.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }

  return result;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createStoryContent(title: string): string {
  const paragraphs = Array.from({ length: randomInt(4, 9) }, () =>
    faker.lorem.paragraphs(randomInt(1, 3), "\n\n")
  );

  return `${title}\n\n${paragraphs.join("\n\n")}`;
}

async function seedTags() {
  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
  }

  return prisma.tag.findMany();
}

async function seedFixedUsers() {
  const adminHash = await bcrypt.hash("admin123!", 12);
  const userHash = await bcrypt.hash("user1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@stories.dev" },
    update: {},
    create: {
      email: "admin@stories.dev",
      username: "admin",
      passwordHash: adminHash,
      role: "ADMIN",
      bio: "Platform administrator",
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "writer@stories.dev" },
    update: {},
    create: {
      email: "writer@stories.dev",
      username: "storyteller",
      passwordHash: userHash,
      bio: "I love writing short stories!",
    },
  });

  console.log("Fixed users seeded");
  return [admin, demoUser];
}

async function seedGeneratedUsers(passwordHash: string) {
  const users = [];

  for (let i = 1; i <= USER_COUNT; i++) {
    const username = faker.internet.username().toLowerCase() + i;
    const email = `user${i}@stories.dev`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        username,
        passwordHash,
        bio: faker.lorem.sentence(),
      },
    });

    users.push(user);
  }

  console.log(`${users.length} generated users seeded`);
  return users;
}

async function seedStories(users: { id: number }[], tags: { id: number }[]) {
  const allStories: { id: number; authorId: number; title: string }[] = [];

  for (const user of users) {
    const storyCount = randomInt(STORIES_PER_USER_MIN, STORIES_PER_USER_MAX);

    for (let i = 0; i < storyCount; i++) {
      const title = faker.book.title();
      const summary = faker.lorem.sentences(2);
      const content = createStoryContent(title);
      const status = Math.random() < 0.8 ? "PUBLISHED" : "DRAFT";
      const selectedTags = pickRandomUnique(tags, randomInt(1, 3));

      const existing = await prisma.story.findFirst({
        where: {
          title,
          authorId: user.id,
        },
      });

      let story;

      if (existing) {
        story = existing;
      } else {
        story = await prisma.story.create({
          data: {
            title,
            summary,
            content,
            status,
            authorId: user.id,
            tags: {
              create: selectedTags.map((tag) => ({
                tagId: tag.id,
              })),
            },
          },
        });
      }

      allStories.push({
        id: story.id,
        authorId: story.authorId,
        title: story.title,
      });
    }
  }

  console.log(`${allStories.length} stories seeded`);
  return allStories;
}

async function seedComments(
  users: { id: number }[],
  stories: { id: number; authorId: number }[]
) {
  for (const story of stories) {
    const count = randomInt(COMMENTS_PER_STORY_MIN, COMMENTS_PER_STORY_MAX);
    const commenters = pickRandomUnique(
      users.filter((u) => u.id !== story.authorId),
      Math.min(count, users.length - 1)
    );

    for (const commenter of commenters) {
      await prisma.comment.create({
        data: {
          content: faker.lorem.sentences(randomInt(1, 3)),
          storyId: story.id,
          authorId: commenter.id,
        },
      });
    }
  }

  console.log("Comments seeded");
}

async function seedLikes(
  users: { id: number }[],
  stories: { id: number; authorId: number }[]
) {
  for (const story of stories) {
    const likeCount = Math.min(
      randomInt(LIKES_PER_STORY_MIN, LIKES_PER_STORY_MAX),
      users.length - 1
    );

    const likers = pickRandomUnique(
      users.filter((u) => u.id !== story.authorId),
      likeCount
    );

    for (const liker of likers) {
      await prisma.like.upsert({
        where: {
          storyId_userId: {
            userId: liker.id,
            storyId: story.id,
          },
        },
        update: {},
        create: {
          userId: liker.id,
          storyId: story.id,
        },
      });
    }
  }

  console.log("Likes seeded");
}

async function seedFollows(users: { id: number }[]) {
  for (const user of users) {
    const followTargets = pickRandomUnique(
      users.filter((u) => u.id !== user.id),
      randomInt(FOLLOWS_PER_USER_MIN, FOLLOWS_PER_USER_MAX)
    );

    for (const target of followTargets) {
      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: target.id,
          },
        },
        update: {},
        create: {
          followerId: user.id,
          followingId: target.id,
        },
      });
    }
  }

  console.log("Follows seeded");
}

async function seedSeries(
  users: { id: number }[],
  stories: { id: number; authorId: number; title: string }[]
) {
  for (const user of users) {
    const userStories = stories.filter((s) => s.authorId === user.id);

    if (userStories.length < 2) continue;
    if (Math.random() > 0.4) continue;

    const seriesTitle = faker.book.series();
    const seriesSlug = `${slugify(seriesTitle)}-${faker.string.alphanumeric(5).toLowerCase()}`;

    const existing = await prisma.series.findUnique({
      where: { slug: seriesSlug },
    });

    if (existing) continue;

    const chosenStories = pickRandomUnique(
      userStories,
      randomInt(2, Math.min(5, userStories.length))
    );

    await prisma.series.create({
      data: {
        title: seriesTitle,
        slug: seriesSlug,
        description: faker.lorem.paragraph(),
        authorId: user.id,
        stories: {
          create: chosenStories.map((story, index) => ({
            storyId: story.id,
            order: index + 1,
          })),
        },
      },
    });
  }

  console.log("Series seeded");
}

async function seedStoryLists(
  users: { id: number }[],
  stories: { id: number }[]
) {
  for (const user of users) {
    const defaultLists = [
      { name: "Favorites", isDefault: true, isPublic: false },
      { name: "Read Later", isDefault: true, isPublic: false },
    ];

    for (const list of defaultLists) {
      const exists = await prisma.storyList.findFirst({
        where: { ownerId: user.id, name: list.name },
      });

      if (!exists) {
        await prisma.storyList.create({
          data: {
            name: list.name,
            isDefault: list.isDefault,
            isPublic: list.isPublic,
            ownerId: user.id,
          },
        });
      }
    }

    if (Math.random() < 0.35) {
      const publicListName = faker.helpers.arrayElement([
        "Staff Picks",
        "Late Night Reads",
        "Best Worldbuilding",
        "Dark Favourites",
        "Weekend Reads",
      ]);

      const exists = await prisma.storyList.findFirst({
        where: { ownerId: user.id, name: publicListName },
      });

      if (!exists) {
        const selectedStories = pickRandomUnique(
          stories.filter(() => true),
          randomInt(2, 6)
        );

        await prisma.storyList.create({
          data: {
            name: publicListName,
            description: faker.lorem.sentence(),
            isPublic: true,
            isDefault: false,
            ownerId: user.id,
            items: {
              create: selectedStories.map((story) => ({
                storyId: story.id,
              })),
            },
          },
        });
      }
    }
  }

  console.log("Story lists seeded");
}

async function main() {
  console.log("Seeding started...");

  const tags = await seedTags();

  const fixedUsers = await seedFixedUsers();
  const commonPasswordHash = await bcrypt.hash("password123!", 12);
  const generatedUsers = await seedGeneratedUsers(commonPasswordHash);

  const users = [...fixedUsers, ...generatedUsers];

  const stories = await seedStories(users, tags);
  await seedComments(users, stories);
  await seedLikes(users, stories);
  await seedFollows(users);
  await seedSeries(users, stories);
  await seedStoryLists(users, stories);

  console.log("Seed complete!");
  console.log("Admin user: admin@stories.dev / admin123!");
  console.log("Demo user: writer@stories.dev / user1234!");
  console.log("Generated users: user1@stories.dev ... user50@stories.dev / password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });