import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/session.js";
import { buildDashboardSummary } from "../lib/dashboard.js";
import { buildRrHistory, buildSidesBreakdown } from "../lib/insights.js";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid || !user.riotRegion) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o dashboard." });
    }
    return buildDashboardSummary(user.id, user.riotPuuid, user.riotRegion);
  });

  app.get("/dashboard/rr-history", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid || !user.riotRegion) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o dashboard." });
    }
    const { range } = request.query as { range?: string };
    const days = RANGE_DAYS[range ?? "30d"] ?? 30;

    try {
      return await buildRrHistory(user.riotRegion, user.riotPuuid, days);
    } catch (err) {
      request.log.error(err, "falha ao buscar histórico de RR");
      return reply.code(502).send({ error: "Falha ao buscar o histórico de RR na HenrikDev." });
    }
  });

  app.get("/dashboard/sides", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o dashboard." });
    }
    return buildSidesBreakdown(user.riotPuuid);
  });
}
