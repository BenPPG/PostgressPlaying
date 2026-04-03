import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";

const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default async function tagRoutes(app: FastifyInstance) {
  // GET /api/tags — list all tags
  app.get("/", async (_request, reply) => {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { stories: true } } },
    });
    return reply.send(tags);
  });

  // POST /api/tags — create a new tag (or return existing one)
  app.post("/", async (request, reply) => {
    const parsed = createTagSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const name = parsed.data.name;
    const slug = slugify(name);
    if (!slug) {
      return reply.status(400).send({ error: "Invalid tag name" });
    }

    const existingTag = await prisma.tag.findUnique({ where: { slug } });
    if (existingTag) {
      return reply.send(existingTag);
    }

    try {
      const newTag = await prisma.tag.create({
        data: {
          name,
          slug,
        },
      });
      return reply.status(201).send(newTag);
    } catch (error: any) {
      if (error.code === "P2002") {
        const duplicate = await prisma.tag.findUnique({ where: { slug } });
        if (duplicate) {
          return reply.send(duplicate);
        }
      }
      return reply.status(500).send({ error: "Unable to create tag" });
    }
  });
}
