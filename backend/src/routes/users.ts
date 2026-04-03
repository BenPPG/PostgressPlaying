import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

export default async function userRoutes(app: FastifyInstance) {
  // GET /api/users/:id — public profile
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);
    if (isNaN(userId)) {
      return reply.status(400).send({ error: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { stories: true } },
      },
    });
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const stories = await prisma.story.findMany({
      where: { authorId: userId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    return reply.send({
      ...user,
      stories: stories.map((s) => ({
        ...s,
        tags: s.tags.map((st) => st.tag),
      })),
    });
  });

  // PUT /api/users/me — update own profile
  app.put("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (parsed.data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: parsed.data.username,
          NOT: { id: request.user!.userId },
        },
      });
      if (existing) {
        return reply.status(409).send({ error: "Username already taken" });
      }
    }

    const user = await prisma.user.update({
      where: { id: request.user!.userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    return reply.send(user);
  });
}
