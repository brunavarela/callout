import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma.js";

// Compartilhado entre cadastro (routes/auth.ts) e edição de perfil
// (routes/me.ts) — os dois usam o mesmo mecanismo de código de uso único
// (email de 6 dígitos ou troca de tag da Riot) pra provar posse antes de
// confirmar algo sensível (email, senha, RiotID).

export const RIOT_ID_REGEX = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;
export const CODIGO_EXPIRA_MS = 15 * 60 * 1000;
export const REENVIO_COOLDOWN_MS = 60 * 1000;
// Sem O/0/I/1 — evita confusão na hora de digitar a tag no cliente do Valorant.
const TAG_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarCodigoEmail(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function gerarCodigoTag(): string {
  const bytes = randomBytes(4);
  let out = "";
  for (const b of bytes) out += TAG_CHARSET[b % TAG_CHARSET.length];
  return out;
}

export async function criarCodigo(userId: string, tipo: string, codigo: string): Promise<void> {
  await prisma.authCode.deleteMany({ where: { userId, tipo } });
  await prisma.authCode.create({
    data: { userId, tipo, codigo, expiresAt: new Date(Date.now() + CODIGO_EXPIRA_MS) },
  });
}

export function ultimoCodigo(userId: string, tipo: string) {
  return prisma.authCode.findFirst({ where: { userId, tipo }, orderBy: { createdAt: "desc" } });
}

export type VerificarCodigoResultado = { ok: true } | { ok: false; status: number; error: string };

// Confere o código mais recente daquele tipo pro usuário — expiração, limite
// de tentativas erradas e o valor em si. Já incrementa `tentativas` e já
// apaga o código em caso de sucesso (não precisa fazer isso de novo depois).
export async function verificarCodigo(userId: string, tipo: string, codigoDigitado: string): Promise<VerificarCodigoResultado> {
  const authCode = await ultimoCodigo(userId, tipo);
  if (!authCode || authCode.expiresAt < new Date()) {
    return { ok: false, status: 400, error: "Código expirado. Pede um novo." };
  }
  if (authCode.tentativas >= 5) {
    return { ok: false, status: 429, error: "Muitas tentativas erradas. Pede um novo código." };
  }
  if (authCode.codigo !== codigoDigitado) {
    await prisma.authCode.update({ where: { id: authCode.id }, data: { tentativas: { increment: 1 } } });
    return { ok: false, status: 400, error: "Código incorreto." };
  }
  await prisma.authCode.delete({ where: { id: authCode.id } });
  return { ok: true };
}

// Mesmas regras validadas no front (apps/web/src/lib/senha.ts,
// SENHA_REQUISITOS) — duplicado de propósito: o front dá feedback ao
// digitar, o back é a fonte de verdade (nunca confia só na validação do
// cliente).
export const senhaSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72)
  .regex(/[A-Z]/, "A senha precisa ter pelo menos uma letra maiúscula.")
  .regex(/[0-9]/, "A senha precisa ter pelo menos um número.")
  .regex(/[^A-Za-z0-9]/, "A senha precisa ter pelo menos um caractere especial.");
