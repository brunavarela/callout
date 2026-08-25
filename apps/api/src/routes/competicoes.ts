import type { FastifyInstance } from "fastify";
import { atualizarConfrontoSchema } from "@callout/shared";
import { requireAuth, requireAdmin } from "../lib/session.js";
import { listCompeticoes, updateConfronto } from "../lib/competicoes.js";

export async function competicoesRoutes(app: FastifyInstance) {
  app.get("/competicoes", { preHandler: requireAuth }, async () => {
    return listCompeticoes();
  });

  app.patch(
    "/competicoes/:competicaoId/confrontos/:confrontoId",
    { preHandler: [requireAuth, requireAdmin] },
    async (request, reply) => {
      const { competicaoId, confrontoId } = request.params as { competicaoId: string; confrontoId: string };
      const parsed = atualizarConfrontoSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
      }

      const confronto = await updateConfronto(competicaoId, confrontoId, parsed.data);
      if (!confronto) return reply.code(404).send({ error: "Confronto não encontrado" });

      return confronto;
    },
  );
}
