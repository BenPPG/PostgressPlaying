import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100_000),
  summary: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  tagIds: z.array(z.number().int().positive()).optional().default([]),
});

const updateStorySchema = createStorySchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
  search: z.string().optional(),
  tag: z.string().optional(),
  author: z.string().optional(),
});

export default async function storyRoutes(app: FastifyInstance) {
  // GET /api/stories — list published stories
  app.get("/", async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { page, limit, search, tag, author } = parsed.data;
    const skip = (page - 1) * limit;

    if (search) {
      const searchSql = Prisma.sql`
        to_tsvector('english', coalesce("Story"."title", '') || ' ' || coalesce("Story"."summary", '') || ' ' || coalesce("Story"."content", ''))
        @@ plainto_tsquery('english', ${search})
      `;

      const tagSql = tag
        ? Prisma.sql`
            AND EXISTS (
              SELECT 1
              FROM "StoryTag" st
              JOIN "Tag" t ON t."id" = st."tagId"
              WHERE st."storyId" = "Story"."id"
                AND t."slug" = ${tag}
            )
          `
        : Prisma.empty;

      const authorSql = author
        ? Prisma.sql`
            AND EXISTS (
              SELECT 1
              FROM "User"
              WHERE "User"."id" = "Story"."authorId"
                AND "User"."username" ILIKE ${`%${author}%`}
            )
          `
        : Prisma.empty;

      const storyIds = await prisma.$queryRaw<{ id: number }[]>`
        SELECT "Story"."id"
        FROM "Story"
        WHERE "Story"."status" = 'PUBLISHED'
          AND ${searchSql}
          ${tagSql}
          ${authorSql}
        ORDER BY ts_rank(
          to_tsvector('english', coalesce("Story"."title", '') || ' ' || coalesce("Story"."summary", '') || ' ' || coalesce("Story"."content", '')),
          plainto_tsquery('english', ${search})
        ) DESC,
        "Story"."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;

      const countResult = await prisma.$queryRaw<{ count: string }[]>`
        SELECT count(*) AS count
        FROM "Story"
        WHERE "Story"."status" = 'PUBLISHED'
          AND ${searchSql}
          ${tagSql}
          ${authorSql}
      `;

      const storyIdsList = storyIds.map((row) => row.id);
      const total = Number(countResult[0]?.count ?? 0);

      const stories = storyIdsList.length
        ? await prisma.story.findMany({
            where: { id: { in: storyIdsList } },
            include: {
              author: { select: { id: true, username: true, avatarUrl: true } },
              tags: { include: { tag: true } },
              _count: { select: { comments: true, likes: true } },
            },
          })
        : [];

      const storyMap = new Map(stories.map((story) => [story.id, story]));
      const orderedStories = storyIdsList.map((id) => storyMap.get(id)).filter(Boolean);

      return reply.send({
        stories: orderedStories.map((s) => ({
          ...s,
          tags: s.tags.map((st) => st.tag),
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    const where: any = { status: "PUBLISHED" };
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }
    if (author) {
      where.author = { username: { contains: author, mode: "insensitive" } };
    }

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      prisma.story.count({ where }),
    ]);

    return reply.send({
      stories: stories.map((s) => ({
        ...s,
        tags: s.tags.map((st) => st.tag),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  });

  // POST /api/stories — create
  app.post("/", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createStorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { title, content, summary, status, tagIds } = parsed.data;

    const story = await prisma.story.create({
      data: {
        title,
        content,
        summary,
        status,
        authorId: request.user!.userId,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        author: { select: { id: true, username: true } },
        tags: { include: { tag: true } },
      },
    });

    return reply.status(201).send({
      ...story,
      tags: story.tags.map((st) => st.tag),
    });
  });

  // GET /api/stories/:id — get single story
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const storyId = Number(id);
    if (isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    const story = await prisma.story.update({
      where: { id: storyId },
      data: { viewsCount: { increment: 1 } },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, bio: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    if (!story) {
      return reply.status(404).send({ error: "Story not found" });
    }

    // Check if current user liked this story
    let userLiked = false;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(
          authHeader.slice(7),
          process.env.JWT_SECRET || "dev-secret"
        ) as { userId: number };
        const like = await prisma.like.findUnique({
          where: { storyId_userId: { storyId, userId: decoded.userId } },
        });
        userLiked = !!like;
      } catch {
        // Not logged in or invalid token — ignore
      }
    }

    return reply.send({
      ...story,
      tags: story.tags.map((st) => st.tag),
      userLiked,
    });
  });

  // PUT /api/stories/:id — update
  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const storyId = Number(id);
    if (isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    const existing = await prisma.story.findUnique({ where: { id: storyId } });
    if (!existing) {
      return reply.status(404).send({ error: "Story not found" });
    }
    if (existing.authorId !== request.user!.userId && request.user!.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const parsed = updateStorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { tagIds, ...data } = parsed.data;

    const story = await prisma.story.update({
      where: { id: storyId },
      data: {
        ...data,
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: {
        author: { select: { id: true, username: true } },
        tags: { include: { tag: true } },
      },
    });

    return reply.send({ ...story, tags: story.tags.map((st) => st.tag) });
  });

  // DELETE /api/stories/:id
  app.delete("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const storyId = Number(id);
    if (isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    const existing = await prisma.story.findUnique({ where: { id: storyId } });
    if (!existing) {
      return reply.status(404).send({ error: "Story not found" });
    }
    if (existing.authorId !== request.user!.userId && request.user!.role !== "ADMIN") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    await prisma.story.delete({ where: { id: storyId } });
    return reply.status(204).send();
  });

  // POST /api/stories/:id/like — toggle like
  app.post("/:id/like", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const storyId = Number(id);
    if (isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    const userId = request.user!.userId;
    const existing = await prisma.like.findUnique({
      where: { storyId_userId: { storyId, userId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { storyId_userId: { storyId, userId } } });
      return reply.send({ liked: false });
    } else {
      await prisma.like.create({ data: { storyId, userId } });
      return reply.send({ liked: true });
    }
  });
}
