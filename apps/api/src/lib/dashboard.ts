import type { DashboardSummary, MatchV4Data } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr, getMmrHistory } from "./henrikdev.js";
import { getSyncProgress } from "./sync.js";
import { loadAgentColorsByName } from "./assets.js";
import { matchResult, countsTowardStats } from "./match-result.js";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function formatPlayedAt(date: Date, now: Date): string {
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return `hoje ${time}`;
  if (diffDays === 1) return `ontem ${time}`;
  if (diffDays < 7) return `${WEEKDAY_LABELS[date.getDay()]} ${time}`;
  return date.toLocaleDateString("pt-BR");
}

export function mapNameFrom(rawJson: unknown): string {
  return (rawJson as MatchV4Data).metadata.map.name;
}

export function scoreFor(rawJson: unknown, teamId: string): { own: number; opponent: number } {
  const match = rawJson as MatchV4Data;
  const own = match.teams.find((t) => t.team_id === teamId);
  const opponent = match.teams.find((t) => t.team_id !== teamId);
  return { own: own?.rounds.won ?? 0, opponent: opponent?.rounds.won ?? 0 };
}

// Ace: 5 kills do jogador no mesmo round. Só existe no raw_json (feed de
// kills), não é uma coluna persistida.
export function hasAce(rawJson: unknown, puuid: string): boolean {
  const match = rawJson as MatchV4Data;
  const killsByRound = new Map<number, number>();
  for (const kill of match.kills) {
    if (kill.killer.puuid !== puuid) continue;
    killsByRound.set(kill.round, (killsByRound.get(kill.round) ?? 0) + 1);
  }
  return [...killsByRound.values()].some((count) => count >= 5);
}

const dashboardRowArgs = {
  select: {
    puuid: true,
    teamId: true,
    won: true,
    agentName: true,
    roundsPlayed: true,
    acs: true,
    kills: true,
    deaths: true,
    assists: true,
    headshots: true,
    bodyshots: true,
    legshots: true,
    damageDealt: true,
    match: { select: { id: true, modo: true, mapId: true, startedAt: true } },
  },
} satisfies Parameters<typeof prisma.matchPlayer.findMany>[0];

type Row = Awaited<ReturnType<typeof prisma.matchPlayer.findMany<typeof dashboardRowArgs>>>[number];

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

