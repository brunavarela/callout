import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export const SESSION_COOKIE = "callout_session";

// Em produção, web (Vercel) e api (Railway/Render) ficam em domínios
// diferentes — o navegador só manda o cookie em fetch cross-site se ele for
// SameSite=None + Secure. Em dev os dois são http://localhost, então
// SameSite=Lax sem Secure continua funcionando (Secure exige HTTPS).
const isProd = process.env.NODE_ENV === "production";

export function setSessionCookie(reply: FastifyReply, userId: string) {
  reply.setCookie(SESSION_COOKIE, userId, {
    path: "/",
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    signed: true,
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(request: FastifyRequest) {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;

  return prisma.user.findUnique({ where: { id: unsigned.value } });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getSessionUser(request);
  if (!user) {
    reply.code(401).send({ error: "não autenticado" });
    return;
  }
  request.user = user;
}
