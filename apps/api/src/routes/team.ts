import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { MAX_FUNCOES, MAX_MAIN_AGENTS } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { buildTeamOverview, buildTeamMatches, getUserTeamId, createTeam, joinTeamByCode } from "../lib/team.js";
import { buildTeamDashboard } from "../lib/teamDashboard.js";
import { prisma } from "../lib/prisma.js";

const noteBodySchema = z.object({ note: z.string().max(280) });

const settingsBodySchema = z.object({
  funcoes: z.array(z.enum(["controlador", "duelista", "iniciador", "sentinela", "flex"])).min(1).max(MAX_FUNCOES),
  mainAgentUuids: z.array(z.string()).max(MAX_MAIN_AGENTS),
});

const createTeamBodySchema = z.object({ nome: z.string().min(1).max(60) });
const joinTeamBodySchema = z.object({ code: z.string().min(1).max(20) });

export async function teamRoutes(app: FastifyInstance) {
  app.get("/team", { preHandler: requireAuth }, async (request, reply) => {
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    const overview = await buildTeamOverview(teamId);
    if (!overview) return reply.code(404).send({ error: "Nenhum time encontrado." });

    return {
      ...overview,
      members: overview.members.map((m) => ({ ...m, isSelf: m.userId === request.user!.id })),
    };
  });

  // Cria um time novo — quem chama vira dono e primeiro membro. Recusa se
  // já tiver time (1 time por usuário, ver TeamMember.userId @unique).
  app.post("/teams", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createTeamBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Nome inválido" });
    }

    const existing = await getUserTeamId(request.user!.id);
    if (existing) return reply.code(400).send({ error: "Você já tem um time." });

    const team = await createTeam(request.user!.id, parsed.data.nome);
    return reply.code(201).send({ id: team.id, name: team.nome, inviteCode: team.inviteCode });
  });

  // Entra num time existente via código de convite (dono/membros veem o
  // código na tela Time). Mesma recusa de "já tem time" do create.
  app.post("/teams/join", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = joinTeamBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Código inválido" });
    }

    const existing = await getUserTeamId(request.user!.id);
    if (existing) return reply.code(400).send({ error: "Você já tem um time." });

    const team = await joinTeamByCode(request.user!.id, parsed.data.code);
    if (!team) return reply.code(404).send({ error: "Código de convite não encontrado." });

    return reply.code(200).send({ id: team.id, name: team.nome });
  });

  // Recado social do card — "editável pelo grupo" (README do handoff, tela Time).
  // Qualquer membro do time pode editar o recado de qualquer outro do MESMO
  // time; é bagunça de amigos, não precisa de controle de permissão fino
  // além de "é do meu time".
  app.patch("/team/members/:userId/note", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = noteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Recado inválido" });
    }

    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    try {
      await prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId } },
        data: { nota: parsed.data.note },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Esse membro não é do seu time." });
      }
      throw err;
    }

    return { ok: true };
  });

  // Função e agentes principais do card — mesmo espírito do recado: qualquer
  // membro do time pode editar de qualquer outro do MESMO time.
  app.patch("/team/members/:userId/settings", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = settingsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }

    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    try {
      await prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId } },
        data: { funcoes: parsed.data.funcoes, mainAgentUuids: parsed.data.mainAgentUuids },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return reply.code(404).send({ error: "Esse membro não é do seu time." });
      }
      throw err;
    }

    return { ok: true };
  });

  // Só partidas com pelo menos MIN_TEAM_MATCH_PLAYERS membros do time
  // juntos (ver buildTeamMatches) — histórico completo, sem recorte de 30
  // dias como o resumo do card do time.
  app.get("/team/matches", { preHandler: requireAuth }, async (request, reply) => {
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });
    return buildTeamMatches(teamId);
  });

  // Agregado das mesmas "partidas do time" de /team/matches — sem recorte
  // de data, escopado ao time de quem está logado.
  app.get("/team/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const teamId = await getUserTeamId(request.user!.id);
    if (!teamId) return reply.code(404).send({ error: "Você ainda não tem um time." });

    const summary = await buildTeamDashboard(teamId);
    if (!summary) return reply.code(404).send({ error: "Nenhum time encontrado." });
    return summary;
  });
}
