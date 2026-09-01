import type { User } from "@prisma/client";
import type { SessionUser, ThemeMode } from "@callout/shared";

export function toSessionUser(user: User, equipe: { id: string; nome: string } | null): SessionUser {
  return {
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatarUrl: user.discordAvatarUrl,
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
  };
}
