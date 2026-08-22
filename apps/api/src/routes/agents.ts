import type { FastifyInstance } from "fastify";
import type { AgentAsset as AgentAssetDTO } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { prisma } from "../lib/prisma.js";

export async function agentsRoutes(app: FastifyInstance) {
  app.get("/agents", { preHandler: requireAuth }, async () => {
    const agents = await prisma.agentAsset.findMany({ orderBy: { nome: "asc" } });
    return agents.map(
      (a): AgentAssetDTO => ({
        id: a.id,
        uuid: a.uuid,
        nome: a.nome,
        funcao: a.funcao ?? "",
        displayIcon: a.displayIcon,
        cor: a.cor ?? "#9A9DA1",
      }),
    );
  });
}
