import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/session.js";
import { toSessionUser } from "../lib/dto.js";
import { prisma } from "../lib/prisma.js";

// Paleta fechada do handoff — as duas cores (ação e positiva) são
// independentes de propósito: se fossem a mesma, vermelho passaria a
// significar vitória (ver README do design_handoff_callout v2).
const PALETTE = ["#EF4958", "#18AAB7", "#192573", "#421662"] as const;

const themeBodySchema = z.object({
  accentColor: z.enum(PALETTE),
  positiveColor: z.enum(PALETTE),
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
