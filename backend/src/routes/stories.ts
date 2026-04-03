import { FastifyInstance } from "fastify";
import { z } from "zod";
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
});

export default async function storyRoutes(app: FastifyInstance) {
  // GET /api/stories — list published stories
  app.get("/", async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { page, limit, search, tag } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = { status: "PUBLISHED" };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
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
