import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/session.js";
import { buildMatchDetail } from "../lib/matches.js";
import { resolveViewTarget } from "../lib/equipe.js";

export async function matchesRoutes(app: FastifyInstance) {
  // Mesmo contrato de userId/free de /dashboard* (ver resolveTarget em
  // routes/dashboard.ts) -- sem isso, expandir uma partida na lista de
  // outro membro/jogador pesquisado sempre dava 404 (buildMatchDetail
  // conferia a MatchPlayer de quem está LOGADO, não a de quem está sendo
  // visto -- bug achado em 21/09/2026 ao testar a busca livre de RiotID).
  app.get("/matches/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId: targetUserId, free } = request.query as { userId?: string; free?: string };
    const target = await resolveViewTarget(request.user!, targetUserId, free === "1");
    if (!target) return reply.code(404).send({ error: "Usuário não encontrado." });
    if (!target.riotPuuid) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver partidas." });
    }

    const detail = await buildMatchDetail(id, target.riotPuuid);
    if (!detail) return reply.code(404).send({ error: "Partida não encontrada." });
    return detail;
  });
}
