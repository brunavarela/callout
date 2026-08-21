import type { TeamOverview } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr } from "./henrikdev.js";

// App de time único (< 10 amigos, sem multi-tenancy — CONTEXT.md §1). Todo
// usuário que loga entra automaticamente no único time existente; o primeiro
// a logar vira "dono" só porque a coluna owner_id precisa de alguém, isso não
// tem efeito prático hoje.
export async function ensureTeamMembership(userId: string, guildName: string) {
  const team = await prisma.team.findFirst();

  if (!team) {
    return prisma.team.create({
      data: {
        nome: guildName,
        ownerId: userId,
        members: { create: { userId } },
      },
    });
  }

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId } },
    update: {},
    create: { teamId: team.id, userId },
  });

  return team;
}

const round0 = (n: number) => Math.round(n);

export async function buildTeamOverview(): Promise<TeamOverview | null> {
  const team = await prisma.team.findFirst({
    include: { members: { include: { user: true } } },
  });
  if (!team) return null;

  const windowStart = new Date(Date.now() - 30 * 86_400_000);
  const puuids = team.members.map((m) => m.user.riotPuuid).filter((p): p is string => Boolean(p));

  const rows = puuids.length
    ? await prisma.matchPlayer.findMany({
        where: { puuid: { in: puuids }, match: { startedAt: { gte: windowStart } } },
        include: { match: true },
      })
    : [];

  const byMatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r);
    byMatch.set(r.matchId, list);
  }
  const togetherMatches = [...byMatch.values()].filter((list) => new Set(list.map((r) => r.puuid)).size >= 2);
  const togetherWins = togetherMatches.filter((list) => list[0]!.won).length;

  const members = await Promise.all(
    team.members.map(async (m) => {
      const puuid = m.user.riotPuuid;
      const memberRows = puuid ? rows.filter((r) => r.puuid === puuid) : [];

      const kills = memberRows.reduce((s, r) => s + r.kills, 0);
      const deaths = memberRows.reduce((s, r) => s + r.deaths, 0);
      const assists = memberRows.reduce((s, r) => s + r.assists, 0);
      const acsSum = memberRows.reduce((s, r) => s + r.acs, 0);
      const wins = memberRows.filter((r) => r.won).length;

      let rankLabel = "—";
      if (puuid && m.user.riotRegion) {
        try {
          const mmr = await getMmr(m.user.riotRegion, puuid);
          rankLabel = mmr.current_data.currenttierpatched;
        } catch {
          // sem rank disponível — mantém o placeholder
        }
      }

      return {
        userId: m.userId,
        name: m.user.riotName ?? m.user.discordUsername,
        rankLabel,
        role: (m.funcao ?? m.user.funcaoPreferida ?? "iniciador") as TeamOverview["members"][number]["role"],
        isSelf: false, // preenchido pela rota, que sabe quem é o usuário autenticado
        kda: memberRows.length ? round0(((kills + assists) / Math.max(deaths, 1)) * 100) / 100 : 0,
        acs: memberRows.length ? round0(acsSum / memberRows.length) : 0,
        winratePercent: memberRows.length ? round0((wins / memberRows.length) * 100) : 0,
        note: m.nota ?? "",
      };
    }),
  );

  return {
    id: team.id,
    name: team.nome,
    memberCount: team.members.length,
    matchesTogether30d: togetherMatches.length,
    groupWinratePercent: togetherMatches.length ? round0((togetherWins / togetherMatches.length) * 100) : 0,
    members,
  };
}
