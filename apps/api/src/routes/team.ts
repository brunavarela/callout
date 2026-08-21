import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { buildTeamOverview } from "../lib/team.js";
import { prisma } from "../lib/prisma.js";

const noteBodySchema = z.object({ note: z.string().max(280) });

export async function teamRoutes(app: FastifyInstance) {
  app.get("/team", { preHandler: requireAuth }, async (request, reply) => {
    const overview = await buildTeamOverview();
    if (!overview) return reply.code(404).send({ error: "Nenhum time encontrado." });

    return {
      ...overview,
      members: overview.members.map((m) => ({ ...m, isSelf: m.userId === request.user!.id })),
    };
  });

  // Recado social do card — "editável pelo grupo" (README do handoff, tela Time).
  // Qualquer membro do time pode editar o recado de qualquer outro; é bagunça
  // de amigos, não precisa de controle de permissão fino aqui.
  app.patch("/team/members/:userId/note", { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = noteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Recado inválido" });
    }

    const team = await prisma.team.findFirst();
    if (!team) return reply.code(404).send({ error: "Nenhum time encontrado." });

    await prisma.teamMember.update({
      where: { teamId_userId: { teamId: team.id, userId } },
      data: { nota: parsed.data.note },
    });

    return { ok: true };
  });
}
