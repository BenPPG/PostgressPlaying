import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import authRoutes from "./routes/auth.js";
import storyRoutes from "./routes/stories.js";
import commentRoutes from "./routes/comments.js";
import tagRoutes from "./routes/tags.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import seriesRoutes from "./routes/series.js";
import listRoutes from "./routes/lists.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });

// Routes
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(storyRoutes, { prefix: "/api/stories" });
await app.register(commentRoutes, { prefix: "/api" });
await app.register(tagRoutes, { prefix: "/api/tags" });
await app.register(userRoutes, { prefix: "/api/users" });
await app.register(adminRoutes, { prefix: "/api/admin" });
await app.register(seriesRoutes, { prefix: "/api/series" });
await app.register(listRoutes, { prefix: "/api/lists" });

app.get("/api/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT) || 3000;

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
