import type { AccuracyBreakdown, MapWinrate, RoleStat, SeasonOverview, TopAgentStat, WeaponStat } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr } from "./henrikdev.js";
import { getCurrentSeasonId } from "./dashboard.js";
import { loadAgentColorsByName } from "./assets.js";
import { countsTowardStats } from "./match-result.js";

// Mesmo padrão inglês->português usado pro resto do texto do app.
// AgentAsset.funcao vem do `role.displayName` da valorant-api.com (ver
// seedAgents em assets.ts), sempre em inglês.
const ROLE_LABELS: Record<string, string> = {
  Duelist: "Duelista",
  Initiator: "Iniciador",
  Controller: "Controlador",
  Sentinel: "Sentinela",
};

const rowArgs = {
  select: {
    matchId: true,
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
    accountLevel: true,
    weaponKills: true,
    multiKills: true,
    firstBloods: true,
    match: { select: { modo: true, mapId: true, durationMs: true, startedAt: true, map: { select: { nome: true } } } },
  },
} satisfies Parameters<typeof prisma.matchPlayer.findMany>[0];

type Row = Awaited<ReturnType<typeof prisma.matchPlayer.findMany<typeof rowArgs>>>[number];

// Nota própria do callout (0-100) — não é o "Tracker Score" de outra
// plataforma (algoritmo deles, não documentado, não é dado bruto). Combina
// métricas que a gente já mostra, com peso e faixa de referência
// documentados aqui — winrate pesa mais (é o resultado que importa),
// K/D/ACS/DDΔ normalizados contra uma faixa "boa" de referência (não um
// máximo teórico, pra não achatar todo mundo perto de 0).
function calcularIndiceCallout(winratePercent: number, kda: number, acs: number, ddPerRound: number): number {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const kdaScore = clamp01(kda / 1.5) * 100;
  const acsScore = clamp01(acs / 280) * 100;
  const ddScore = clamp01((ddPerRound + 20) / 40) * 100;
  const value = winratePercent * 0.35 + kdaScore * 0.25 + acsScore * 0.25 + ddScore * 0.15;
  return Math.round(value);
}

