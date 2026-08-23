import type { FastifyInstance } from "fastify";
import type { MapAsset as MapAssetDTO } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";

export async function mapsRoutes(app: FastifyInstance) {
  app.get("/maps", { preHandler: requireAuth }, async () => {
    const maps = await prisma.mapAsset.findMany({ orderBy: { nome: "asc" } });
    return maps.map(
      (m): MapAssetDTO => ({
        id: m.id,
        uuid: m.uuid,
        nome: m.nome,
        displayIcon: m.displayIcon,
        xMultiplier: m.xMultiplier,
        yMultiplier: m.yMultiplier,
        xScalar: m.xScalar,
        yScalar: m.yScalar,
        callouts: m.callouts as MapAssetDTO["callouts"],
      }),
    );
  });
}
