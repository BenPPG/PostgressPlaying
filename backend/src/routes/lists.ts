import { FastifyInstance } from "fastify";
import { z } from "zod";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import type { JwtPayload } from "../middleware/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});

/** Try to extract userId from Bearer token without hard-failing */
function tryGetUserId(authHeader: string | undefined): number | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.userId;
  } catch {
    return null;
  }
}

export default async function listRoutes(app: FastifyInstance) {
  // GET /api/lists/my — own lists with item counts (auth required)
  app.get("/my", { preHandler: [authenticate] }, async (request, reply) => {
    const lists = await prisma.storyList.findMany({
      where: { ownerId: request.user!.userId },
      include: { _count: { select: { items: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return reply.send(lists);
  });

  // GET /api/lists/my/story/:storyId — which of my lists contain a given story
  app.get("/my/story/:storyId", { preHandler: [authenticate] }, async (request, reply) => {
    const storyId = Number((request.params as { storyId: string }).storyId);
    if (isNaN(storyId)) return reply.status(400).send({ error: "Invalid story ID" });

    const items = await prisma.storyListItem.findMany({
      where: { storyId, list: { ownerId: request.user!.userId } },
      select: { listId: true },
    });
    return reply.send(items.map((i) => i.listId));
  });

  // GET /api/lists/user/:userId — public lists of another user
  app.get("/user/:userId", async (request, reply) => {
    const userId = Number((request.params as { userId: string }).userId);
    if (isNaN(userId)) return reply.status(400).send({ error: "Invalid user ID" });

    const lists = await prisma.storyList.findMany({
      where: { ownerId: userId, isPublic: true },
      include: { _count: { select: { items: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return reply.send(lists);
  });

  // POST /api/lists — create a list
  app.post("/", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createListSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const list = await prisma.storyList.create({
      data: {
        ...parsed.data,
        ownerId: request.user!.userId,
        isDefault: false,
      },
      include: { _count: { select: { items: true } } },
    });
    return reply.status(201).send(list);
  });

  // GET /api/lists/:id — list detail with stories (owner sees all, others see public only)
  app.get("/:id", async (request, reply) => {
    const listId = Number((request.params as { id: string }).id);
    if (isNaN(listId)) return reply.status(400).send({ error: "Invalid list ID" });

    const requestUserId = tryGetUserId(request.headers.authorization);

    const list = await prisma.storyList.findUnique({
      where: { id: listId },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        items: {
          orderBy: { addedAt: "desc" },
          include: {
            story: {
              include: {
                author: { select: { id: true, username: true, avatarUrl: true } },
                tags: { include: { tag: true } },
                _count: { select: { comments: true, likes: true } },
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!list) return reply.status(404).send({ error: "List not found" });

    const isOwner = requestUserId === list.ownerId;
    if (!list.isPublic && !isOwner) {
      return reply.status(403).send({ error: "This list is private" });
    }

    const visibleItems = isOwner
      ? list.items
      : list.items.filter((item) => item.story.status === "PUBLISHED");

    return reply.send({
      ...list,
      items: visibleItems.map((item) => ({
        ...item,
        story: {
          ...item.story,
          tags: item.story.tags.map((st) => st.tag),
        },
      })),
    });
  });

  // PUT /api/lists/:id — update list (blocked for default lists)
  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const listId = Number((request.params as { id: string }).id);
    if (isNaN(listId)) return reply.status(400).send({ error: "Invalid list ID" });

    const list = await prisma.storyList.findUnique({ where: { id: listId } });
    if (!list) return reply.status(404).send({ error: "List not found" });
    if (list.ownerId !== request.user!.userId) return reply.status(403).send({ error: "Forbidden" });
    if (list.isDefault) return reply.status(400).send({ error: "Default lists cannot be renamed or edited" });

    const parsed = updateListSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const updated = await prisma.storyList.update({
      where: { id: listId },
      data: parsed.data,
      include: { _count: { select: { items: true } } },
    });
    return reply.send(updated);
  });

  // DELETE /api/lists/:id (blocked for default lists)
  app.delete("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const listId = Number((request.params as { id: string }).id);
    if (isNaN(listId)) return reply.status(400).send({ error: "Invalid list ID" });

    const list = await prisma.storyList.findUnique({ where: { id: listId } });
    if (!list) return reply.status(404).send({ error: "List not found" });
    if (list.ownerId !== request.user!.userId) return reply.status(403).send({ error: "Forbidden" });
    if (list.isDefault) return reply.status(400).send({ error: "Default lists cannot be deleted" });

    await prisma.storyList.delete({ where: { id: listId } });
    return reply.status(204).send();
  });

  // POST /api/lists/:id/stories — add a story to a list
  app.post("/:id/stories", { preHandler: [authenticate] }, async (request, reply) => {
    const listId = Number((request.params as { id: string }).id);
    if (isNaN(listId)) return reply.status(400).send({ error: "Invalid list ID" });

    const { storyId } = request.body as { storyId?: unknown };
    const storyIdNum = Number(storyId);
    if (!storyId || isNaN(storyIdNum)) return reply.status(400).send({ error: "storyId is required" });

    const list = await prisma.storyList.findUnique({ where: { id: listId } });
    if (!list) return reply.status(404).send({ error: "List not found" });
    if (list.ownerId !== request.user!.userId) return reply.status(403).send({ error: "Forbidden" });

    const story = await prisma.story.findUnique({ where: { id: storyIdNum } });
    if (!story) return reply.status(404).send({ error: "Story not found" });

    await prisma.storyListItem.upsert({
      where: { listId_storyId: { listId, storyId: storyIdNum } },
      update: {},
      create: { listId, storyId: storyIdNum },
    });
    return reply.status(201).send({ listId, storyId: storyIdNum });
  });

  // DELETE /api/lists/:id/stories/:storyId — remove a story from a list
  app.delete("/:id/stories/:storyId", { preHandler: [authenticate] }, async (request, reply) => {
    const listId = Number((request.params as { id: string; storyId: string }).id);
    const storyId = Number((request.params as { id: string; storyId: string }).storyId);
    if (isNaN(listId) || isNaN(storyId)) return reply.status(400).send({ error: "Invalid ID" });

    const list = await prisma.storyList.findUnique({ where: { id: listId } });
    if (!list) return reply.status(404).send({ error: "List not found" });
    if (list.ownerId !== request.user!.userId) return reply.status(403).send({ error: "Forbidden" });

    await prisma.storyListItem.deleteMany({ where: { listId, storyId } });
    return reply.status(204).send();
  });
}
