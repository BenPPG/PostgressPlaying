import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export default async function commentRoutes(app: FastifyInstance) {
  // GET /api/stories/:storyId/comments
  app.get("/stories/:storyId/comments", async (request, reply) => {
    const { storyId } = request.params as { storyId: string };
    const id = Number(storyId);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Invalid story ID" });
    }

    const comments = await prisma.comment.findMany({
      where: { storyId: id },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return reply.send(comments);
  });

  // POST /api/stories/:storyId/comments
  app.post(
    "/stories/:storyId/comments",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { storyId } = request.params as { storyId: string };
      const id = Number(storyId);
      if (isNaN(id)) {
        return reply.status(400).send({ error: "Invalid story ID" });
      }

      const parsed = createCommentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const story = await prisma.story.findUnique({ where: { id } });
      if (!story) {
        return reply.status(404).send({ error: "Story not found" });
      }

      const comment = await prisma.comment.create({
        data: {
          content: parsed.data.content,
          storyId: id,
          authorId: request.user!.userId,
        },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      return reply.status(201).send(comment);
    }
  );

  // DELETE /api/comments/:id
  app.delete(
    "/comments/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const commentId = Number(id);
      if (isNaN(commentId)) {
        return reply.status(400).send({ error: "Invalid comment ID" });
      }

      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return reply.status(404).send({ error: "Comment not found" });
      }
      if (comment.authorId !== request.user!.userId && request.user!.role !== "ADMIN") {
        return reply.status(403).send({ error: "Not authorized" });
      }

      await prisma.comment.delete({ where: { id: commentId } });
      return reply.status(204).send();
    }
  );
}
