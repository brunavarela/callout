import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { buildAuthorizeUrl, exchangeCodeForToken, fetchDiscordProfile, avatarUrl, findGuildMembership } from "../lib/discord.js";
import { getAccountByRiotId, HenrikDevError } from "../lib/henrikdev.js";
import { setSessionCookie, clearSessionCookie, requireAuth, getSessionUser } from "../lib/session.js";
import { ensureTeamMembership } from "../lib/team.js";
import { toSessionUser } from "../lib/dto.js";

const STATE_COOKIE = "callout_oauth_state";

const riotIdBodySchema = z.object({
  riotId: z
    .string()
    .regex(/^[^#]{3,16}#[A-Za-z0-9]{3,5}$/, "Formato inválido. Use nome#tag."),
});

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/discord", async (request, reply) => {
    const state = randomBytes(16).toString("hex");
    reply.setCookie(STATE_COOKIE, state, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 10,
    });
    reply.redirect(buildAuthorizeUrl(state));
  });

  app.get("/auth/discord/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string };
    const savedState = request.cookies[STATE_COOKIE];
    reply.clearCookie(STATE_COOKIE, { path: "/" });

    if (!query.code || !query.state || query.state !== savedState) {
      return reply.code(400).send({ error: "state inválido — tente entrar de novo" });
    }

    try {
      const token = await exchangeCodeForToken(query.code);
      const [profile, membership] = await Promise.all([
        fetchDiscordProfile(token.access_token),
        findGuildMembership(token.access_token),
      ]);

      if (!membership) {
        return reply.redirect(`${env.WEB_ORIGIN}/login?erro=fora-do-servidor`);
      }

      const user = await prisma.user.upsert({
        where: { discordId: profile.id },
        update: { discordUsername: profile.username, discordAvatarUrl: avatarUrl(profile) },
        create: {
          discordId: profile.id,
          discordUsername: profile.username,
          discordAvatarUrl: avatarUrl(profile),
        },
      });

      await ensureTeamMembership(user.id, membership.name);
      setSessionCookie(reply, user.id);
      reply.redirect(user.riotPuuid ? `${env.WEB_ORIGIN}/` : `${env.WEB_ORIGIN}/login/vincular`);
    } catch (err) {
      request.log.error(err, "falha no callback do Discord OAuth");
      reply.redirect(`${env.WEB_ORIGIN}/login?erro=falha-login`);
    }
  });

  app.get("/auth/me", async (request, reply) => {
    const user = await getSessionUser(request);
    if (!user) return reply.code(401).send({ error: "não autenticado" });
    return toSessionUser(user);
  });

  app.post("/auth/logout", async (request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.post("/auth/riot", { preHandler: requireAuth }, async (request, reply) => {
    const parsedBody = riotIdBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: parsedBody.error.issues[0]?.message ?? "Riot ID inválido" });
    }

    const [name, tag] = parsedBody.data.riotId.split("#") as [string, string];

    try {
      const account = await getAccountByRiotId(name, tag);
      const user = await prisma.user.update({
        where: { id: request.user!.id },
        data: {
          riotPuuid: account.puuid,
          riotName: account.name,
          riotTag: account.tag,
          riotRegion: account.region,
        },
      });
      return toSessionUser(user);
    } catch (err) {
      if (err instanceof HenrikDevError) {
        return reply.code(err.status === 404 ? 404 : 502).send({ error: `Não achamos essa conta na Riot: ${err.message}` });
      }
      request.log.error(err, "falha ao vincular Riot ID");
      return reply.code(502).send({ error: "Falha ao falar com a HenrikDev. Tenta de novo em instantes." });
    }
  });
}