export async function buildSeasonOverview(puuid: string, region: string): Promise<SeasonOverview | null> {
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) return null;

  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, match: { seasonId } },
    orderBy: { match: { startedAt: "desc" } },
    ...rowArgs,
  });

  const statRows = rows.filter((r) => countsTowardStats(r.match.modo));
  if (statRows.length === 0) {
    const seasonMatch = await prisma.match.findFirst({ where: { seasonId }, select: { seasonShort: true } });
    return {
      seasonShort: seasonMatch?.seasonShort ?? null,
      accountLevel: rows[0]?.accountLevel ?? null,
      peakRank: null,
      playtimeMs: 0,
      matchesCount: 0,
      wins: 0,
      losses: 0,
      winratePercent: 0,
      kda: 0,
      acs: 0,
      adr: 0,
      hsPercent: 0,
      ddPerRound: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      firstBloods: 0,
      aces: 0,
      calloutIndex: { value: 0 },
      topAgents: [],
      topMaps: [],
      roles: [],
      accuracy: { headPercent: 0, bodyPercent: 0, legPercent: 0, headHits: 0, bodyHits: 0, legHits: 0 },
      topWeapons: [],
    };
  }

  const kills = statRows.reduce((s, r) => s + r.kills, 0);
  const deaths = statRows.reduce((s, r) => s + r.deaths, 0);
  const assists = statRows.reduce((s, r) => s + r.assists, 0);
  const acsSum = statRows.reduce((s, r) => s + r.acs, 0);
  const dmg = statRows.reduce((s, r) => s + r.damageDealt, 0);
  const rounds = statRows.reduce((s, r) => s + r.roundsPlayed, 0);
  const headshots = statRows.reduce((s, r) => s + r.headshots, 0);
  const bodyshots = statRows.reduce((s, r) => s + r.bodyshots, 0);
  const legshots = statRows.reduce((s, r) => s + r.legshots, 0);
  const shotsTotal = headshots + bodyshots + legshots;
  const wins = statRows.filter((r) => r.won).length;
  const losses = statRows.length - wins;
  const kda = deaths > 0 ? round2((kills + assists) / deaths) : kills + assists;
  const acs = Math.round(acsSum / statRows.length);
  const adr = rounds > 0 ? Math.round(dmg / rounds) : 0;
  const hsPercent = shotsTotal > 0 ? round1((headshots / shotsTotal) * 100) : 0;
  const winratePercent = Math.round((wins / statRows.length) * 100);

  const playtimeMs = statRows.reduce((s, r) => s + r.match.durationMs, 0);
  const matchesCount = statRows.length;

  // DDΔ/round: seu ADR na partida menos a média de ADR dos outros 9
  // jogadores da mesma partida — quanto de dano a mais (ou a menos) você
  // fez por round comparado ao resto da lobby. Só colunas escalares já
  // salvas (damageDealt/roundsPlayed de todo mundo), sem tocar rawJson.
  const matchIds = statRows.map((r) => r.matchId);
  const allPlayers =
    matchIds.length > 0
      ? await prisma.matchPlayer.findMany({
          where: { matchId: { in: matchIds } },
          select: { matchId: true, puuid: true, damageDealt: true, roundsPlayed: true },
        })
      : [];
  const othersByMatch = new Map<string, { dmg: number; rounds: number; count: number }>();
  for (const p of allPlayers) {
    if (p.puuid === puuid) continue;
    const entry = othersByMatch.get(p.matchId) ?? { dmg: 0, rounds: 0, count: 0 };
    entry.dmg += p.damageDealt;
    entry.rounds += p.roundsPlayed;
    entry.count++;
    othersByMatch.set(p.matchId, entry);
  }
  const perMatchDelta = statRows.map((r) => {
    const selfAdr = r.roundsPlayed > 0 ? r.damageDealt / r.roundsPlayed : 0;
    const others = othersByMatch.get(r.matchId);
    const othersAdr = others && others.rounds > 0 ? others.dmg / others.rounds : selfAdr;
    return selfAdr - othersAdr;
  });
  const ddPerRound = perMatchDelta.length > 0 ? round1(perMatchDelta.reduce((s, d) => s + d, 0) / perMatchDelta.length) : 0;

  // Top Agents
  const byAgent = new Map<
    string,
    { matches: number; wins: number; kills: number; deaths: number; assists: number; dmg: number; rounds: number; acsSum: number; maps: Map<string, { wins: number; total: number }> }
  >();
  for (const r of statRows) {
    const entry = byAgent.get(r.agentName) ?? { matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0, dmg: 0, rounds: 0, acsSum: 0, maps: new Map() };
    entry.matches++;
    if (r.won) entry.wins++;
    entry.kills += r.kills;
    entry.deaths += r.deaths;
    entry.assists += r.assists;
    entry.dmg += r.damageDealt;
    entry.rounds += r.roundsPlayed;
    entry.acsSum += r.acs;
    const mapName = r.match.map?.nome ?? "—";
    const mapEntry = entry.maps.get(mapName) ?? { wins: 0, total: 0 };
    mapEntry.total++;
    if (r.won) mapEntry.wins++;
    entry.maps.set(mapName, mapEntry);
    byAgent.set(r.agentName, entry);
  }
  const agentColors = await loadAgentColorsByName();
  const topAgents: TopAgentStat[] = [...byAgent.entries()]
    .map(([agent, s]) => {
      // Só conta "melhor mapa" com pelo menos 2 partidas desse agente nesse
      // mapa — 100% de winrate numa partida só não significa nada.
      let bestMap: TopAgentStat["bestMap"] = null;
      for (const [map, m] of s.maps) {
        if (m.total < 2) continue;
        const wr = Math.round((m.wins / m.total) * 100);
        if (!bestMap || wr > bestMap.winratePercent) bestMap = { map, winratePercent: wr };
      }
      return {
        agent,
        color: agentColors.get(agent) ?? "#9A9DA1",
        matches: s.matches,
        winratePercent: Math.round((s.wins / s.matches) * 100),
        kda: s.deaths > 0 ? round2((s.kills + s.assists) / s.deaths) : s.kills + s.assists,
        adr: s.rounds > 0 ? Math.round(s.dmg / s.rounds) : 0,
        acs: Math.round(s.acsSum / s.matches),
        bestMap,
      };
    })
    .sort((a, b) => b.matches - a.matches);

  // Top Maps — direto do MapAsset já associado ao Match (sem rawJson).
  const byMap = new Map<string, { wins: number; total: number; mapId: string | null }>();
  for (const r of statRows) {
    const mapName = r.match.map?.nome ?? "—";
    const entry = byMap.get(mapName) ?? { wins: 0, total: 0, mapId: r.match.mapId };
    entry.total++;
    if (r.won) entry.wins++;
    byMap.set(mapName, entry);
  }
  const topMaps: MapWinrate[] = [...byMap.entries()]
    .map(([map, s]) => ({ map, mapId: s.mapId, winratePercent: Math.round((s.wins / s.total) * 100), wins: s.wins, total: s.total }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  // Roles — agentName -> AgentAsset.funcao (em inglês) -> label pt-BR.
  const agentAssets = await prisma.agentAsset.findMany({ select: { nome: true, funcao: true } });
  const roleByAgent = new Map(agentAssets.map((a) => [a.nome, a.funcao]));
  const byRole = new Map<string, { matches: number; wins: number; kills: number; deaths: number; assists: number }>();
  for (const r of statRows) {
    const rawRole = roleByAgent.get(r.agentName);
    if (!rawRole) continue;
    const role = ROLE_LABELS[rawRole] ?? rawRole;
    const entry = byRole.get(role) ?? { matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    entry.matches++;
    if (r.won) entry.wins++;
    entry.kills += r.kills;
    entry.deaths += r.deaths;
    entry.assists += r.assists;
    byRole.set(role, entry);
  }
  const roles: RoleStat[] = [...byRole.entries()]
    .map(([role, s]) => ({
      role,
      matches: s.matches,
      winratePercent: Math.round((s.wins / s.matches) * 100),
      kda: s.deaths > 0 ? round2((s.kills + s.assists) / s.deaths) : s.kills + s.assists,
      wins: s.wins,
      losses: s.matches - s.wins,
    }))
    .sort((a, b) => b.matches - a.matches);

  const accuracy: AccuracyBreakdown = {
    headPercent: shotsTotal > 0 ? round1((headshots / shotsTotal) * 100) : 0,
    bodyPercent: shotsTotal > 0 ? round1((bodyshots / shotsTotal) * 100) : 0,
    legPercent: shotsTotal > 0 ? round1((legshots / shotsTotal) * 100) : 0,
    headHits: headshots,
    bodyHits: bodyshots,
    legHits: legshots,
  };

  // Top Weapons — lê a coluna weaponKills já agregada na sincronização
  // (ver sync.ts/matchReplay.ts), não relê rawJson aqui.
  const weaponTotals = new Map<string, number>();
  for (const r of statRows) {
    const wk = (r.weaponKills as Record<string, number> | null) ?? {};
    for (const [weapon, count] of Object.entries(wk)) {
      weaponTotals.set(weapon, (weaponTotals.get(weapon) ?? 0) + count);
    }
  }
  const topWeapons: WeaponStat[] = [...weaponTotals.entries()]
    .map(([weapon, weaponKillsCount]) => ({
      weapon,
      kills: weaponKillsCount,
      // Não dá pra saber a precisão exata por arma (a HenrikDev não liga
      // dano a arma por tiro) — usamos a precisão geral do jogador no ato
      // como aproximação pra cada arma, deixado claro no front.
      headPercent: accuracy.headPercent,
      bodyPercent: accuracy.bodyPercent,
      legPercent: accuracy.legPercent,
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  const firstBloods = statRows.reduce((s, r) => s + (r.firstBloods ?? 0), 0);
  const aces = statRows.reduce((s, r) => s + ((r.multiKills as Record<string, number> | null)?.["5"] ?? 0), 0);

  let peakRank: SeasonOverview["peakRank"] = null;
  try {
    const mmr = await getMmr(region, puuid);
    if (mmr.highest_rank) {
      peakRank = { tierLabel: mmr.highest_rank.patched_tier, seasonShort: mmr.highest_rank.season };
    }
  } catch {
    // sem MMR disponível — mantém null
  }

  const seasonMatch = await prisma.match.findFirst({ where: { seasonId }, select: { seasonShort: true } });

  return {
    seasonShort: seasonMatch?.seasonShort ?? null,
    accountLevel: rows[0]?.accountLevel ?? null,
    peakRank,
    playtimeMs,
    matchesCount,
    wins,
    losses,
    winratePercent,
    kda,
    acs,
    adr,
    hsPercent,
    ddPerRound,
    kills,
    deaths,
    assists,
    firstBloods,
    aces,
    calloutIndex: { value: calcularIndiceCallout(winratePercent, kda, acs, ddPerRound) },
    topAgents,
    topMaps,
    roles,
    accuracy,
    topWeapons,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
