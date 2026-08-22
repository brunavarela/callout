import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { buildMatchDetail } from "../lib/matches.js";

const tagBodySchema = z.object({ strategyId: z.string().min(1) });

async function loadTaggedStrategies(matchId: string) {
  const usages = await prisma.strategyUsage.findMany({ where: { matchId }, include: { strategy: true } });
  return usages.map((u) => ({ id: u.strategy.id, title: u.strategy.titulo }));
}

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

  // Marcação manual de "usamos essa estratégia nessa partida" — não dá pra
  // detectar automaticamente (ver StrategyUsage no schema).
  app.post("/matches/:id/strategy-usage", { preHandler: requireAuth }, async (request, reply) => {
    const { id: matchId } = request.params as { id: string };
    const user = request.user!;
    const parsed = tagBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    if (!user.riotPuuid) return reply.code(409).send({ error: "Vincule seu Riot ID antes de marcar uma estratégia." });

    const myRow = await prisma.matchPlayer.findUnique({ where: { matchId_puuid: { matchId, puuid: user.riotPuuid } } });
    if (!myRow) return reply.code(404).send({ error: "Partida não encontrada." });

    const membership = await prisma.teamMember.findFirst({ where: { userId: user.id } });
    if (!membership) return reply.code(404).send({ error: "Nenhum time encontrado." });

    const strategy = await prisma.strategy.findFirst({ where: { id: parsed.data.strategyId, teamId: membership.teamId } });
    if (!strategy) return reply.code(404).send({ error: "Estratégia não encontrada." });

    await prisma.strategyUsage.upsert({
      where: { matchId_strategyId: { matchId, strategyId: strategy.id } },
      update: {},
      create: { matchId, strategyId: strategy.id, won: myRow.won, marcadoPorId: user.id },
    });

    return reply.code(201).send(await loadTaggedStrategies(matchId));
  });

  app.delete("/matches/:id/strategy-usage/:strategyId", { preHandler: requireAuth }, async (request, reply) => {
    const { id: matchId, strategyId } = request.params as { id: string; strategyId: string };
    const user = request.user!;

    const membership = await prisma.teamMember.findFirst({ where: { userId: user.id } });
    if (!membership) return reply.code(404).send({ error: "Nenhum time encontrado." });

    const usage = await prisma.strategyUsage.findFirst({
      where: { matchId, strategyId, strategy: { teamId: membership.teamId } },
    });
    if (!usage) return reply.code(404).send({ error: "Marcação não encontrada." });

    await prisma.strategyUsage.delete({ where: { id: usage.id } });
    return loadTaggedStrategies(matchId);
  });
}
