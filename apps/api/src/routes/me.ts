import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { THEME_PALETTE } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { toSessionUser } from "../lib/dto.js";
import { prisma } from "../lib/prisma.js";

// As duas cores (ação e positiva) são independentes de propósito: se
// fossem a mesma, vermelho passaria a significar vitória (ver README do
// design_handoff_callout v2).
const themeBodySchema = z.object({
  accentColor: z.enum(THEME_PALETTE),
  positiveColor: z.enum(THEME_PALETTE),
  glow: z.number().int().min(0).max(100),
  tintedCards: z.boolean(),
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
        themePositive: parsed.data.positiveColor,
        themeGlow: parsed.data.glow,
        themeTintedCards: parsed.data.tintedCards,
      },
    });

    return toSessionUser(user);
  });
}
