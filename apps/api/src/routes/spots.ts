import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { toSpotDTO } from "../lib/spots.js";
import { loadAgentsByUuid } from "../lib/assets.js";

const SPOT_INCLUDE = { map: true, criadoPor: true } as const;

// Imagem já vem comprimida (canvas, ~1280px/qualidade .75) e em data URL —
// o limite aqui é só uma rede de segurança contra payload absurdo, não o
// controle de tamanho de verdade (isso é client-side).
const createBodySchema = z.object({
  mapId: z.string().min(1),
  agentId: z.string().min(1),
  side: z.enum(["ATK", "DEF"]),
  descricao: z.string().min(1).max(1000),
  imagens: z.array(z.string().min(1).max(2_000_000)).max(3).default([]),
});

export async function spotsRoutes(app: FastifyInstance) {
  // Schema de Spot não tem teamId — lista é global, não por time (ver
  // PROGRESS.md, Fase 4).
  app.get("/spots", { preHandler: requireAuth }, async () => {
    const [spots, agentsByUuid] = await Promise.all([
      prisma.spot.findMany({ include: SPOT_INCLUDE, orderBy: { createdAt: "desc" } }),
      loadAgentsByUuid(),
    ]);
    return spots.map((spot) => toSpotDTO(spot, agentsByUuid));
  });

  app.post("/spots", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const map = await prisma.mapAsset.findUnique({ where: { id: parsed.data.mapId } });
    if (!map) return reply.code(400).send({ error: "Mapa inválido." });

    const spot = await prisma.spot.create({
      data: {
        mapId: map.id,
        agentUuid: parsed.data.agentId,
        side: parsed.data.side,
        descricao: parsed.data.descricao,
        imagens: parsed.data.imagens,
        criadoPorId: request.user!.id,
      },
      include: SPOT_INCLUDE,
    });

    const agentsByUuid = await loadAgentsByUuid();
    return reply.code(201).send(toSpotDTO(spot, agentsByUuid));
  });
}
