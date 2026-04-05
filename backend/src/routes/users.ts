import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 environment variables are not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "when_required",
  });
}

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

  // POST /api/users/me/avatar-upload-url — get a presigned R2 upload URL
  app.post(
    "/me/avatar-upload-url",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { contentType } = request.body as {
        contentType?: unknown;
      };

      if (
        typeof contentType !== "string" ||
        !ALLOWED_MIME_TYPES.includes(contentType)
      ) {
        return reply
          .status(400)
          .send({ error: `contentType must be one of: ${ALLOWED_MIME_TYPES.join(", ")}` });
      }

      const bucket = process.env.R2_BUCKET_NAME;
      const publicUrl = process.env.R2_PUBLIC_URL;
      if (!bucket || !publicUrl) {
        return reply.status(500).send({ error: "R2 storage is not configured" });
      }

      const ext = contentType.split("/")[1].replace("jpeg", "jpg");
      const key = `avatars/${request.user!.userId}-${randomUUID()}.${ext}`;

      let r2: S3Client;
      try {
        r2 = getR2Client();
      } catch {
        return reply.status(500).send({ error: "R2 storage is not configured" });
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
      const objectUrl = `${publicUrl.replace(/\/$/, "")}/${key}`;

      return reply.send({ uploadUrl, objectUrl });
    }
  );

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