export async function buildDashboardSummary(
  userId: string,
  puuid: string,
  region: string,
  modoFilter?: "Competitive" | "Unrated",
  mapIdFilter?: string,
): Promise<DashboardSummary> {
  // Busca só filtrada por modo — de propósito não filtra por mapa aqui.
  // `mapWinrates` (mais abaixo) precisa do conjunto completo de mapas mesmo
  // com um mapa selecionado no filtro (é o card que mostra o panorama de
  // todos os mapas, não muda com o filtro); tudo o mais que usa `rows`
  // aplica o filtro de mapa em cima desse resultado, sem bater no banco de
  // novo.
  //
  // Sem `include: { match: true }` — traria o rawJson de CADA partida do
  // histórico inteiro do jogador (~400KB em média) só pra ler campos como
  // `won`/`acs` que já estão em matchPlayer. Com histórico longo (comum em
  // Valorant) isso é o mesmo padrão que estourou a memória em produção nas
  // queries de time (ver 408cf5d). Busca só os campos escalares aqui; o
  // rawJson é buscado depois, uma vez, só para as partidas que realmente
  // precisam dele (mapNameFrom/scoreFor/hasAce).
  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, ...(modoFilter ? { match: { modo: modoFilter } } : {}) },
    orderBy: { match: { startedAt: "desc" } },
    ...dashboardRowArgs,
  });
  const filteredRows = mapIdFilter ? rows.filter((r) => r.match.mapId === mapIdFilter) : rows;
  const recentRows = filteredRows.slice(0, 7);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 86_400_000);
  const prevWindowStart = new Date(now.getTime() - 60 * 86_400_000);

  // Só Competitivo/Sem classificação/Premier entram nas médias/KPIs (ver
  // countsTowardStats) — continuam aparecendo em recentMatches/
  // last14Results (que usam `filteredRows`, não `statRows`), só não contam
  // pra nenhum número agregado.
  const statRows = rows.filter((r) => countsTowardStats(r.match.modo));
  const mapStatRows = mapIdFilter ? statRows.filter((r) => r.match.mapId === mapIdFilter) : statRows;
  const current = mapStatRows.filter((r) => r.match.startedAt >= windowStart);
  const previous = mapStatRows.filter((r) => r.match.startedAt >= prevWindowStart && r.match.startedAt < windowStart);
  // Sem o filtro de mapa em cima — só pro card "em quais mapas você ganha".
  const allMapsCurrent = statRows.filter((r) => r.match.startedAt >= windowStart);

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

  // rawJson só é buscado aqui, uma vez, e só para as partidas que realmente
  // precisam dele: as dos últimos 30 dias que contam pra stats (mapWinrates)
  // e as últimas 7 exibidas em recentMatches — não o histórico inteiro (ver
  // comentário na query de `rows` acima).
  const rawJsonMatchIds = new Set([...allMapsCurrent.map((r) => r.match.id), ...recentRows.map((r) => r.match.id)]);
  const rawJsonByMatchId =
    rawJsonMatchIds.size > 0
      ? new Map(
          (
            await prisma.match.findMany({ where: { id: { in: [...rawJsonMatchIds] } }, select: { id: true, rawJson: true } })
          ).map((m) => [m.id, m.rawJson]),
        )
      : new Map<string, unknown>();

  const byMap = new Map<string, { wins: number; total: number; mapId: string | null }>();
  for (const r of allMapsCurrent) {
    const map = mapNameFrom(rawJsonByMatchId.get(r.match.id));
    const mEntry = byMap.get(map) ?? { wins: 0, total: 0, mapId: null };
    mEntry.total++;
    if (r.won) mEntry.wins++;
    mEntry.mapId ??= r.match.mapId;
    byMap.set(map, mEntry);
  }

  const mapWinrates = [...byMap.entries()]
    .map(([map, s]) => ({ map, mapId: s.mapId, winratePercent: Math.round((s.wins / s.total) * 100), wins: s.wins, total: s.total }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  const byAgent = new Map<string, { wins: number; total: number }>();
  for (const r of current) {
    const aEntry = byAgent.get(r.agentName) ?? { wins: 0, total: 0 };
    aEntry.total++;
    if (r.won) aEntry.wins++;
    byAgent.set(r.agentName, aEntry);
  }

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
  let rank: DashboardSummary["rank"] = { current: "—", rr: 0, rrDelta7d: 0, iconUrl: null };
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
    rank.iconUrl = mmr.current_data.images.small;
  } catch {
    // sem MMR disponível (conta nova, região errada, API fora) — mantém o placeholder
  }

  const last14Results = filteredRows
    .slice(0, 14)
    .reverse()
    .map((r) => matchResult(r.won, rrByMatch.get(r.match.id)));

  // MVP = maior ACS do seu próprio time na partida (não dos 10 jogadores —
  // isso deixaria de fora quem foi o melhor do time mas perdeu de alguém do
  // time adversário). `rows`/`filteredRows` só trazem as linhas do próprio
  // usuário (filtro `where: { puuid }`), então precisa de uma query separada
  // pegando todo mundo dessas partidas pra comparar.
  const maxAcsByMatchTeam = new Map<string, number>();
  if (recentRows.length > 0) {
    const allPlayers = await prisma.matchPlayer.findMany({
      where: { matchId: { in: recentRows.map((r) => r.match.id) } },
      select: { matchId: true, teamId: true, acs: true },
    });
    for (const p of allPlayers) {
      const key = `${p.matchId}:${p.teamId}`;
      const current = maxAcsByMatchTeam.get(key) ?? -Infinity;
      if (p.acs > current) maxAcsByMatchTeam.set(key, p.acs);
    }
  }

  const recentMatches = recentRows.map((r) => {
    const rawJson = rawJsonByMatchId.get(r.match.id);
    const score = scoreFor(rawJson, r.teamId);
    const shotsTotal = r.headshots + r.bodyshots + r.legshots;
    return {
      id: r.match.id,
      result: matchResult(r.won, rrByMatch.get(r.match.id)),
      map: mapNameFrom(rawJson),
      agent: r.agentName,
      score: `${score.own}—${score.opponent}`,
      kda: `${r.kills}/${r.deaths}/${r.assists}`,
      hsPercent: shotsTotal > 0 ? Math.round((r.headshots / shotsTotal) * 100) : 0,
      mvp: r.acs === maxAcsByMatchTeam.get(`${r.match.id}:${r.teamId}`),
      ace: hasAce(rawJson, r.puuid),
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
    sync: getSyncProgress(userId),
  };
}
