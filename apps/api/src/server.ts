import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import * as Sentry from "@sentry/node";
import { env } from "./lib/env.js";

// Sem SENTRY_DSN isso é um no-op (Sentry.init aceita dsn undefined e não
// captura nada) — LAUNCH.md §5 item 4, tier gratuito. Precisa rodar antes
// de qualquer outra coisa pra capturar erro de boot também.
Sentry.init({ dsn: env.SENTRY_DSN, sendDefaultPii: false });
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { syncRoutes } from "./routes/sync.js";
import { equipeRoutes } from "./routes/equipe.js";
import { meRoutes } from "./routes/me.js";
import { strategiesRoutes } from "./routes/strategies.js";
import { matchesRoutes } from "./routes/matches.js";
import { commentsRoutes } from "./routes/comments.js";
import { spotsRoutes } from "./routes/spots.js";
import { agentsRoutes } from "./routes/agents.js";
import { mapsRoutes } from "./routes/maps.js";
import { competicoesRoutes } from "./routes/competicoes.js";

// Default do Fastify é 1MB — spots levam até 3 imagens comprimidas em
// base64 (data URL), que sozinhas já passam disso.
const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });
Sentry.setupFastifyErrorHandler(app);

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
await app.register(equipeRoutes);
await app.register(meRoutes);
await app.register(strategiesRoutes);
await app.register(matchesRoutes);
await app.register(commentsRoutes);
await app.register(spotsRoutes);
await app.register(agentsRoutes);
await app.register(mapsRoutes);
await app.register(competicoesRoutes);

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
