import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { ensureMapAsset, loadUsageStats, toStrategyDTO } from "../lib/strategy.js";
import { getUserEquipeId, canManageEquipeStrategies } from "../lib/equipe.js";

const STRATEGY_INCLUDE = { items: true, map: true, criadoPor: true } as const;

const SEM_EQUIPE_ERROR = "Você ainda não tem uma equipe.";
const SEM_PERMISSAO_ERROR = "Só IGL, treinador ou admin da equipe pode gerenciar estratégia de equipe.";

const createBodySchema = z.object({
  // "equipe" exige cargo/admin (canManageEquipeStrategies) -- "individual"
  // não depende de equipe nenhuma, só de quem criou. PRO ainda não existe
  // (LAUNCH.md §5/§12) -- quando existir, o gate de estratégia individual
  // entra bem aqui, antes do prisma.strategy.create.
  scope: z.enum(["equipe", "individual"]),
  mapName: z.string().min(1),
  side: z.enum(["ATK", "DEF"]),
  title: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
});

const itemSchema = z.object({
  kind: z.enum(["agent", "smoke", "flash", "molly", "spike", "arrow", "line"]),
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

export async function strategiesRoutes(app: FastifyInstance) {
  // scope=equipe lista as estratégias do time (exige ter equipe); scope=
  // individual lista só as próprias, sem equipe nenhuma envolvida. Sem
  // query (compat com chamadas antigas), cai pro time se a pessoa tiver
  // uma, senão pras individuais -- mesma lógica que Board.tsx usa pra
  // decidir a aba inicial do toggle Equipe/Individual.
  app.get("/strategies", { preHandler: requireAuth }, async (request, reply) => {
    const { scope } = request.query as { scope?: string };
    const equipeId = await getUserEquipeId(request.user!.id);
    const usarEquipe = scope === "individual" ? false : scope === "equipe" ? true : Boolean(equipeId);

    if (usarEquipe) {
      if (!equipeId) return reply.code(404).send({ error: SEM_EQUIPE_ERROR });
      const strategies = await prisma.strategy.findMany({
        where: { equipeId },
        include: STRATEGY_INCLUDE,
        orderBy: { updatedAt: "desc" },
      });
      const usageByStrategy = await loadUsageStats(strategies.map((s) => s.id));
      return strategies.map((s) => toStrategyDTO(s, usageByStrategy.get(s.id)));
    }

    const strategies = await prisma.strategy.findMany({
      where: { equipeId: null, criadoPorId: request.user!.id },
      include: STRATEGY_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });
    const usageByStrategy = await loadUsageStats(strategies.map((s) => s.id));
    return strategies.map((s) => toStrategyDTO(s, usageByStrategy.get(s.id)));
  });

  app.get("/strategies/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const strategy = await prisma.strategy.findUnique({ where: { id }, include: STRATEGY_INCLUDE });
    if (!strategy) return reply.code(404).send({ error: "Estratégia não encontrada." });

    // Time: qualquer membro do MESMO time vê. Individual: só quem criou.
    // Trata "não é sua" como 404 (não distinguir de "não existe") pros dois
    // casos, mesmo padrão que já existia aqui.
    if (strategy.equipeId) {
      const equipeId = await getUserEquipeId(request.user!.id);
      if (equipeId !== strategy.equipeId) return reply.code(404).send({ error: "Estratégia não encontrada." });
    } else if (strategy.criadoPorId !== request.user!.id) {
      return reply.code(404).send({ error: "Estratégia não encontrada." });
    }

    const usage = (await loadUsageStats([strategy.id])).get(strategy.id);
    return toStrategyDTO(strategy, usage);
  });

  app.post("/strategies", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    let equipeId: string | null = null;
    if (parsed.data.scope === "equipe") {
      equipeId = await getUserEquipeId(request.user!.id);
      if (!equipeId) return reply.code(404).send({ error: SEM_EQUIPE_ERROR });
      if (!(await canManageEquipeStrategies(request.user!.id, equipeId))) {
        return reply.code(403).send({ error: SEM_PERMISSAO_ERROR });
      }
    }
    // scope "individual": sem equipe nenhuma envolvida. PRO ainda não
    // existe (LAUNCH.md §5/§12) -- é aqui que o gate entra quando existir;
    // por ora, qualquer usuário autenticado pode criar as suas.

    const map = await ensureMapAsset(parsed.data.mapName);

    const strategy = await prisma.strategy.create({
      data: {
        equipeId,
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

    const existing = await prisma.strategy.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Estratégia não encontrada." });

    if (existing.equipeId) {
      const equipeId = await getUserEquipeId(request.user!.id);
      if (equipeId !== existing.equipeId) return reply.code(404).send({ error: "Estratégia não encontrada." });
      if (!(await canManageEquipeStrategies(request.user!.id, existing.equipeId))) {
        return reply.code(403).send({ error: SEM_PERMISSAO_ERROR });
      }
    } else if (existing.criadoPorId !== request.user!.id) {
      return reply.code(404).send({ error: "Estratégia não encontrada." });
    }

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
    const usage = (await loadUsageStats([updated.id])).get(updated.id);
    return toStrategyDTO(updated, usage);
  });

  // items e usages têm onDelete: Cascade no schema — apagar a estratégia já
  // limpa os dois, sem precisar de transação manual aqui.
  app.delete("/strategies/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.strategy.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "Estratégia não encontrada." });

    if (existing.equipeId) {
      const equipeId = await getUserEquipeId(request.user!.id);
      if (equipeId !== existing.equipeId) return reply.code(404).send({ error: "Estratégia não encontrada." });
      if (!(await canManageEquipeStrategies(request.user!.id, existing.equipeId))) {
        return reply.code(403).send({ error: SEM_PERMISSAO_ERROR });
      }
    } else if (existing.criadoPorId !== request.user!.id) {
      return reply.code(404).send({ error: "Estratégia não encontrada." });
    }

    await prisma.strategy.delete({ where: { id } });
    return reply.code(204).send();
  });
}
