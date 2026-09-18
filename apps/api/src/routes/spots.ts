import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { toSpotDTO } from "../lib/spots.js";
import { loadAgentsByUuid } from "../lib/assets.js";
import { getUserEquipeId } from "../lib/equipe.js";

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

const SEM_EQUIPE_ERROR = "Você ainda não tem uma equipe.";

const createBodySchemaComScope = createBodySchema.extend({
  // "equipe" continua compartilhado com todo mundo do time, sem restrição
  // extra de cargo (qualquer membro cria/apaga, diferente de Strategy).
  // "individual" não depende de equipe nenhuma -- PRO ainda não existe
  // (LAUNCH.md §5/§12), gate entra aqui quando existir, mesmo esquema de
  // POST /strategies.
  scope: z.enum(["equipe", "individual"]),
});

export async function spotsRoutes(app: FastifyInstance) {
  // Spot é escopado por equipe desde a migration team_multi_tenancy_1 —
  // antes era global (PROGRESS.md, Fase 4), qualquer usuário logado
  // via/apagava spot de qualquer equipe. Individual (18/09/2026) segue o
  // mesmo scope=equipe|individual de /strategies.
  app.get("/spots", { preHandler: requireAuth }, async (request, reply) => {
    const { scope } = request.query as { scope?: string };
    const equipeId = await getUserEquipeId(request.user!.id);
    const usarEquipe = scope === "individual" ? false : scope === "equipe" ? true : Boolean(equipeId);

    if (usarEquipe) {
      if (!equipeId) return reply.code(404).send({ error: SEM_EQUIPE_ERROR });
      const [spots, agentsByUuid] = await Promise.all([
        prisma.spot.findMany({ where: { equipeId }, include: SPOT_INCLUDE, orderBy: { createdAt: "desc" } }),
        loadAgentsByUuid(),
      ]);
      return spots.map((spot) => toSpotDTO(spot, agentsByUuid));
    }

    const [spots, agentsByUuid] = await Promise.all([
      prisma.spot.findMany({ where: { equipeId: null, criadoPorId: request.user!.id }, include: SPOT_INCLUDE, orderBy: { createdAt: "desc" } }),
      loadAgentsByUuid(),
    ]);
    return spots.map((spot) => toSpotDTO(spot, agentsByUuid));
  });

  app.post("/spots", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createBodySchemaComScope.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    let equipeId: string | null = null;
    if (parsed.data.scope === "equipe") {
      equipeId = await getUserEquipeId(request.user!.id);
      if (!equipeId) return reply.code(404).send({ error: SEM_EQUIPE_ERROR });
    }

    const map = await prisma.mapAsset.findUnique({ where: { id: parsed.data.mapId } });
    if (!map) return reply.code(400).send({ error: "Mapa inválido." });

    const spot = await prisma.spot.create({
      data: {
        equipeId,
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
    const existing = await prisma.spot.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Spot não encontrado." });

    if (existing.equipeId) {
      const equipeId = await getUserEquipeId(request.user!.id);
      if (equipeId !== existing.equipeId) return reply.code(404).send({ error: "Spot não encontrado." });
    } else if (existing.criadoPorId !== request.user!.id) {
      return reply.code(404).send({ error: "Spot não encontrado." });
    }

    await prisma.spot.delete({ where: { id } });
    return reply.code(204).send();
  });
}
