import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { THEME_MODES, THEME_PALETTE } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { toSessionUser } from "../lib/dto.js";
import { getUserEquipe } from "../lib/equipe.js";
import { prisma } from "../lib/prisma.js";
import { getAccountByRiotId, HenrikDevError } from "../lib/henrikdev.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { sendCodigoEmail } from "../lib/email.js";
import { RIOT_ID_REGEX, gerarCodigoEmail, gerarCodigoTag, criarCodigo, ultimoCodigo, verificarCodigo, senhaSchema } from "../lib/authCodes.js";

// Cor principal também colore valores positivos; cor negativa é
// independente disso, só pra derrota/valores negativos — se fossem a
// mesma, não daria pra diferenciar vitória de derrota na tela.
const themeBodySchema = z.object({
  accentColor: z.enum(THEME_PALETTE),
  negativeColor: z.enum(THEME_PALETTE),
  glow: z.number().int().min(0).max(100),
  mode: z.enum(THEME_MODES),
});

// Nome de exibição, foto de perfil e preferência de "mostrar RiotID como
// nome" — só o próprio dono edita (ver resolveDisplayName em dto.ts).
// Imagem já vem comprimida (canvas) e em data URL — mesmo padrão de
// Spot.imagens.
const perfilBodySchema = z.object({
  displayName: z.string().max(60).optional(),
  avatarUrl: z.string().min(1).max(2_000_000).optional(),
  exibirRiotIdComoNome: z.boolean().optional(),
});

const solicitarEmailBodySchema = z.object({
  novoEmail: z.string().trim().toLowerCase().email("Email inválido."),
});

const confirmarEmailBodySchema = z.object({
  codigo: z.string().length(6),
});

const solicitarRiotIdBodySchema = z.object({
  riotId: z.string().regex(RIOT_ID_REGEX, "Formato inválido. Use nome#tag."),
});

const trocarSenhaBodySchema = z
  .object({
    senhaAtual: z.string().min(1, "Digita sua senha atual."),
    novaSenha: senhaSchema,
    confirmarNovaSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarNovaSenha, { message: "As senhas não coincidem.", path: ["confirmarNovaSenha"] });

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

    const updated = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
        ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
        ...(parsed.data.exibirRiotIdComoNome !== undefined ? { exibirRiotIdComoNome: parsed.data.exibirRiotIdComoNome } : {}),
      },
    });

    return toSessionUser(updated, await getUserEquipe(updated.id));
  });

  app.patch("/me/senha", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = trocarSenhaBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }

    const user = request.user!;
    if (!user.senhaHash || !verifyPassword(parsed.data.senhaAtual, user.senhaHash)) {
      return reply.code(401).send({ error: "Senha atual incorreta." });
    }

    await prisma.user.update({ where: { id: user.id }, data: { senhaHash: hashPassword(parsed.data.novaSenha) } });
    return { ok: true };
  });

  // Troca de email — fica pendente até confirmar posse do novo endereço
  // (código de 6 dígitos), mesmo mecanismo do cadastro.
  app.post("/me/email/solicitar", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = solicitarEmailBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Email inválido" });

    const user = request.user!;
    const { novoEmail } = parsed.data;
    if (novoEmail === user.email) return reply.code(400).send({ error: "Esse já é o seu email atual." });

    const emailExistente = await prisma.user.findUnique({ where: { email: novoEmail } });
    if (emailExistente && emailExistente.id !== user.id) {
      return reply.code(409).send({ error: "Esse email já está em uso por outra conta." });
    }

    await prisma.user.update({ where: { id: user.id }, data: { emailPendente: novoEmail } });
    const codigo = gerarCodigoEmail();
    await criarCodigo(user.id, "trocar_email", codigo);
    await sendCodigoEmail(novoEmail, codigo);
    return { ok: true };
  });

  app.post("/me/email/confirmar", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = confirmarEmailBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Código inválido" });

    const user = request.user!;
    if (!user.emailPendente) return reply.code(400).send({ error: "Nenhuma troca de email pendente." });

    const resultado = await verificarCodigo(user.id, "trocar_email", parsed.data.codigo);
    if (!resultado.ok) return reply.code(resultado.status).send({ error: resultado.error });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: user.emailPendente, emailPendente: null },
    });
    return toSessionUser(updated, await getUserEquipe(updated.id));
  });

  // Troca de RiotID — mesmo truque de posse do cadastro (trocar a tag da
  // conta pro código que a gente gerar), só que aplicado ao RiotID novo
  // (guardado como "pendente" até confirmar), não ao que já está vinculado.
  app.post("/me/riotid/solicitar", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = solicitarRiotIdBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "RiotID inválido" });

    const user = request.user!;
    const [riotName, riotTag] = parsed.data.riotId.split("#") as [string, string];

    let account;
    try {
      account = await getAccountByRiotId(riotName, riotTag);
    } catch (err) {
      if (err instanceof HenrikDevError) {
        return reply.code(err.status === 404 ? 404 : 502).send({ error: `Não achamos essa conta na Riot: ${err.message}` });
      }
      request.log.error(err, "falha ao consultar Riot ID na troca de perfil");
      return reply.code(502).send({ error: "Falha ao falar com a HenrikDev. Tenta de novo em instantes." });
    }

    if (account.puuid === user.riotPuuid) return reply.code(400).send({ error: "Esse já é o seu RiotID atual." });

    const puuidExistente = await prisma.user.findUnique({ where: { riotPuuid: account.puuid } });
    if (puuidExistente && puuidExistente.id !== user.id) {
      return reply.code(409).send({ error: "Esse RiotID já está vinculado a outra conta." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        riotPuuidPendente: account.puuid,
        riotNamePendente: account.name,
        riotTagPendente: account.tag,
        riotRegionPendente: account.region,
      },
    });

    const codigo = gerarCodigoTag();
    await criarCodigo(user.id, "trocar_riot_tag", codigo);
    return { codigo, riotName: account.name };
  });

  app.post("/me/riotid/confirmar", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (!user.riotNamePendente || !user.riotPuuidPendente) {
      return reply.code(400).send({ error: "Nenhuma troca de RiotID pendente." });
    }

    const authCode = await ultimoCodigo(user.id, "trocar_riot_tag");
    if (!authCode || authCode.expiresAt < new Date()) {
      return reply.code(400).send({ error: "Código expirado. Gera um novo." });
    }

    try {
      const account = await getAccountByRiotId(user.riotNamePendente, authCode.codigo);
      if (account.puuid !== user.riotPuuidPendente) {
        return reply.code(400).send({ error: "Essa tag não bate com a conta pendente. Confere e tenta de novo." });
      }
    } catch (err) {
      if (err instanceof HenrikDevError && err.status === 404) {
        return reply.code(404).send({ error: "Ainda não encontramos essa tag. Espera um instante depois de trocar e tenta de novo." });
      }
      request.log.error(err, "falha ao confirmar tag da Riot na troca de perfil");
      return reply.code(502).send({ error: "Falha ao falar com a HenrikDev. Tenta de novo em instantes." });
    }

    await prisma.authCode.delete({ where: { id: authCode.id } });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        riotPuuid: user.riotPuuidPendente,
        riotName: user.riotNamePendente,
        riotTag: user.riotTagPendente,
        riotRegion: user.riotRegionPendente,
        riotPuuidPendente: null,
        riotNamePendente: null,
        riotTagPendente: null,
        riotRegionPendente: null,
      },
    });
    return toSessionUser(updated, await getUserEquipe(updated.id));
  });
}
