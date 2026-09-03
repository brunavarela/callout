import type { User } from "@prisma/client";
import type { Intuito, SessionUser, ThemeMode } from "@callout/shared";
import { resolveOnboardingStep } from "./onboarding.js";

// Nome/avatar de exibição em qualquer lugar do app que mostre um usuário —
// prioriza o que a pessoa configurou no próprio perfil, com fallback pro
// Riot ID e, só pra contas legadas do login antigo por Discord, o
// discordUsername/discordAvatarUrl daquela época.
export function resolveDisplayName(user: Pick<User, "displayName" | "riotName" | "discordUsername" | "email">): string {
  return user.displayName ?? user.riotName ?? user.discordUsername ?? user.email ?? "Sem nome";
}

export function resolveAvatarUrl(user: Pick<User, "avatarUrl" | "discordAvatarUrl">): string | null {
  return user.avatarUrl ?? user.discordAvatarUrl;
}

export function toSessionUser(user: User, equipe: { id: string; nome: string } | null): SessionUser {
  return {
    nome: resolveDisplayName(user),
    avatarUrl: resolveAvatarUrl(user),
    email: user.email,
    emailVerificado: user.emailVerificado,
    riotVerificado: user.riotVerificado,
    dataNascimento: user.dataNascimento ? user.dataNascimento.toISOString() : null,
    intuitos: user.intuitos as Intuito[],
    riotId:
      user.riotName && user.riotTag && user.riotPuuid
        ? { name: user.riotName, tag: user.riotTag, puuid: user.riotPuuid }
        : null,
    equipe: equipe ? { id: equipe.id, name: equipe.nome } : null,
    theme: {
      accentColor: user.themeAccent,
      negativeColor: user.themeNegative,
      glow: user.themeGlow,
      mode: user.themeMode as ThemeMode,
    },
    isAdmin: user.isAdmin,
    proximoPasso: resolveOnboardingStep(user, equipe !== null),
  };
}
