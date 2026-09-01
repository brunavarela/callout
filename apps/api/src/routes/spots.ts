import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { toSpotDTO } from "../lib/spots.js";
import { loadAgentsByUuid } from "../lib/assets.js";
import { getUserTeamId } from "../lib/team.js";

const SPOT_INCLUDE = { map: true, criadoPor: true } as const;

// Só YouTube ou Instagram — qualquer outro link (imgur, drive, twitter...)
// é rejeitado. Validado aqui de novo mesmo o front já bloquear, nunca
// confia só no client.
function isAllowedLinkHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return ["youtube.com", "m.youtube.com", "youtu.be", "instagram.com"].includes(host);
  } catch {
    return false;
  }
}

// Imagem já vem comprimida (canvas, ~1280px/qualidade .75) e em data URL —
// o limite aqui é só uma rede de segurança contra payload absurdo, não o
// controle de tamanho de verdade (isso é client-side).
const createBodySchema = z.object({
  mapId: z.string().min(1),
  agentId: z.string().min(1),
  side: z.enum(["ATK", "DEF"]),
  descricao: z.string().min(1).max(1000),
  imagens: z.array(z.string().min(1).max(2_000_000)).max(3).default([]),
  link: z
    .string()
    .url()
    .refine(isAllowedLinkHost, { message: "Só link do YouTube ou Instagram." })
    .optional(),
});

export async function spotsRoutes(app: FastifyInstance) {
  // Spot é escopado por time desde a migration team_multi_tenancy_1 — antes
  // era global (PROGRESS.md, Fase 4), qualquer usuário logado via/apagava
  // spot de qualquer time.
  app.get("/spots", { preHandler: requireAuth }, async (request, reply) => {
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    const [spots, agentsByUuid] = await Promise.all([
      prisma.spot.findMany({ where: { teamId }, include: SPOT_INCLUDE, orderBy: { createdAt: "desc" } }),
      loadAgentsByUuid(),
    ]);
    return spots.map((spot) => toSpotDTO(spot, agentsByUuid));
  });

  app.post("/spots", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    const map = await prisma.mapAsset.findUnique({ where: { id: parsed.data.mapId } });
    if (!map) return reply.code(400).send({ error: "Mapa inválido." });

    const spot = await prisma.spot.create({
      data: {
        teamId,
        mapId: map.id,
        agentUuid: parsed.data.agentId,
        side: parsed.data.side,
        descricao: parsed.data.descricao,
        imagens: parsed.data.imagens,
        link: parsed.data.link ?? null,
        criadoPorId: request.user!.id,
      },
      include: SPOT_INCLUDE,
    });

    const agentsByUuid = await loadAgentsByUuid();
    return reply.code(201).send(toSpotDTO(spot, agentsByUuid));
  });

  app.delete("/spots/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    const existing = await prisma.spot.findFirst({ where: { id, teamId } });
    if (!existing) return reply.code(404).send({ error: "Spot não encontrado." });

    await prisma.spot.delete({ where: { id } });
    return reply.code(204).send();
  });
}
