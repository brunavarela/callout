import type { MatchCountFilter, MatchV4Data, RecentFormInsights, RrHistoryResponse, SidesBreakdown } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmrHistory } from "./henrikdev.js";
import { matchResult } from "./match-result.js";

type Row = Awaited<ReturnType<typeof prisma.matchPlayer.findMany<{ include: { match: true } }>>>[number];

function mapNameFrom(rawJson: unknown): string {
  return (rawJson as MatchV4Data).metadata.map.name;
}

// Mapa/agente "principal" das últimas N partidas = o mais jogado nesse
// recorte (não necessariamente o de maior winrate) — é sobre o que você tem
// jogado recentemente, não sobre onde você é melhor (isso já é o card de
// winrate por mapa/agente, calculado sobre outra janela).
function buildFormInsights(rows: Row[], maxAcsByMatchTeam: Map<string, number>): RecentFormInsights {
  if (rows.length === 0) {
    return { matchesAnalyzed: 0, topMap: null, topAgent: null, negativeKdaMatches: 0, mvpMatches: 0 };
  }

  const mapCounts = new Map<string, { total: number; wins: number }>();
  const agentCounts = new Map<string, { total: number; wins: number }>();
  let negativeKdaMatches = 0;
  let mvpMatches = 0;

  for (const r of rows) {
    const map = mapNameFrom(r.match.rawJson);
    const mEntry = mapCounts.get(map) ?? { total: 0, wins: 0 };
    mEntry.total++;
    if (r.won) mEntry.wins++;
    mapCounts.set(map, mEntry);

    const aEntry = agentCounts.get(r.agentName) ?? { total: 0, wins: 0 };
    aEntry.total++;
    if (r.won) aEntry.wins++;
    agentCounts.set(r.agentName, aEntry);

    if (r.kills + r.assists < r.deaths) negativeKdaMatches++;
    if (r.acs === maxAcsByMatchTeam.get(`${r.match.id}:${r.teamId}`)) mvpMatches++;
  }

  const mostPlayed = (counts: Map<string, { total: number; wins: number }>) => {
    let best: [string, { total: number; wins: number }] | null = null;
    for (const entry of counts) {
      if (!best || entry[1].total > best[1].total) best = entry;
    }
    return best;
  };

  const topMap = mostPlayed(mapCounts);
  const topAgent = mostPlayed(agentCounts);

  return {
    matchesAnalyzed: rows.length,
    topMap: topMap ? { map: topMap[0], total: topMap[1].total, wins: topMap[1].wins } : null,
    topAgent: topAgent ? { agent: topAgent[0], total: topAgent[1].total, wins: topAgent[1].wins } : null,
    negativeKdaMatches,
    mvpMatches,
  };
}

// RR e os 4 tópicos de análise vivem no mesmo card na tela e usam a mesma
// janela de partidas (7/20) — saem numa fetch só. Partidas sem entrada
// correspondente na mmr-history (deathmatch, unrated etc. não geram RR)
// ficam de fora só dos pontos do gráfico, não da análise (que conta a
// partida de qualquer forma).
export async function buildRrAndInsights(
  affinity: string,
  puuid: string,
  matchCount: MatchCountFilter,
  modoFilter?: "Competitive" | "Unrated",
  mapIdFilter?: string,
): Promise<RrHistoryResponse> {
  const matchWhere = { ...(modoFilter ? { modo: modoFilter } : {}), ...(mapIdFilter ? { mapId: mapIdFilter } : {}) };
  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, ...(Object.keys(matchWhere).length > 0 ? { match: matchWhere } : {}) },
    include: { match: true },
    orderBy: { match: { startedAt: "desc" } },
    take: matchCount,
  });

  // MVP = maior ACS do seu próprio time na partida (não dos 10 jogadores —
  // isso deixaria de fora quem foi o melhor do time mas perdeu de alguém do
  // time adversário). Precisa de todo mundo dessas partidas, não só das
  // linhas do próprio usuário.
  const maxAcsByMatchTeam = new Map<string, number>();
  const [history, allPlayers] = await Promise.all([
    getMmrHistory(affinity, puuid),
    rows.length > 0
      ? prisma.matchPlayer.findMany({ where: { matchId: { in: rows.map((r) => r.match.id) } }, select: { matchId: true, teamId: true, acs: true } })
      : Promise.resolve([]),
  ]);
  for (const p of allPlayers) {
    const key = `${p.matchId}:${p.teamId}`;
    const current = maxAcsByMatchTeam.get(key) ?? -Infinity;
    if (p.acs > current) maxAcsByMatchTeam.set(key, p.acs);
  }

  const rrByMatch = new Map(history.map((h) => [h.match_id, h.last_change]));

  const points = rows
    .filter((r) => rrByMatch.has(r.match.id))
    .reverse() // volta pra ordem cronológica (mais antiga primeiro) pro gráfico
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

  return { points, formInsights: buildFormInsights(rows, maxAcsByMatchTeam) };
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

export async function buildSidesBreakdown(puuid: string, modoFilter?: "Competitive" | "Unrated", mapIdFilter?: string): Promise<SidesBreakdown> {
  const windowStart = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.matchPlayer.findMany({
    where: {
      puuid,
      match: { startedAt: { gte: windowStart }, ...(modoFilter ? { modo: modoFilter } : {}), ...(mapIdFilter ? { mapId: mapIdFilter } : {}) },
    },
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
