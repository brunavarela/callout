import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/session.js";
import { buildHeatmap } from "../lib/heatmap.js";

export async function heatmapRoutes(app: FastifyInstance) {
  app.get("/heatmap", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de ver o heatmap." });
    }

    const { map, kind } = request.query as { map?: string; kind?: string };
    if (!map) return reply.code(400).send({ error: "Informe o mapa (?map=)." });

    return buildHeatmap(user.riotPuuid, map, kind === "deaths" ? "deaths" : "kills");
  });
}
