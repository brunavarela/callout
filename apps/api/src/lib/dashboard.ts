import type { DashboardSummary, MatchV4Data } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr } from "./henrikdev.js";
import { getSyncProgress } from "./sync.js";

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

type Row = Awaited<ReturnType<typeof prisma.matchPlayer.findMany<{ include: { match: true } }>>>[number];

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

  const kpis: DashboardSummary["kpis"] = {
    kda: { value: round2(c.kda), delta: round2(c.kda - p.kda) },
    acs: { value: Math.round(c.acs), delta: Math.round(c.acs - p.acs) },
    adr: { value: Math.round(c.adr), delta: Math.round(c.adr - p.adr) },
    hsPercent: { value: round2(c.hsPercent), delta: round2(c.hsPercent - p.hsPercent) },
    winrate: {
      value: current.length > 0 ? Math.round((c.wins / current.length) * 100) : 0,
      wins: c.wins,
      losses: c.losses,
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
    .map(([map, s]) => ({ map, winratePercent: Math.round((s.wins / s.total) * 100) }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  // Cor real do agente depende do job de seed dos assets da valorant-api.com
  // (roadmap fase 3/5, ainda não construído) — cinza neutro até lá.
  const agentWinrates = [...byAgent.entries()]
    .map(([agent, s]) => ({ agent, winratePercent: Math.round((s.wins / s.total) * 100), color: "#9A9DA1" }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  const recentMatches = rows.slice(0, 7).map((r) => {
    const score = scoreFor(r.match.rawJson, r.teamId);
    return {
      id: r.match.id,
      result: (r.won ? "V" : "D") as "V" | "D",
      map: mapNameFrom(r.match.rawJson),
      agent: r.agentName,
      score: `${score.own}—${score.opponent}`,
      kda: `${r.kills}/${r.deaths}/${r.assists}`,
      playedAtLabel: formatPlayedAt(r.match.startedAt, now),
    };
  });

  const last14Results = rows
    .slice(0, 14)
    .reverse()
    .map((r) => (r.won ? "V" : "D")) as Array<"V" | "D">;

  let rank: DashboardSummary["rank"] = { current: "—", rr: 0, rrDelta7d: 0 };
  try {
    const mmr = await getMmr(region, puuid);
    rank = {
      current: mmr.current_data.currenttierpatched,
      rr: mmr.current_data.ranking_in_tier,
      // A HenrikDev só devolve o delta da última partida aqui, não um
      // acumulado de 7 dias de verdade — precisaria do endpoint -history
      // pra reconstruir isso direito. Deixado em 0 até implementarmos.
      rrDelta7d: 0,
    };
  } catch {
    // sem MMR disponível (conta nova, região errada, API fora) — mantém o placeholder
  }

  return {
    rank,
    last14Results,
    kpis,
    mapWinrates,
    agentWinrates,
    recentMatches,
    sync: getSyncProgress(userId),
  };
}
