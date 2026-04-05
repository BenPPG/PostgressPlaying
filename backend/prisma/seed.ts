import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create tags
  const tagData = [
    { name: "Fantasy", slug: "fantasy" },
    { name: "Science Fiction", slug: "science-fiction" },
    { name: "Horror", slug: "horror" },
    { name: "Romance", slug: "romance" },
    { name: "Mystery", slug: "mystery" },
    { name: "Comedy", slug: "comedy" },
    { name: "Drama", slug: "drama" },
    { name: "Thriller", slug: "thriller" },
  ];

  for (const tag of tagData) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }
  console.log("Tags seeded");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123!", 12);
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
  console.log("Admin user: admin@stories.dev / admin123!");

  // Create sample user
  const userHash = await bcrypt.hash("user1234!", 12);
  const user = await prisma.user.upsert({
    where: { email: "writer@stories.dev" },
    update: {},
    create: {
      email: "writer@stories.dev",
      username: "storyteller",
      passwordHash: userHash,
      bio: "I love writing short stories!",
    },
  });
  console.log("Sample user: writer@stories.dev / user1234!");

  // Create sample stories
  const tags = await prisma.tag.findMany();
  const fantasyTag = tags.find((t) => t.slug === "fantasy");
  const scifiTag = tags.find((t) => t.slug === "science-fiction");
  const mysteryTag = tags.find((t) => t.slug === "mystery");

  const stories = [
    {
      title: "The Last Dragon's Keeper",
      summary: "In a world where dragons are fading, one keeper must make an impossible choice.",
      content: `The mountain trembled as Elara climbed the final steps to the dragon's lair. Smoke curled from between the ancient stones, but it was thinner now—barely a wisp where once it had been a torrent.

"You came," the dragon said. Its voice was like wind through a canyon, resonant and deep, but so much quieter than she remembered.

Elara set down her pack and looked at the creature that had been her charge for thirty years. Pyraxis was curled around the last clutch of eggs—seven perfect spheres of obsidian that would never hatch.

"The council has made their decision," she said, her voice steady despite the ache in her chest. "They want to move you to the sanctuary."

The dragon's golden eye, larger than Elara's entire body, fixed on her. "A cage. A prettier word for a cage."

"A protected space. The hunters—"

"Let them come." Pyraxis shifted, and the cavern groaned. But even as defiant words left his throat, Elara could see the tremor in his wings. The scales along his flank had dulled from brilliant crimson to a tired rust.

She sat beside him in silence as the sun set through the cave mouth, painting the sky in the colours of dragon fire—one last gift from a world that was forgetting them.

"I'll stay," she whispered. "Whatever you choose, I'll stay."

The dragon closed his great eye and breathed out a plume of warmth that wrapped around her like a blanket.

"I know," he said. "You always do."`,
      status: "PUBLISHED" as const,
      authorId: user.id,
      tagIds: fantasyTag ? [fantasyTag.id] : [],
    },
    {
      title: "Signal from Proxima",
      summary: "When Earth receives a message from the nearest star, nothing is ever the same.",
      content: `Dr. Mei Chen stared at the monitor and felt the floor drop from under her feet.

The signal had arrived at 3:47 AM, slipping in through the noise like a whisper at a party. The automated systems had flagged it. Then flagged it again. Then flagged it a third time and woken her up.

"This can't be real," she muttered, running the analysis for the fourth time. But the numbers didn't lie. The signal came from Proxima Centauri, 4.24 light-years away, and it was structured—unmistakably, impossibly structured.

By dawn, the lab was full. By noon, the president had called. By evening, every major news outlet on Earth had the same headline: WE ARE NOT ALONE.

But Mei couldn't celebrate. Because buried in the signal, past the mathematical greetings and the periodic table confirmations, past the binary art that showed bipedal beings pointing at a star, there was a timestamp.

The message had been sent 4.24 years ago. That matched the speed of light, which meant no faster-than-light communication. Standard physics. That should have been reassuring.

Except the message ended with coordinates. Earth's coordinates. And a date—one that hadn't happened yet.

Three months from now.

Along with a single word that, across every translation matrix they could devise, meant the same thing:

Run.`,
      status: "PUBLISHED" as const,
      authorId: user.id,
      tagIds: scifiTag ? [scifiTag.id] : [],
    },
    {
      title: "The Missing Hour",
      summary: "A detective investigates the strangest case of her career.",
      content: `Everyone in town lost an hour on Tuesday.

Not the daylight-savings kind. Not a collective nap. Between 2:00 PM and 3:00 PM, every single resident of Millhaven experienced... nothing. Security cameras showed static. Car dashcams recorded blank frames. GPS logs showed vehicles that didn't move. And when 3:00 PM arrived, everyone simply continued what they'd been doing as if no time had passed at all.

Detective Rosa Vega was the first to notice something was wrong, because she'd been on the phone with her sister in Portland when it happened. Her sister's call log showed a fifty-eight-minute silence that Rosa had no memory of.

"What were you doing?" her sister asked.
"Talking to you," Rosa said. And she believed it.

The investigation, if you could call it that, went nowhere fast. There was no crime, technically. No one was hurt. Nothing was stolen (that anyone knew of). The mayor wanted it buried. The feds sent someone who asked a lot of questions and took a lot of notes and then left without sharing any of them.

But Rosa kept digging, because Rosa always kept digging. And three weeks later, she found the one person whose camera hadn't gone to static: old Mr. Huang, who'd built his own security system from Soviet-era parts that apparently didn't respond to whatever frequency had silenced everything else.

His footage showed the town square, empty and silent at 2:15 PM.

Empty except for a door that stood in the middle of the park, unattached to any building, casting a shadow that pointed the wrong way.

And it was open.`,
      status: "PUBLISHED" as const,
      authorId: admin.id,
      tagIds: mysteryTag ? [mysteryTag.id] : [],
    },
  ];

  for (const { tagIds, ...storyData } of stories) {
    const existing = await prisma.story.findFirst({ where: { title: storyData.title } });
    if (!existing) {
      await prisma.story.create({
        data: {
          ...storyData,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }
  }
  console.log("Sample stories seeded");

  // Add some comments
  const allStories = await prisma.story.findMany();
  for (const story of allStories) {
    const existingComments = await prisma.comment.count({ where: { storyId: story.id } });
    if (existingComments === 0) {
      await prisma.comment.create({
        data: {
          content: "Great story! Really enjoyed reading this.",
          storyId: story.id,
          authorId: story.authorId === admin.id ? user.id : admin.id,
        },
      });
    }
  }
  console.log("Sample comments seeded");

  // Add some likes
  for (const story of allStories) {
    const existingLikes = await prisma.like.count({ where: { storyId: story.id } });
    if (existingLikes === 0) {
      await prisma.like.create({
        data: {
          storyId: story.id,
          userId: story.authorId === admin.id ? user.id : admin.id,
        },
      });
    }
  }
  console.log("Sample likes seeded");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
