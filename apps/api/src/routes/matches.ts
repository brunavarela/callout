import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/session.js";
import { buildMatchDetail } from "../lib/matches.js";

export async function matchesRoutes(app: FastifyInstance) {
  app.get("/matches/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    if (!user.riotPuuid) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver partidas." });
    }

    const detail = await buildMatchDetail(id, user.riotPuuid);
    if (!detail) return reply.code(404).send({ error: "Partida não encontrada." });
    return detail;
  });
}
