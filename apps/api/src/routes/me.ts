import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { THEME_MODES, THEME_PALETTE } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { toSessionUser } from "../lib/dto.js";
import { getUserEquipe } from "../lib/equipe.js";
import { prisma } from "../lib/prisma.js";

// Cor principal também colore valores positivos; cor negativa é
// independente disso, só pra derrota/valores negativos — se fossem a
// mesma, não daria pra diferenciar vitória de derrota na tela.
const themeBodySchema = z.object({
  accentColor: z.enum(THEME_PALETTE),
  negativeColor: z.enum(THEME_PALETTE),
  glow: z.number().int().min(0).max(100),
  mode: z.enum(THEME_MODES),
});

// Nome de exibição e foto de perfil — só o próprio dono edita (ver
// MembroEquipeCard.name/avatarUrl, resolvidos com fallback pro
// riotName/discordUsername e discordAvatarUrl quando null). Imagem já vem
// comprimida (canvas) e em data URL — mesmo padrão de Spot.imagens.
const perfilBodySchema = z.object({
  displayName: z.string().max(60).optional(),
  avatarUrl: z.string().min(1).max(2_000_000).optional(),
});

export async function meRoutes(app: FastifyInstance) {
  app.patch("/me/theme", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = themeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Tema inválido" });
    }

    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        themeAccent: parsed.data.accentColor,
        themeNegative: parsed.data.negativeColor,
        themeGlow: parsed.data.glow,
        themeMode: parsed.data.mode,
      },
    });

    return toSessionUser(user, await getUserEquipe(user.id));
  });

  app.patch("/me/perfil", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = perfilBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }

    await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
        ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
      },
    });

    return { ok: true };
  });
}
