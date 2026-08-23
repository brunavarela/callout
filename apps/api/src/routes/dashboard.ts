import type { FastifyInstance } from "fastify";
import type { MatchCountFilter } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { buildDashboardSummary } from "../lib/dashboard.js";
import { buildRrHistory, buildSidesBreakdown } from "../lib/insights.js";

// "all" (ou qualquer outro valor) vira `undefined` — sem filtro. Só os dois
// modos que a Riot ranqueia/não ranqueia fazem sentido pro filtro do
// dashboard (deathmatch, spike rush etc. ficam de fora por ora).
function parseModoFilter(raw: unknown): "Competitive" | "Unrated" | undefined {
  return raw === "Competitive" || raw === "Unrated" ? raw : undefined;
}

function parseMatchCount(raw: unknown): MatchCountFilter {
  return raw === "7" ? 7 : 20;
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid || !user.riotRegion) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o dashboard." });
    }
    const { modo, matches } = request.query as { modo?: string; matches?: string };
    return buildDashboardSummary(user.id, user.riotPuuid, user.riotRegion, parseModoFilter(modo), parseMatchCount(matches));
  });

  app.get("/dashboard/rr-history", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid || !user.riotRegion) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o dashboard." });
    }
    const { modo, matches } = request.query as { modo?: string; matches?: string };

    try {
      return await buildRrHistory(user.riotRegion, user.riotPuuid, parseMatchCount(matches), parseModoFilter(modo));
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
    const { modo } = request.query as { modo?: string };
    return buildSidesBreakdown(user.riotPuuid, parseModoFilter(modo));
  });
}
