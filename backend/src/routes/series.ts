import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function makeUniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = slugify(base);
  let counter = 0;
  while (true) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`;
    const existing = await prisma.series.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter++;
  }
}

const seriesInclude = {
  author: { select: { id: true, username: true } },
  _count: { select: { stories: true } },
} as const;

const createSeriesSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const updateSeriesSchema = createSeriesSchema.partial();

const addStorySchema = z.object({
  storyId: z.number().int().positive(),
  order: z.number().int().min(0).optional(),
});

const reorderSchema = z.array(
  z.object({
    storyId: z.number().int().positive(),
    order: z.number().int().min(0),
  })
);

const listQuerySchema = z.object({
  authorId: z.coerce.number().int().positive().optional(),
});

export default async function seriesRoutes(app: FastifyInstance) {
  // GET /api/series — list series, optionally filtered by authorId
  app.get("/", async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const where = parsed.data.authorId ? { authorId: parsed.data.authorId } : {};

    const series = await prisma.series.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: seriesInclude,
    });

    return reply.send(series);
  });

  // POST /api/series — create series
  app.post("/", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createSeriesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { title, description } = parsed.data;
    const slug = await makeUniqueSlug(title);

    const series = await prisma.series.create({
      data: {
        title,
        slug,
        description,
        authorId: request.user!.userId,
      },
      include: seriesInclude,
    });

    return reply.status(201).send(series);
  });

  // GET /api/series/:id — get single series with ordered stories
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const seriesId = Number(id);
    if (isNaN(seriesId)) {
      return reply.status(400).send({ error: "Invalid series ID" });
    }

    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        author: { select: { id: true, username: true } },
        stories: {
          orderBy: { order: "asc" },
          include: {
            story: {
              include: {
                author: { select: { id: true, username: true } },
                tags: { include: { tag: true } },
                _count: { select: { comments: true, likes: true } },
              },
            },
          },
        },
      },
    });

    if (!series) {
      return reply.status(404).send({ error: "Series not found" });
    }

    return reply.send({
      ...series,
      stories: series.stories.map((ss) => ({
        order: ss.order,
        ...ss.story,
        tags: ss.story.tags.map((st) => st.tag),
      })),
    });
  });

  // PUT /api/series/:id — update title/description
  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const seriesId = Number(id);
    if (isNaN(seriesId)) {
      return reply.status(400).send({ error: "Invalid series ID" });
    }

    const existing = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!existing) return reply.status(404).send({ error: "Series not found" });
    if (existing.authorId !== request.user!.userId) {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const parsed = updateSeriesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.title && parsed.data.title !== existing.title) {
      updateData.slug = await makeUniqueSlug(parsed.data.title, seriesId);
    }

    const series = await prisma.series.update({
      where: { id: seriesId },
      data: updateData,
      include: seriesInclude,
    });

    return reply.send(series);
  });

  // DELETE /api/series/:id
  app.delete("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const seriesId = Number(id);
    if (isNaN(seriesId)) {
      return reply.status(400).send({ error: "Invalid series ID" });
    }

    const existing = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!existing) return reply.status(404).send({ error: "Series not found" });
    if (existing.authorId !== request.user!.userId) {
      return reply.status(403).send({ error: "Not authorized" });
    }

    await prisma.series.delete({ where: { id: seriesId } });
    return reply.status(204).send();
  });

  // POST /api/series/:id/stories — add a story to the series
  app.post("/:id/stories", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const seriesId = Number(id);
    if (isNaN(seriesId)) {
      return reply.status(400).send({ error: "Invalid series ID" });
    }

    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) return reply.status(404).send({ error: "Series not found" });
    if (series.authorId !== request.user!.userId) {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const parsed = addStorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { storyId } = parsed.data;

    // Verify the story belongs to the requesting user
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return reply.status(404).send({ error: "Story not found" });
    if (story.authorId !== request.user!.userId) {
      return reply.status(403).send({ error: "You can only add your own stories to a series" });
    }

    // Check not already in series
    const alreadyIn = await prisma.seriesStory.findUnique({
      where: { seriesId_storyId: { seriesId, storyId } },
    });
    if (alreadyIn) {
      return reply.status(409).send({ error: "Story is already in this series" });
    }

    // Default order: place at end
    let order = parsed.data.order;
    if (order === undefined) {
      const maxEntry = await prisma.seriesStory.findFirst({
        where: { seriesId },
        orderBy: { order: "desc" },
      });
      order = maxEntry ? maxEntry.order + 1 : 0;
    }

    await prisma.seriesStory.create({ data: { seriesId, storyId, order } });

    return reply.status(201).send({ seriesId, storyId, order });
  });

  // DELETE /api/series/:id/stories/:storyId — remove a story from the series
  app.delete("/:id/stories/:storyId", { preHandler: [authenticate] }, async (request, reply) => {
    const { id, storyId: storyIdStr } = request.params as { id: string; storyId: string };
    const seriesId = Number(id);
    const storyId = Number(storyIdStr);
    if (isNaN(seriesId) || isNaN(storyId)) {
      return reply.status(400).send({ error: "Invalid ID" });
    }

    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) return reply.status(404).send({ error: "Series not found" });
    if (series.authorId !== request.user!.userId) {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const entry = await prisma.seriesStory.findUnique({
      where: { seriesId_storyId: { seriesId, storyId } },
    });
    if (!entry) return reply.status(404).send({ error: "Story not in this series" });

    await prisma.seriesStory.delete({
      where: { seriesId_storyId: { seriesId, storyId } },
    });

    return reply.status(204).send();
  });

  // PUT /api/series/:id/stories/reorder — bulk update order
  app.put("/:id/stories/reorder", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const seriesId = Number(id);
    if (isNaN(seriesId)) {
      return reply.status(400).send({ error: "Invalid series ID" });
    }

    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) return reply.status(404).send({ error: "Series not found" });
    if (series.authorId !== request.user!.userId) {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const parsed = reorderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    await prisma.$transaction(
      parsed.data.map(({ storyId, order }) =>
        prisma.seriesStory.update({
          where: { seriesId_storyId: { seriesId, storyId } },
          data: { order },
        })
      )
    );

    return reply.send({ success: true });
  });
}
