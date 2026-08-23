import type { DashboardSummary, MatchV4Data } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr, getMmrHistory } from "./henrikdev.js";
import { getSyncProgress } from "./sync.js";
import { loadAgentColorsByName } from "./assets.js";
import { matchResult } from "./match-result.js";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatPlayedAt(date: Date, now: Date): string {
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return `hoje ${time}`;
  if (diffDays === 1) return `ontem ${time}`;
  if (diffDays < 7) return `${WEEKDAY_LABELS[date.getDay()]} ${time}`;
  return date.toLocaleDateString("pt-BR");
}

function mapNameFrom(rawJson: unknown): string {
  return (rawJson as MatchV4Data).metadata.map.name;
}

function scoreFor(rawJson: unknown, teamId: string): { own: number; opponent: number } {
  const match = rawJson as MatchV4Data;
  const own = match.teams.find((t) => t.team_id === teamId);
  const opponent = match.teams.find((t) => t.team_id !== teamId);
  return { own: own?.rounds.won ?? 0, opponent: opponent?.rounds.won ?? 0 };
}

// Ace: 5 kills do jogador no mesmo round. Só existe no raw_json (feed de
// kills), não é uma coluna persistida.
function hasAce(rawJson: unknown, puuid: string): boolean {
  const match = rawJson as MatchV4Data;
  const killsByRound = new Map<number, number>();
  for (const kill of match.kills) {
    if (kill.killer.puuid !== puuid) continue;
    killsByRound.set(kill.round, (killsByRound.get(kill.round) ?? 0) + 1);
  }
  return [...killsByRound.values()].some((count) => count >= 5);
}

type Row = Awaited<ReturnType<typeof prisma.matchPlayer.findMany<{ include: { match: true } }>>>[number];

const FORM_INSIGHTS_WINDOW = 20;

// Mapa/agente "principal" das últimas N partidas = o mais jogado nesse
// recorte (não necessariamente o de maior winrate) — é sobre o que você tem
// jogado recentemente, não sobre onde você é melhor (isso já é o card de
// winrate por mapa/agente, calculado sobre outra janela).
function buildFormInsights(allRows: Row[], maxAcsByMatch: Map<string, number>): DashboardSummary["formInsights"] {
  const sample = allRows.slice(0, FORM_INSIGHTS_WINDOW);
  if (sample.length === 0) {
    return { matchesAnalyzed: 0, topMap: null, topAgent: null, negativeKdaMatches: 0, mvpMatches: 0 };
  }

  const mapCounts = new Map<string, { total: number; wins: number }>();
  const agentCounts = new Map<string, { total: number; wins: number }>();
  let negativeKdaMatches = 0;
  let mvpMatches = 0;

  for (const r of sample) {
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
    if (r.acs === maxAcsByMatch.get(r.match.id)) mvpMatches++;
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
    matchesAnalyzed: sample.length,
    topMap: topMap ? { map: topMap[0], total: topMap[1].total, wins: topMap[1].wins } : null,
    topAgent: topAgent ? { agent: topAgent[0], total: topAgent[1].total, wins: topAgent[1].wins } : null,
    negativeKdaMatches,
    mvpMatches,
  };
}

