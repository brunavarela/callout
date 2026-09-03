import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Resend (https://resend.com — tier gratuito, 3.000 emails/mês) — envia o
  // código de verificação do cadastro. EMAIL_FROM precisa ser um endereço no
  // domínio verificado na Resend (ex.: "Callout <naoresponda@callout.app.br>").
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  HENRIKDEV_API_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3333),
  WEB_ORIGIN: z.string().min(1),
  // Error tracking (Sentry, tier gratuito) — opcional de propósito. Sem
  // DSN, Sentry.init() vira no-op (ver server.ts) em vez de quebrar o
  // boot; só liga de verdade quando alguém criar o projeto no Sentry e
  // colar o DSN aqui.
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas ou faltando:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida — confira o .env na raiz do projeto.");
}

export const env = parsed.data;
