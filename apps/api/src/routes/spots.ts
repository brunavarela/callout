import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { ensureMapAsset } from "../lib/strategy.js";
import { toSpotDTO } from "../lib/spots.js";
import { loadAgentsByUuid } from "../lib/assets.js";

const SPOT_INCLUDE = { map: true, criadoPor: true } as const;

const createBodySchema = z.object({
  mapName: z.string().min(1),
  side: z.enum(["ATK", "DEF"]),
  agentId: z.string().min(1),
  habilidade: z.string().min(1).max(60),
  origin: z.object({ x: z.number(), y: z.number() }),
  target: z.object({ x: z.number(), y: z.number() }),
  videoUrl: z.string().url().optional(),
  notas: z.string().max(500).optional(),
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

    const map = await ensureMapAsset(parsed.data.mapName);

    const spot = await prisma.spot.create({
      data: {
        mapId: map.id,
        agentUuid: parsed.data.agentId,
        habilidade: parsed.data.habilidade,
        xOrigem: parsed.data.origin.x,
        yOrigem: parsed.data.origin.y,
        xAlvo: parsed.data.target.x,
        yAlvo: parsed.data.target.y,
        videoUrl: parsed.data.videoUrl ?? null,
        notas: parsed.data.notas ?? null,
        side: parsed.data.side,
        criadoPorId: request.user!.id,
      },
      include: SPOT_INCLUDE,
    });

    const agentsByUuid = await loadAgentsByUuid();
    return reply.code(201).send(toSpotDTO(spot, agentsByUuid));
  });
}
