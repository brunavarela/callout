import type { MatchV4Data, RrHistoryPoint, SidesBreakdown } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmrHistory } from "./henrikdev.js";
import { matchResult } from "./match-result.js";

// Histórico de RR real, um ponto por partida (não por dia) — a HenrikDev dá
// o RR ganho/perdido (`last_change`) já casado com o `match_id`, que é o
// mesmo id que a gente usa como `Match.id` (ver schema.prisma). Partidas sem
// entrada correspondente na mmr-history (deathmatch, unrated etc. não geram
// RR) ficam de fora — não tem o que plotar nelas.
export async function buildRrHistory(affinity: string, puuid: string, modoFilter?: "Competitive" | "Unrated"): Promise<RrHistoryPoint[]> {
  const [history, rows] = await Promise.all([
    getMmrHistory(affinity, puuid),
    prisma.matchPlayer.findMany({
      where: { puuid, ...(modoFilter ? { match: { modo: modoFilter } } : {}) },
      include: { match: true },
      orderBy: { match: { startedAt: "asc" } },
    }),
  ]);

  const rrByMatch = new Map(history.map((h) => [h.match_id, h.last_change]));

  return rows
    .filter((r) => rrByMatch.has(r.match.id))
    .map((r) => {
      const match = r.match.rawJson as unknown as MatchV4Data;
      return {
        matchId: r.match.id,
        label: r.match.startedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        delta: rrByMatch.get(r.match.id)!,
        map: match.metadata.map.name,
        agent: r.agentName,
        result: matchResult(r.won, rrByMatch.get(r.match.id)),
      };
    });
}

const HALF_1_LAST_ROUND = 12;
const HALF_2_LAST_ROUND = 24;

function computeMatchSides(match: MatchV4Data, teamId: string): { attack: [number, number]; defense: [number, number]; overtime: [number, number] } {
  const result = { attack: [0, 0] as [number, number], defense: [0, 0] as [number, number], overtime: [0, 0] as [number, number] };

  const teamIdOfPuuid = (puuid: string) => match.players.find((p) => p.puuid === puuid)?.team_id;

  // Âncora: acha o time que atacou em algum round com plant na primeira
  // metade; se não achar, tenta na segunda e inverte.
  const firstHalfPlant = match.rounds.find((r) => r.id <= HALF_1_LAST_ROUND && r.plant)?.plant;
  const secondHalfPlant = match.rounds.find((r) => r.id > HALF_1_LAST_ROUND && r.id <= HALF_2_LAST_ROUND && r.plant)?.plant;

  let half1AttackTeam: string | undefined;
  if (firstHalfPlant) {
    half1AttackTeam = teamIdOfPuuid(firstHalfPlant.player.puuid);
  } else if (secondHalfPlant) {
    const half2AttackTeam = teamIdOfPuuid(secondHalfPlant.player.puuid);
    half1AttackTeam = match.teams.find((t) => t.team_id !== half2AttackTeam)?.team_id;
  }

  for (const round of match.rounds) {
    if (round.id > HALF_2_LAST_ROUND) {
      result.overtime[1]++;
      if (round.winning_team === teamId) result.overtime[0]++;
      continue;
    }

    if (!half1AttackTeam) continue; // sem âncora nessa partida — não dá pra atribuir lado com segurança

    const attackTeamThisRound = round.id <= HALF_1_LAST_ROUND ? half1AttackTeam : match.teams.find((t) => t.team_id !== half1AttackTeam)?.team_id;
    const side: "attack" | "defense" = teamId === attackTeamThisRound ? "attack" : "defense";

    result[side][1]++;
    if (round.winning_team === teamId) result[side][0]++;
  }

  return result;
}

export async function buildSidesBreakdown(puuid: string, modoFilter?: "Competitive" | "Unrated"): Promise<SidesBreakdown> {
  const windowStart = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, match: { startedAt: { gte: windowStart }, ...(modoFilter ? { modo: modoFilter } : {}) } },
    include: { match: true },
  });

  let attackWins = 0,
    attackTotal = 0,
    defenseWins = 0,
    defenseTotal = 0,
    otWins = 0,
    otTotal = 0;

  for (const row of rows) {
    const match = row.match.rawJson as unknown as MatchV4Data;
    const sides = computeMatchSides(match, row.teamId);
    attackWins += sides.attack[0];
    attackTotal += sides.attack[1];
    defenseWins += sides.defense[0];
    defenseTotal += sides.defense[1];
    otWins += sides.overtime[0];
    otTotal += sides.overtime[1];
  }

  const pct = (wins: number, total: number) => (total > 0 ? Math.round((wins / total) * 100) : 0);

  return {
    attack: { winratePercent: pct(attackWins, attackTotal), wins: attackWins, total: attackTotal },
    defense: { winratePercent: pct(defenseWins, defenseTotal), wins: defenseWins, total: defenseTotal },
    overtime: { wins: otWins, total: otTotal },
  };
}
