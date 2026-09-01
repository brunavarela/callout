import type { FastifyInstance, FastifyReply } from "fastify";
import type { User } from "@prisma/client";
import type { MatchCountFilter } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { buildDashboardSummary } from "../lib/dashboard.js";
import { buildRrAndInsights, buildSidesBreakdown } from "../lib/insights.js";
import { resolveDashboardTarget } from "../lib/equipe.js";

// Resolve o membro do time cujo painel a rota deve montar — o próprio
// usuário autenticado, por padrão, ou outro membro do time quando o filtro
// "ver painel de outro membro" manda um `userId`. Já responde 404/409 e
// devolve `null` quando a rota deve parar por aí.
async function resolveTarget(request: { user?: User; query: unknown }, reply: FastifyReply): Promise<User | null> {
  const { userId: targetUserId } = request.query as { userId?: string };
  const target = await resolveDashboardTarget(request.user!, targetUserId);
  if (!target) {
    reply.code(404).send({ error: "Membro não encontrado no time." });
    return null;
  }
  if (!target.riotPuuid || !target.riotRegion) {
    const message = target.id === request.user!.id ? "Vincule seu Riot ID antes de ver o dashboard." : "Esse membro ainda não vinculou o Riot ID.";
    reply.code(409).send({ error: message });
    return null;
  }
  return target;
}

// "all" (ou qualquer outro valor) vira `undefined` — sem filtro. Só os dois
// modos que a Riot ranqueia/não ranqueia fazem sentido pro filtro do
// dashboard (deathmatch, spike rush etc. ficam de fora por ora).
function parseModoFilter(raw: unknown): "Competitive" | "Unrated" | undefined {
  return raw === "Competitive" || raw === "Unrated" ? raw : undefined;
}

function parseMatchCount(raw: unknown): MatchCountFilter {
  return raw === "7" ? 7 : 20;
}

// String vazia/ausente vira `undefined` — sem filtro de mapa. Não valida
// contra o catálogo de mapas: um mapId inválido só resulta numa query sem
// resultado nenhum, sem risco de segurança (é o mesmo puuid do target, já
// resolvido e autorizado por resolveTarget).
function parseMapIdFilter(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { modo, mapId } = request.query as { modo?: string; mapId?: string };
    return buildDashboardSummary(target.id, target.riotPuuid!, target.riotRegion!, parseModoFilter(modo), parseMapIdFilter(mapId));
  });

  app.get("/dashboard/rr-history", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { modo, matches, mapId } = request.query as { modo?: string; matches?: string; mapId?: string };

    try {
      return await buildRrAndInsights(target.riotRegion!, target.riotPuuid!, parseMatchCount(matches), parseModoFilter(modo), parseMapIdFilter(mapId));
    } catch (err) {
      request.log.error(err, "falha ao buscar histórico de RR");
      return reply.code(502).send({ error: "Falha ao buscar o histórico de RR na HenrikDev." });
    }
  });

  app.get("/dashboard/sides", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { modo, mapId } = request.query as { modo?: string; mapId?: string };
    return buildSidesBreakdown(target.riotPuuid!, parseModoFilter(modo), parseMapIdFilter(mapId));
  });
}
