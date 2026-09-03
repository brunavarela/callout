import type { FastifyInstance } from "fastify";
import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { INTUITOS } from "@callout/shared";
import { prisma } from "../lib/prisma.js";
import { getAccountByRiotId, HenrikDevError } from "../lib/henrikdev.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { sendCodigoEmail, sendCodigoRedefinicaoSenha } from "../lib/email.js";
import { setSessionCookie, clearSessionCookie, requireAuth, getSessionUser } from "../lib/session.js";
import { getUserEquipe } from "../lib/equipe.js";
import { toSessionUser } from "../lib/dto.js";

const RIOT_ID_REGEX = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;
const CODIGO_EXPIRA_MS = 15 * 60 * 1000;
const REENVIO_COOLDOWN_MS = 60 * 1000;
// Sem O/0/I/1 — evita confusão na hora de digitar a tag no cliente do Valorant.
const TAG_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function gerarCodigoEmail(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function gerarCodigoTag(): string {
  const bytes = randomBytes(4);
  let out = "";
  for (const b of bytes) out += TAG_CHARSET[b % TAG_CHARSET.length];
  return out;
}

async function enviarCodigoEmail(userId: string, email: string): Promise<void> {
  const codigo = gerarCodigoEmail();
  await prisma.authCode.deleteMany({ where: { userId, tipo: "email" } });
  await prisma.authCode.create({
    data: { userId, tipo: "email", codigo, expiresAt: new Date(Date.now() + CODIGO_EXPIRA_MS) },
  });
  await sendCodigoEmail(email, codigo);
}

const cadastroBodySchema = z
  .object({
    nome: z.string().trim().min(2, "Nome muito curto.").max(60),
    dataNascimento: z.coerce.date({ errorMap: () => ({ message: "Data de nascimento inválida." }) }),
    email: z.string().trim().toLowerCase().email("Email inválido."),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72),
    confirmarSenha: z.string(),
    riotId: z.string().regex(RIOT_ID_REGEX, "Formato inválido. Use nome#tag."),
    intuitos: z.array(z.enum(INTUITOS)).min(1, "Escolhe pelo menos uma opção em \"pra que você vai usar\"."),
  })
  .refine((data) => data.senha === data.confirmarSenha, { message: "As senhas não coincidem.", path: ["confirmarSenha"] });

const verificarEmailBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  codigo: z.string().length(6),
});

const reenviarCodigoBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const intuitoBodySchema = z.object({
  intuitos: z.array(z.enum(INTUITOS)).min(1, "Escolhe pelo menos uma opção."),
});

const loginBodySchema = z.object({
  identificador: z.string().trim().min(1),
  senha: z.string().min(1),
});

const redefinirSenhaBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    codigo: z.string().length(6),
    novaSenha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72),
    confirmarNovaSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarNovaSenha, { message: "As senhas não coincidem.", path: ["confirmarNovaSenha"] });

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/cadastro", async (request, reply) => {
    const parsed = cadastroBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }
    const { nome, dataNascimento, email, senha, riotId, intuitos } = parsed.data;
    const [riotName, riotTag] = riotId.split("#") as [string, string];

    const emailExistente = await prisma.user.findUnique({ where: { email } });
    if (emailExistente?.emailVerificado) {
      return reply.code(409).send({ error: "Esse email já tem cadastro." });
    }

    let account;
    try {
      account = await getAccountByRiotId(riotName, riotTag);
    } catch (err) {
      if (err instanceof HenrikDevError) {
        return reply.code(err.status === 404 ? 404 : 502).send({ error: `Não achamos essa conta na Riot: ${err.message}` });
      }
      request.log.error(err, "falha ao consultar Riot ID no cadastro");
      return reply.code(502).send({ error: "Falha ao falar com a HenrikDev. Tenta de novo em instantes." });
    }

    const senhaHash = hashPassword(senha);
    const contaLegada = await prisma.user.findUnique({ where: { riotPuuid: account.puuid } });

    let user;
    if (contaLegada && contaLegada.senhaHash) {
      return reply.code(409).send({ error: "Essa conta Riot já tem cadastro." });
    } else if (contaLegada) {
      // Conta legada (só Discord, sem senha) — reaproveita a mesma linha,
      // equipe/spots/strategies continuam intactos porque o id não muda.
      // Já era do grupo fechado/confiável, então entra verificada direto.
      user = await prisma.user.update({
        where: { id: contaLegada.id },
        data: { displayName: nome, dataNascimento, email, senhaHash, riotVerificado: true, intuitos },
      });
    } else if (emailExistente) {
      // Cadastro anterior com esse email nunca confirmou o código — reusa a
      // linha em vez de bater no @unique de email numa segunda tentativa.
      user = await prisma.user.update({
        where: { id: emailExistente.id },
        data: {
          displayName: nome,
          dataNascimento,
          senhaHash,
          riotPuuid: account.puuid,
          riotName: account.name,
          riotTag: account.tag,
          riotRegion: account.region,
          riotVerificado: false,
          intuitos,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          displayName: nome,
          dataNascimento,
          email,
          senhaHash,
          riotPuuid: account.puuid,
          riotName: account.name,
          riotTag: account.tag,
          riotRegion: account.region,
          intuitos,
          riotVerificado: false,
        },
      });
    }

    await enviarCodigoEmail(user.id, email);
    return { ok: true, email };
  });

  app.post("/auth/verificar-email", async (request, reply) => {
    const parsed = verificarEmailBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Código inválido" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return reply.code(404).send({ error: "Não achamos esse cadastro." });

    const authCode = await prisma.authCode.findFirst({
      where: { userId: user.id, tipo: "email" },
      orderBy: { createdAt: "desc" },
    });
    if (!authCode || authCode.expiresAt < new Date()) {
      return reply.code(400).send({ error: "Código expirado. Pede um novo." });
    }
    if (authCode.tentativas >= 5) {
      return reply.code(429).send({ error: "Muitas tentativas erradas. Pede um novo código." });
    }
    if (authCode.codigo !== parsed.data.codigo) {
      await prisma.authCode.update({ where: { id: authCode.id }, data: { tentativas: { increment: 1 } } });
      return reply.code(400).send({ error: "Código incorreto." });
    }

    await prisma.authCode.delete({ where: { id: authCode.id } });
    const updated = await prisma.user.update({ where: { id: user.id }, data: { emailVerificado: true } });
    setSessionCookie(reply, updated.id);
    return toSessionUser(updated, await getUserEquipe(updated.id));
  });

  app.post("/auth/reenviar-codigo", async (request, reply) => {
    const parsed = reenviarCodigoBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Email inválido" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return reply.code(404).send({ error: "Não achamos esse cadastro." });
    if (user.emailVerificado) return reply.code(400).send({ error: "Esse email já foi verificado." });

    const ultimo = await prisma.authCode.findFirst({
      where: { userId: user.id, tipo: "email" },
      orderBy: { createdAt: "desc" },
    });
    if (ultimo && Date.now() - ultimo.createdAt.getTime() < REENVIO_COOLDOWN_MS) {
      return reply.code(429).send({ error: "Espera um instante antes de pedir outro código." });
    }

    await enviarCodigoEmail(user.id, user.email!);
    return { ok: true };
  });

  app.post("/auth/riot/gerar-codigo", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (user.riotVerificado) return reply.code(400).send({ error: "Seu RiotID já está verificado." });
    if (!user.riotName) return reply.code(400).send({ error: "Vincule um RiotID primeiro." });

    const codigo = gerarCodigoTag();
    await prisma.authCode.deleteMany({ where: { userId: user.id, tipo: "riot_tag" } });
    await prisma.authCode.create({
      data: { userId: user.id, tipo: "riot_tag", codigo, expiresAt: new Date(Date.now() + CODIGO_EXPIRA_MS) },
    });
    return { codigo, riotName: user.riotName };
  });

  app.post("/auth/riot/confirmar", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!;
    if (user.riotVerificado) return reply.code(400).send({ error: "Seu RiotID já está verificado." });
    if (!user.riotName || !user.riotPuuid) return reply.code(400).send({ error: "Vincule um RiotID primeiro." });

    const authCode = await prisma.authCode.findFirst({
      where: { userId: user.id, tipo: "riot_tag" },
      orderBy: { createdAt: "desc" },
    });
    if (!authCode || authCode.expiresAt < new Date()) {
      return reply.code(400).send({ error: "Código expirado. Gera um novo." });
    }

    try {
      const account = await getAccountByRiotId(user.riotName, authCode.codigo);
      if (account.puuid !== user.riotPuuid) {
        return reply.code(400).send({ error: "Essa tag não bate com a sua conta. Confere e tenta de novo." });
      }
    } catch (err) {
      if (err instanceof HenrikDevError && err.status === 404) {
        return reply.code(404).send({ error: "Ainda não encontramos essa tag. Espera um instante depois de trocar e tenta de novo." });
      }
      request.log.error(err, "falha ao confirmar tag da Riot");
      return reply.code(502).send({ error: "Falha ao falar com a HenrikDev. Tenta de novo em instantes." });
    }

    await prisma.authCode.delete({ where: { id: authCode.id } });
    const updated = await prisma.user.update({ where: { id: user.id }, data: { riotVerificado: true } });
    return toSessionUser(updated, await getUserEquipe(updated.id));
  });

  app.patch("/auth/intuito", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = intuitoBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }

    const updated = await prisma.user.update({
      where: { id: request.user!.id },
      data: { intuitos: parsed.data.intuitos },
    });
    return toSessionUser(updated, await getUserEquipe(updated.id));
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Preenche email/RiotID e senha." });

    const { identificador, senha } = parsed.data;
    const user = identificador.includes("#")
      ? await (() => {
          const [riotName, riotTag] = identificador.split("#");
          return prisma.user.findFirst({
            where: { riotName: { equals: riotName, mode: "insensitive" }, riotTag: { equals: riotTag, mode: "insensitive" } },
          });
        })()
      : await prisma.user.findUnique({ where: { email: identificador.toLowerCase() } });

    if (!user || !user.senhaHash || !verifyPassword(senha, user.senhaHash)) {
      return reply.code(401).send({ error: "Email/RiotID ou senha incorretos." });
    }

    if (!user.emailVerificado) {
      return reply.code(403).send({ error: "Confirma seu email antes de entrar.", email: user.email });
    }

    setSessionCookie(reply, user.id);
    return toSessionUser(user, await getUserEquipe(user.id));
  });

  app.post("/auth/recuperar-senha", async (request, reply) => {
    const parsed = reenviarCodigoBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Email inválido" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return reply.code(404).send({ error: "Não achamos esse cadastro." });
    if (!user.senhaHash) {
      return reply.code(400).send({ error: "Essa conta ainda não tem senha — complete o cadastro primeiro." });
    }

    const ultimo = await prisma.authCode.findFirst({
      where: { userId: user.id, tipo: "reset_senha" },
      orderBy: { createdAt: "desc" },
    });
    if (ultimo && Date.now() - ultimo.createdAt.getTime() < REENVIO_COOLDOWN_MS) {
      return reply.code(429).send({ error: "Espera um instante antes de pedir outro código." });
    }

    const codigo = gerarCodigoEmail();
    await prisma.authCode.deleteMany({ where: { userId: user.id, tipo: "reset_senha" } });
    await prisma.authCode.create({
      data: { userId: user.id, tipo: "reset_senha", codigo, expiresAt: new Date(Date.now() + CODIGO_EXPIRA_MS) },
    });
    await sendCodigoRedefinicaoSenha(user.email!, codigo);
    return { ok: true };
  });

  app.post("/auth/redefinir-senha", async (request, reply) => {
    const parsed = redefinirSenhaBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Dado inválido" });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return reply.code(404).send({ error: "Não achamos esse cadastro." });

    const authCode = await prisma.authCode.findFirst({
      where: { userId: user.id, tipo: "reset_senha" },
      orderBy: { createdAt: "desc" },
    });
    if (!authCode || authCode.expiresAt < new Date()) {
      return reply.code(400).send({ error: "Código expirado. Pede um novo." });
    }
    if (authCode.tentativas >= 5) {
      return reply.code(429).send({ error: "Muitas tentativas erradas. Pede um novo código." });
    }
    if (authCode.codigo !== parsed.data.codigo) {
      await prisma.authCode.update({ where: { id: authCode.id }, data: { tentativas: { increment: 1 } } });
      return reply.code(400).send({ error: "Código incorreto." });
    }

    await prisma.authCode.delete({ where: { id: authCode.id } });
    const updated = await prisma.user.update({ where: { id: user.id }, data: { senhaHash: hashPassword(parsed.data.novaSenha) } });
    setSessionCookie(reply, updated.id);
    return toSessionUser(updated, await getUserEquipe(updated.id));
  });

  app.get("/auth/me", async (request, reply) => {
    const user = await getSessionUser(request);
    if (!user) return reply.code(401).send({ error: "não autenticado" });
    return toSessionUser(user, await getUserEquipe(user.id));
  });

  app.post("/auth/logout", async (request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });
}
