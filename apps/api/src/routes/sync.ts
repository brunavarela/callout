import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/session.js";
import { getSyncProgress, syncUserMatches } from "../lib/sync.js";

export async function syncRoutes(app: FastifyInstance) {
  app.post("/sync", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotPuuid || !user.riotRegion) {
      return reply.code(409).send({ error: "Vincule seu Riot ID antes de sincronizar." });
    }

    const current = getSyncProgress(user.id);
    if (current.state === "syncing") {
      return reply.code(202).send(current);
    }

    // Dispara e não espera — o front consulta o progresso em GET /sync.
    void syncUserMatches(user.id, user.riotPuuid, user.riotRegion).catch((err) => {
      request.log.error(err, "sync falhou");
    });

    return reply.code(202).send(getSyncProgress(user.id));
  });

  app.get("/sync", { preHandler: requireAuth }, async (request) => {
    return getSyncProgress(request.user!.id);
  });
}
