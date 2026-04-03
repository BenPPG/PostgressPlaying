import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export default async function adminRoutes(app: FastifyInstance) {
  // All admin routes require authentication + admin role
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireAdmin);

  // GET /api/admin/stories — list all stories (any status)
  app.get("/stories", async (request, reply) => {
    const stories = await prisma.story.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });
    return reply.send(stories);
  });

  // PATCH /api/admin/stories/:id — update story status
  app.patch("/stories/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const storyId = Number(id);
    if (isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const story = await prisma.story.update({
      where: { id: storyId },
      data: { status: parsed.data.status },
    });

    return reply.send(story);
  });

  // DELETE /api/admin/users/:id — remove user
  app.delete("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = Number(id);
    if (isNaN(userId)) {
      return reply.status(400).send({ error: "Invalid user ID" });
    }

    // Prevent self-deletion
    if (userId === request.user!.userId) {
      return reply.status(400).send({ error: "Cannot delete yourself" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    await prisma.user.delete({ where: { id: userId } });
    return reply.status(204).send();
  });
}
