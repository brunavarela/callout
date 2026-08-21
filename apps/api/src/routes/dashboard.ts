import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/session.js";
import { buildDashboardSummary } from "../lib/dashboard.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid || !user.riotRegion) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o dashboard." });
    }
    return buildDashboardSummary(user.id, user.riotPuuid, user.riotRegion);
  });
}
