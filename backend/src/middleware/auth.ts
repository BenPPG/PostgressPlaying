import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: number;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid token" });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    request.user = decoded;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user || request.user.role !== "ADMIN") {
    return reply.status(403).send({ error: "Admin access required" });
  }
}
