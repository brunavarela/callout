import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { env } from "./lib/env.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { syncRoutes } from "./routes/sync.js";
import { teamRoutes } from "./routes/team.js";
import { meRoutes } from "./routes/me.js";
import { strategiesRoutes } from "./routes/strategies.js";
import { matchesRoutes } from "./routes/matches.js";
import { commentsRoutes } from "./routes/comments.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.WEB_ORIGIN,
  credentials: true,
});

await app.register(cookie, {
  secret: env.SESSION_SECRET,
});

app.get("/health", async () => ({ ok: true }));

await app.register(authRoutes);
await app.register(dashboardRoutes);
await app.register(syncRoutes);
await app.register(teamRoutes);
await app.register(meRoutes);
await app.register(strategiesRoutes);
await app.register(matchesRoutes);
await app.register(commentsRoutes);

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
