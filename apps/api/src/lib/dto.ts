import type { User } from "@prisma/client";
import type { SessionUser } from "@callout/shared";

export function toSessionUser(user: User): SessionUser {
  return {
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatarUrl: user.discordAvatarUrl,
    riotId:
      user.riotName && user.riotTag && user.riotPuuid
        ? { name: user.riotName, tag: user.riotTag, puuid: user.riotPuuid }
        : null,
    theme: {
      accentColor: user.themeAccent,
      negativeColor: user.themeNegative,
      glow: user.themeGlow,
      tintedCards: user.themeTintedCards,
    },
    isAdmin: user.isAdmin,
  };
}
