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
  cursor: z.string().optional(),
});

function encodeCursor(createdAt: Date, id: number): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: number } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString();
    const sep = raw.lastIndexOf("|");
    if (sep === -1) return null;
    const createdAt = new Date(raw.substring(0, sep));
    const id = Number(raw.substring(sep + 1));
    if (isNaN(id) || isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function encodeFtsCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

function decodeFtsCursor(cursor: string): number {
  try {
    const n = Number(Buffer.from(cursor, "base64url").toString());
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

export default async function storyRoutes(app: FastifyInstance) {
  // GET /api/stories — list published stories
  app.get("/", async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { page, limit, search, tag, author, cursor } = parsed.data;
    const tags = tag ? tag.split(",").filter(Boolean) : [];
    const cursorMode = cursor !== undefined;

    if (search) {
      const ftsOffset = cursor ? decodeFtsCursor(cursor) : 0;

      const searchSql = Prisma.sql`
        to_tsvector('english', coalesce("Story"."title", '') || ' ' || coalesce("Story"."summary", '') || ' ' || coalesce("Story"."content", ''))
        @@ plainto_tsquery('english', ${search})
      `;

      const tagSql = tags.length > 0
        ? Prisma.sql`
            AND EXISTS (
              SELECT 1
              FROM "StoryTag" st
              JOIN "Tag" t ON t."id" = st."tagId"
              WHERE st."storyId" = "Story"."id"
                AND t."slug" IN (${Prisma.join(tags)})
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
        "Story"."createdAt" DESC,
        "Story"."id" DESC
        LIMIT ${limit + 1}
        OFFSET ${ftsOffset}
      `;

      const storyIdsList = storyIds.map((row) => row.id);
      const hasMore = storyIdsList.length > limit;
      const pageIds = hasMore ? storyIdsList.slice(0, limit) : storyIdsList;

      const stories = pageIds.length
        ? await prisma.story.findMany({
            where: { id: { in: pageIds } },
            include: {
              author: { select: { id: true, username: true, avatarUrl: true } },
              tags: { include: { tag: true } },
              series: { orderBy: { order: "asc" }, include: { series: { select: { id: true, title: true, slug: true } } } },
              _count: { select: { comments: true, likes: true } },
            },
          })
        : [];

      const storyMap = new Map(stories.map((story) => [story.id, story]));
      const orderedStories = pageIds.map((id) => storyMap.get(id)).filter(Boolean);
      const nextCursor = hasMore ? encodeFtsCursor(ftsOffset + limit) : null;

      return reply.send({
        stories: orderedStories.map((s) => ({
          ...s,
          tags: s!.tags.map((st) => st.tag),
          series: s!.series.map((ss) => ({ order: ss.order, series: ss.series })),
        })),
        nextCursor,
        hasMore,
      });
    }

    const where: any = { status: "PUBLISHED" };
    if (tags.length === 1) {
      where.tags = { some: { tag: { slug: tags[0] } } };
    } else if (tags.length > 1) {
      where.tags = { some: { tag: { slug: { in: tags } } } };
    }
    if (author) {
      where.author = { username: { contains: author, mode: "insensitive" } };
    }

    if (cursorMode) {
      const decoded = cursor ? decodeCursor(cursor) : null;
      if (decoded) {
        where.AND = [
          {
            OR: [
              { createdAt: { lt: decoded.createdAt } },
              { createdAt: decoded.createdAt, id: { lt: decoded.id } },
            ],
          },
        ];
      }

      const fetched = await prisma.story.findMany({
        where,
        take: limit + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          tags: { include: { tag: true } },
          series: { orderBy: { order: "asc" }, include: { series: { select: { id: true, title: true, slug: true } } } },
          _count: { select: { comments: true, likes: true } },
        },
      });

      const hasMore = fetched.length > limit;
      const pageStories = hasMore ? fetched.slice(0, limit) : fetched;
      const last = pageStories[pageStories.length - 1];
      const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

      return reply.send({
        stories: pageStories.map((s) => ({ ...s, tags: s.tags.map((st) => st.tag), series: s.series.map((ss) => ({ order: ss.order, series: ss.series })) })),
        nextCursor,
        hasMore,
      });
    }

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          tags: { include: { tag: true } },
          series: { orderBy: { order: "asc" }, include: { series: { select: { id: true, title: true, slug: true } } } },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      prisma.story.count({ where }),
    ]);

    return reply.send({
      stories: stories.map((s) => ({
        ...s,
        tags: s.tags.map((st) => st.tag),
        series: s.series.map((ss) => ({ order: ss.order, series: ss.series })),
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
        series: { orderBy: { order: "asc" }, include: { series: { select: { id: true, title: true, slug: true } } } },
      },
    });

    return reply.status(201).send({
      ...story,
      tags: story.tags.map((st) => st.tag),
      series: story.series.map((ss) => ({ order: ss.order, series: ss.series })),
    });
  });

  // GET /api/stories/:id — get single story
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const storyId = Number(id);
    if (isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    // Resolve authenticated user first (needed for both view counting and like status)
    let loggedInUserId: number | null = null;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(
          authHeader.slice(7),
          process.env.JWT_SECRET || "dev-secret"
        ) as { userId: number };
        loggedInUserId = decoded.userId;
      } catch {
        // Invalid token — treat as unauthenticated
      }
    }

    const storyInclude = {
      author: { select: { id: true, username: true, avatarUrl: true, bio: true } },
      tags: { include: { tag: true } },
      series: { orderBy: { order: "asc" as const }, include: { series: { select: { id: true, title: true, slug: true } } } },
      _count: { select: { comments: true, likes: true } },
    };

    // Fetch the story first to know the author before deciding whether to count the view
    const story = await (async () => {
      if (loggedInUserId === null) {
        // Not logged in — no view count
        return prisma.story.findUnique({ where: { id: storyId }, include: storyInclude });
      }
      // Peek at the authorId without incrementing
      const peek = await prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
      if (!peek) return null;
      if (peek.authorId === loggedInUserId) {
        // Viewer is the author — no view count
        return prisma.story.findUnique({ where: { id: storyId }, include: storyInclude });
      }
      // Logged-in non-author — increment view count
      return prisma.story.update({
        where: { id: storyId },
        data: { viewsCount: { increment: 1 } },
        include: storyInclude,
      }).catch(() => null);
    })();

    if (!story) {
      return reply.status(404).send({ error: "Story not found" });
    }

    // Check if current user liked this story
    let userLiked = false;
    if (loggedInUserId !== null) {
      const like = await prisma.like.findUnique({
        where: { storyId_userId: { storyId, userId: loggedInUserId } },
      });
      userLiked = !!like;
    }

    return reply.send({
      ...story,
      tags: story.tags.map((st) => st.tag),
      series: story.series.map((ss) => ({ order: ss.order, series: ss.series })),
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
        series: { orderBy: { order: "asc" }, include: { series: { select: { id: true, title: true, slug: true } } } },
      },
    });

    return reply.send({ ...story, tags: story.tags.map((st) => st.tag), series: story.series.map((ss) => ({ order: ss.order, series: ss.series })) });
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
