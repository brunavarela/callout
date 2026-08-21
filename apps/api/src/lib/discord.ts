import { env } from "./env.js";

const API_BASE = "https://discord.com/api/v10";

export function buildAuthorizeUrl(state: string) {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.DISCORD_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify guilds");
  url.searchParams.set("state", state);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.DISCORD_REDIRECT_URI,
  });

  const res = await fetch(`${API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Falha ao trocar code por token do Discord (${res.status})`);
  }

  return res.json() as Promise<TokenResponse>;
}

export interface DiscordProfile {
  id: string;
  username: string;
  avatar: string | null;
}

export async function fetchDiscordProfile(accessToken: string): Promise<DiscordProfile> {
  const res = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar perfil do Discord (${res.status})`);
  return res.json() as Promise<DiscordProfile>;
}

export function avatarUrl(profile: DiscordProfile): string | null {
  if (!profile.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
}

export async function isMemberOfGuild(accessToken: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao listar servidores do Discord (${res.status})`);
  const guilds = (await res.json()) as Array<{ id: string }>;
  return guilds.some((g) => g.id === env.DISCORD_GUILD_ID);
}
