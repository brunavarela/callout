import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { ensureMapAsset, toStrategyDTO } from "../lib/strategy.js";

const STRATEGY_INCLUDE = { items: true, map: true, criadoPor: true } as const;

const createBodySchema = z.object({
  mapName: z.string().min(1),
  side: z.enum(["ATK", "DEF"]),
  title: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
});

const itemSchema = z.object({
  kind: z.enum(["agent", "smoke", "flash", "molly", "arrow", "line"]),
  label: z.string().max(10).optional(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
  agentId: z.string().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
});

const updateBodySchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
  items: z.array(itemSchema).optional(),
});

async function getUserTeamId(userId: string): Promise<string | null> {
  const membership = await prisma.teamMember.findFirst({ where: { userId } });
  return membership?.teamId ?? null;
}

export async function strategiesRoutes(app: FastifyInstance) {
  app.get("/strategies", { preHandler: requireAuth }, async (request, reply) => {
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Nenhum time encontrado." });

    const strategies = await prisma.strategy.findMany({
      where: { teamId },
      include: STRATEGY_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });
    return strategies.map(toStrategyDTO);
  });

  app.get("/strategies/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Nenhum time encontrado." });

    const strategy = await prisma.strategy.findFirst({ where: { id, teamId }, include: STRATEGY_INCLUDE });
    if (!strategy) return reply.code(404).send({ error: "Estratégia não encontrada." });
    return toStrategyDTO(strategy);
  });

  app.post("/strategies", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Nenhum time encontrado." });

    const map = await ensureMapAsset(parsed.data.mapName);

    const strategy = await prisma.strategy.create({
      data: {
        teamId,
        mapId: map.id,
        lado: parsed.data.side,
        titulo: parsed.data.title,
        descricao: parsed.data.description ?? "",
        criadoPorId: request.user!.id,
      },
      include: STRATEGY_INCLUDE,
    });

    return reply.code(201).send(toStrategyDTO(strategy));
  });

  app.patch("/strategies/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Nenhum time encontrado." });

    const existing = await prisma.strategy.findFirst({ where: { id, teamId } });
    if (!existing) return reply.code(404).send({ error: "Estratégia não encontrada." });

    const { items, ...fields } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.strategy.update({
        where: { id },
        data: {
          ...(fields.title !== undefined ? { titulo: fields.title } : {}),
          ...(fields.description !== undefined ? { descricao: fields.description } : {}),
        },
      });

      // Salvar substitui o board inteiro — mais simples e previsível do que
      // tentar diffar fichas contra o estado anterior.
      if (items) {
        await tx.stratItem.deleteMany({ where: { strategyId: id } });
        await tx.stratItem.createMany({
          data: items.map((item) => ({
            strategyId: id,
            tipo: item.kind,
            x: item.x,
            y: item.y,
            agentUuid: item.agentId ?? null,
            payload: { label: item.label, color: item.color, points: item.points },
          })),
        });
      }
    });

    const updated = await prisma.strategy.findFirstOrThrow({ where: { id }, include: STRATEGY_INCLUDE });
    return toStrategyDTO(updated);
  });
}
