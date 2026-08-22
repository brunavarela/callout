import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";
import { toCommentDTO } from "../lib/comments.js";

const createCommentSchema = z.object({
  entidadeTipo: z.enum(["match", "strategy", "spot"]),
  entidadeId: z.string().min(1),
  texto: z.string().min(1).max(2000),
});

export async function commentsRoutes(app: FastifyInstance) {
  app.post("/comments", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }
    const { entidadeTipo, entidadeId, texto } = parsed.data;

    const exists =
      entidadeTipo === "match"
        ? await prisma.match.findUnique({ where: { id: entidadeId } })
        : entidadeTipo === "strategy"
          ? await prisma.strategy.findUnique({ where: { id: entidadeId } })
          : await prisma.spot.findUnique({ where: { id: entidadeId } });
    if (!exists) return reply.code(404).send({ error: "Registro não encontrado pra comentar." });

    const comment = await prisma.comment.create({
      data: { entidadeTipo, entidadeId, userId: request.user!.id, texto },
      include: { user: true },
    });
    return reply.code(201).send(toCommentDTO(comment));
  });
}
