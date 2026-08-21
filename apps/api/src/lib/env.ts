import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  HENRIKDEV_API_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3333),
  WEB_ORIGIN: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas ou faltando:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida — confira o .env na raiz do projeto.");
}

export const env = parsed.data;
