import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { MAX_FUNCOES, MAX_MAIN_AGENTS } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { buildEquipeOverview, buildEquipeMatches, getUserEquipeId, criarEquipe, entrarEquipePorCodigo } from "../lib/equipe.js";
import { buildEquipePainel } from "../lib/equipePainel.js";
import { prisma } from "../lib/prisma.js";

const noteBodySchema = z.object({ note: z.string().max(280) });

const settingsBodySchema = z.object({
  funcoes: z.array(z.enum(["controlador", "duelista", "iniciador", "sentinela", "flex"])).min(1).max(MAX_FUNCOES),
  mainAgentUuids: z.array(z.string()).max(MAX_MAIN_AGENTS),
});

const createEquipeBodySchema = z.object({ nome: z.string().min(1).max(60) });
const joinEquipeBodySchema = z.object({ code: z.string().min(1).max(20) });

export async function equipeRoutes(app: FastifyInstance) {
  app.get("/equipe", { preHandler: requireAuth }, async (request, reply) => {
    const equipeId = await getUserEquipeId(request.user!.id);
    if (!equipeId) return reply.code(404).send({ error: "Você ainda não tem uma equipe." });

    const overview = await buildEquipeOverview(equipeId);
    if (!overview) return reply.code(404).send({ error: "Nenhuma equipe encontrada." });

    return {
      ...overview,
      members: overview.members.map((m) => ({ ...m, isSelf: m.userId === request.user!.id })),
    };
  });

  // Cria uma equipe nova — quem chama vira dono e primeiro membro. Recusa se
  // já tiver equipe (1 equipe por usuário, ver MembroEquipe.userId @unique).
  app.post("/equipes", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createEquipeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Nome inválido" });
    }

    const existing = await getUserEquipeId(request.user!.id);
    if (existing) return reply.code(400).send({ error: "Você já tem uma equipe." });

    const equipe = await criarEquipe(request.user!.id, parsed.data.nome);
    return reply.code(201).send({ id: equipe.id, name: equipe.nome, codigoConvite: equipe.codigoConvite });
  });

  // Entra numa equipe existente via código de convite (dono/membros veem o
  // código na tela Equipe). Mesma recusa de "já tem equipe" do create.
  app.post("/equipes/entrar", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = joinEquipeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Código inválido" });
    }

    const existing = await getUserEquipeId(request.user!.id);
    if (existing) return reply.code(400).send({ error: "Você já tem uma equipe." });

    const equipe = await entrarEquipePorCodigo(request.user!.id, parsed.data.code);
    if (!equipe) return reply.code(404).send({ error: "Código de convite não encontrado." });

    return reply.code(200).send({ id: equipe.id, name: equipe.nome });
  });

  // Recado social do card — "editável pelo grupo" (README do handoff, tela
  // Equipe). Qualquer membro pode editar o recado de qualquer outro do
  // MESMO time; é bagunça de amigos, não precisa de controle de permissão
  // fino além de "é da minha equipe".
  app.patch("/equipe/membros/:userId/recado", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = noteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Recado inválido" });
    }

    const equipeId = await getUserEquipeId(request.user!.id);
    if (!equipeId) return reply.code(404).send({ error: "Você ainda não tem uma equipe." });

    try {
      await prisma.membroEquipe.update({
        where: { equipeId_userId: { equipeId, userId } },
        data: { nota: parsed.data.note },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Esse membro não é da sua equipe." });
      }
      throw err;
    }

    return { ok: true };
  });

  // Função e agentes principais do card — mesmo espírito do recado: qualquer
  // membro pode editar de qualquer outro do MESMO time.
  app.patch("/equipe/membros/:userId/configuracoes", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = settingsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }

    const equipeId = await getUserEquipeId(request.user!.id);
    if (!equipeId) return reply.code(404).send({ error: "Você ainda não tem uma equipe." });

    try {
      await prisma.membroEquipe.update({
        where: { equipeId_userId: { equipeId, userId } },
        data: { funcoes: parsed.data.funcoes, mainAgentUuids: parsed.data.mainAgentUuids },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Esse membro não é da sua equipe." });
      }
      throw err;
    }

    return { ok: true };
  });

  // Só partidas com pelo menos MIN_TEAM_MATCH_PLAYERS membros da equipe
  // juntos (ver buildEquipeMatches) — histórico completo, sem recorte de 30
  // dias como o resumo do card da equipe.
  app.get("/equipe/partidas", { preHandler: requireAuth }, async (request, reply) => {
    const equipeId = await getUserEquipeId(request.user!.id);
    if (!equipeId) return reply.code(404).send({ error: "Você ainda não tem uma equipe." });
    return buildEquipeMatches(equipeId);
  });

  // Agregado das mesmas "partidas da equipe" de /equipe/partidas — sem
  // recorte de data, escopado à equipe de quem está logado.
  app.get("/equipe/painel", { preHandler: requireAuth }, async (request, reply) => {
    const equipeId = await getUserEquipeId(request.user!.id);
    if (!equipeId) return reply.code(404).send({ error: "Você ainda não tem uma equipe." });

    const summary = await buildEquipePainel(equipeId);
    if (!summary) return reply.code(404).send({ error: "Nenhuma equipe encontrada." });
    return summary;
  });
}