function aggregate(list: Row[]) {
  if (list.length === 0) return { kda: 0, acs: 0, adr: 0, hsPercent: 0, wins: 0, losses: 0 };
  const kills = list.reduce((s, r) => s + r.kills, 0);
  const deaths = list.reduce((s, r) => s + r.deaths, 0);
  const assists = list.reduce((s, r) => s + r.assists, 0);
  const acsSum = list.reduce((s, r) => s + r.acs, 0);
  const dmg = list.reduce((s, r) => s + r.damageDealt, 0);
  const rounds = list.reduce((s, r) => s + r.roundsPlayed, 0);
  const shotsHs = list.reduce((s, r) => s + r.headshots, 0);
  const shotsTotal = list.reduce((s, r) => s + r.headshots + r.bodyshots + r.legshots, 0);
  const wins = list.filter((r) => r.won).length;
  return {
    kda: deaths > 0 ? (kills + assists) / deaths : kills + assists,
    acs: acsSum / list.length,
    adr: rounds > 0 ? dmg / rounds : 0,
    hsPercent: shotsTotal > 0 ? (shotsHs / shotsTotal) * 100 : 0,
    wins,
    losses: list.length - wins,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Sparkline de cada KPI: valor por partida, das últimas N, mais antiga
// primeiro (a lista de entrada já vem ordenada mais recente primeiro).
function perMatchSpark(list: Row[], selector: (r: Row) => number, count = 10): number[] {
  return list
    .slice(0, count)
    .reverse()
    .map(selector);
}

export async function buildDashboardSummary(userId: string, puuid: string, region: string): Promise<DashboardSummary> {
  const rows = await prisma.matchPlayer.findMany({
    where: { puuid },
    include: { match: true },
    orderBy: { match: { startedAt: "desc" } },
  });

  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 86_400_000);
  const prevWindowStart = new Date(now.getTime() - 60 * 86_400_000);

  const current = rows.filter((r) => r.match.startedAt >= windowStart);
  const previous = rows.filter((r) => r.match.startedAt >= prevWindowStart && r.match.startedAt < windowStart);

  const c = aggregate(current);
  const p = aggregate(previous);
  // Sem partida nenhuma nos 30-60 dias anteriores não dá pra comparar com
  // nada — `delta = atual - 0` pareceria uma comparação real quando não é
  // (a regra que o redesign do dashboard veio corrigir: nunca comparar com
  // zero). Nesse caso o delta fica 0 mesmo.
  const hasPrevious = previous.length > 0;
  const d = (curr: number, prev: number, round: (n: number) => number) => (hasPrevious ? round(curr - prev) : 0);

  const kpis: DashboardSummary["kpis"] = {
    kda: {
      value: round2(c.kda),
      delta: d(c.kda, p.kda, round2),
      spark: perMatchSpark(current, (r) => (r.deaths > 0 ? (r.kills + r.assists) / r.deaths : r.kills + r.assists)),
    },
    acs: { value: Math.round(c.acs), delta: d(c.acs, p.acs, Math.round), spark: perMatchSpark(current, (r) => r.acs) },
    adr: {
      value: Math.round(c.adr),
      delta: d(c.adr, p.adr, Math.round),
      spark: perMatchSpark(current, (r) => (r.roundsPlayed > 0 ? r.damageDealt / r.roundsPlayed : 0)),
    },
    hsPercent: {
      value: round2(c.hsPercent),
      delta: d(c.hsPercent, p.hsPercent, round2),
      spark: perMatchSpark(current, (r) => {
        const total = r.headshots + r.bodyshots + r.legshots;
        return total > 0 ? (r.headshots / total) * 100 : 0;
      }),
    },
    winrate: {
      value: current.length > 0 ? Math.round((c.wins / current.length) * 100) : 0,
      wins: c.wins,
      losses: c.losses,
      delta:
        current.length > 0 && hasPrevious
          ? Math.round((c.wins / current.length) * 100 - (p.wins / previous.length) * 100)
          : 0,
      spark: perMatchSpark(current, (r) => (r.won ? 100 : 0)),
    },
  };

  const byMap = new Map<string, { wins: number; total: number }>();
  const byAgent = new Map<string, { wins: number; total: number }>();
  for (const r of current) {
    const map = mapNameFrom(r.match.rawJson);
    const mEntry = byMap.get(map) ?? { wins: 0, total: 0 };
    mEntry.total++;
    if (r.won) mEntry.wins++;
    byMap.set(map, mEntry);

    const aEntry = byAgent.get(r.agentName) ?? { wins: 0, total: 0 };
    aEntry.total++;
    if (r.won) aEntry.wins++;
    byAgent.set(r.agentName, aEntry);
  }

  const mapWinrates = [...byMap.entries()]
    .map(([map, s]) => ({ map, winratePercent: Math.round((s.wins / s.total) * 100), wins: s.wins, total: s.total }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  const agentColors = await loadAgentColorsByName();
  const agentWinrates = [...byAgent.entries()]
    .map(([agent, s]) => ({
      agent,
      winratePercent: Math.round((s.wins / s.total) * 100),
      color: agentColors.get(agent) ?? "#9A9DA1",
      wins: s.wins,
      total: s.total,
    }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  // getMmr (rank atual) e getMmrHistory (RR por partida) são endpoints
  // independentes da HenrikDev — um falhar não pode derrubar o outro. Antes
  // o histórico só era buscado dentro do try do getMmr, então uma conta sem
  // rank exposto (região errada, MMR oculto) também ficava sem RR por
  // partida na tabela, mesmo quando o histórico funcionava sozinho.
  let rank: DashboardSummary["rank"] = { current: "—", rr: 0, rrDelta7d: 0 };
  let rrByMatch = new Map<string, number>();
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const history = await getMmrHistory(region, puuid);
    rrByMatch = new Map(history.map((h) => [h.match_id, h.last_change]));
    rank.rrDelta7d = history.filter((h) => new Date(h.date) >= sevenDaysAgo).reduce((sum, h) => sum + h.last_change, 0);
  } catch {
    // sem histórico — mantém 0 e rrByMatch vazio (recentMatches.rr vira null)
  }
  try {
    const mmr = await getMmr(region, puuid);
    rank.current = mmr.current_data.currenttierpatched;
    rank.rr = mmr.current_data.ranking_in_tier;
  } catch {
    // sem MMR disponível (conta nova, região errada, API fora) — mantém o placeholder
  }

  const last14Results = rows
    .slice(0, 14)
    .reverse()
    .map((r) => matchResult(r.won, rrByMatch.get(r.match.id)));

  const recentRows = rows.slice(0, 7);
  const analysisRows = rows.slice(0, FORM_INSIGHTS_WINDOW);
  // MVP = maior ACS da partida entre os 10 jogadores. `rows` só traz as
  // linhas do próprio usuário (filtro `where: { puuid }`), então precisa de
  // uma query separada pegando todo mundo dessas partidas pra comparar.
  // Calculado sobre a janela de 20 (analysisRows) já cobre as 7 mais
  // recentes usadas em recentMatches, que é subconjunto dela.
  const maxAcsByMatch = new Map<string, number>();
  if (analysisRows.length > 0) {
    const allPlayers = await prisma.matchPlayer.findMany({
      where: { matchId: { in: analysisRows.map((r) => r.match.id) } },
      select: { matchId: true, acs: true },
    });
    for (const p of allPlayers) {
      const current = maxAcsByMatch.get(p.matchId) ?? -Infinity;
      if (p.acs > current) maxAcsByMatch.set(p.matchId, p.acs);
    }
  }

  const recentMatches = recentRows.map((r) => {
    const score = scoreFor(r.match.rawJson, r.teamId);
    const shotsTotal = r.headshots + r.bodyshots + r.legshots;
    return {
      id: r.match.id,
      result: matchResult(r.won, rrByMatch.get(r.match.id)),
      map: mapNameFrom(r.match.rawJson),
      agent: r.agentName,
      score: `${score.own}—${score.opponent}`,
      kda: `${r.kills}/${r.deaths}/${r.assists}`,
      hsPercent: shotsTotal > 0 ? Math.round((r.headshots / shotsTotal) * 100) : 0,
      mvp: r.acs === maxAcsByMatch.get(r.match.id),
      ace: hasAce(r.match.rawJson, r.puuid),
      rr: rrByMatch.get(r.match.id) ?? null,
      playedAtLabel: formatPlayedAt(r.match.startedAt, now),
    };
  });

  return {
    rank,
    last14Results,
    kpis,
    hasComparison: hasPrevious,
    mapWinrates,
    agentWinrates,
    recentMatches,
    formInsights: buildFormInsights(rows, maxAcsByMatch),
    sync: getSyncProgress(userId),
  };
}
