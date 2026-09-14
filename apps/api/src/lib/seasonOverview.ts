import type { AccuracyBreakdown, MapWinrate, MatchBadge, RoleStat, SeasonMatchesPage, SeasonMatchSummary, SeasonOption, SeasonOverview, SidesBreakdown, TopAgentStat, WeaponStat } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr, getMmrHistory } from "./henrikdev.js";
import { getCurrentSeasonId } from "./dashboard.js";
import { mapNameFrom, scoreFor, formatPlayedAt } from "./dashboard.js";
import { matchResult, countsTowardStats } from "./match-result.js";
import { loadAgentColorsByName } from "./assets.js";

// Teto de partidas (de qualquer modo) lidas por ato — mesmo valor e mesmo
// motivo de MAX_EQUIPE_MATCHES/MAX_SIDES_MATCHES: sem isso, um ato muito
// ativo (spam de Deathmatch etc.) buscaria a temporada inteira de uma vez.
// Aqui o risco de memória é bem menor que nos outros dois (essa query não
// toca rawJson, só colunas escalares/JSON pequenas já agregadas na sync),
// mas o teto entra do mesmo jeito por consistência e porque `allPlayers`
// (pro DDΔ/round) escala 10x esse número.
const MAX_SEASON_MATCHES = 150;

// Rotação competitiva ativa nesse ato — a Riot muda esse pool
// periodicamente, sem relação fixa com o calendário de atos, e não existe
// API (nem da Riot nem da valorant-api.com) que devolva "quais mapas estão
// na rotação agora". Confirmado manualmente com a Bruna em 11/09/2026 —
// precisa atualizar essa lista na mão sempre que o pool mudar de novo.
// Sem isso, o card de Mapa só mostraria os mapas que a pessoa já jogou,
// escondendo os que ainda estão na rotação mas ela não jogou ainda.
const ACTIVE_MAP_POOL = ["Split", "Haven", "Sunset", "Summit", "Abyss", "Lotus", "Ascent"];

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
    accountLevel: true,
    weaponKills: true,
    weaponAccuracy: true,
    multiKills: true,
    clutches: true,
    firstBloods: true,
    sidesRounds: true,
    rr: true,
    rankTierId: true,
    match: { select: { modo: true, mapId: true, durationMs: true, startedAt: true, map: { select: { nome: true, displayIcon: true } } } },
  },
} satisfies Parameters<typeof prisma.matchPlayer.findMany>[0];

type Row = Awaited<ReturnType<typeof prisma.matchPlayer.findMany<typeof rowArgs>>>[number];

// Nota própria do callout (0-100) — não é o "Tracker Score" de outra
// plataforma (algoritmo deles, não documentado, não é dado bruto). Combina
// métricas que a gente já mostra, com peso e faixa de referência
// documentados aqui — winrate pesa mais (é o resultado que importa),
// K/D/ACS/DDΔ normalizados contra uma faixa "boa" de referência (não um
// máximo teórico, pra não achatar todo mundo perto de 0). Usada tanto pro
// agregado do ato quanto por partida (aí `resultPercent` é 0 ou 100).
function calcularIndiceCallout(resultPercent: number, kda: number, acs: number, ddPerRound: number): number {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const kdaScore = clamp01(kda / 1.5) * 100;
  const acsScore = clamp01(acs / 280) * 100;
  const ddScore = clamp01((ddPerRound + 20) / 40) * 100;
  const value = resultPercent * 0.35 + kdaScore * 0.25 + acsScore * 0.25 + ddScore * 0.15;
  return Math.round(value);
}

// Lista os atos que já têm partida sincronizada — pro seletor de ato do
// front. `distinct` + `orderBy startedAt desc` devolve, pra cada seasonId
// diferente, a linha da partida mais recente daquele ato (dá o par
// seasonId/seasonShort certo e já sai ordenado do mais recente pro mais
// antigo de graça).
export async function listAvailableSeasons(): Promise<SeasonOption[]> {
  const rows = await prisma.match.findMany({
    where: { seasonId: { not: null } },
    distinct: ["seasonId"],
    orderBy: { startedAt: "desc" },
    select: { seasonId: true, seasonShort: true },
  });
  return rows.map((r) => ({ seasonId: r.seasonId!, seasonShort: r.seasonShort ?? r.seasonId! }));
}

function emptySides(): SidesBreakdown {
  return {
    attack: { winratePercent: 0, wins: 0, total: 0 },
    defense: { winratePercent: 0, wins: 0, total: 0 },
    overtime: { wins: 0, total: 0 },
  };
}

// Maior ACS do time em cada partida — mesmo critério de MVP usado em
// RecentMatchSummary/ParticipanteEquipeMatch, só que aqui vira um mapa
// "matchId:teamId" -> maior ACS pra consultar por qualquer linha.
function buildMaxAcsByMatchTeam(rows: Array<{ matchId: string; teamId: string; acs: number }>): Map<string, number> {
  const max = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.matchId}:${r.teamId}`;
    const current = max.get(key) ?? -Infinity;
    if (r.acs > current) max.set(key, r.acs);
  }
  return max;
}

// Posição (1º-5º) por ACS dentro do próprio time, em cada partida — mesmo
// critério do MVP (posição 1), só que pra todo mundo, não só quem ganhou.
// Usada pra mostrar "2º lugar" etc. em quem não foi MVP na lista de
// partidas.
function buildTeamPositionByMatchPuuid(rows: Array<{ matchId: string; teamId: string; puuid: string; acs: number }>): Map<string, number> {
  const byMatchTeam = new Map<string, Array<{ matchId: string; puuid: string; acs: number }>>();
  for (const r of rows) {
    const key = `${r.matchId}:${r.teamId}`;
    const list = byMatchTeam.get(key) ?? [];
    list.push(r);
    byMatchTeam.set(key, list);
  }

  const position = new Map<string, number>();
  for (const list of byMatchTeam.values()) {
    const sorted = [...list].sort((a, b) => b.acs - a.acs);
    sorted.forEach((p, i) => position.set(`${p.matchId}:${p.puuid}`, i + 1));
  }
  return position;
}

// Agentes mais jogados — de propósito ignora `agentNameFilter` (selecionar
// um agente não pode fazer esse card colapsar pra 1 linha só; ele existe
// justamente pra trocar de agente). Respeita `mapIdFilter`: escolher um
// mapa restringe a quais agentes você jogou NESSE mapa. Mesmo padrão dual
// já usado no /dashboard antigo (ver mapIdFilter em dashboard.ts).
async function buildTopAgents(rows: Row[]): Promise<TopAgentStat[]> {
  const byAgent = new Map<
    string,
    { matches: number; wins: number; kills: number; deaths: number; assists: number; dmg: number; rounds: number; acsSum: number; maps: Map<string, { wins: number; total: number }> }
  >();
  for (const r of rows) {
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
  return [...byAgent.entries()]
    .map(([agent, s]) => {
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
}

// Mapas — espelha buildTopAgents, mas de propósito ignora `mapIdFilter`
// (mesmo motivo: selecionar um mapa não pode colapsar esse card). Mapas do
// pool ativo (ver ACTIVE_MAP_POOL) que a pessoa ainda não jogou nesse ato
// entram com 0/0, pra ficar visível que o mapa está na rotação mas ainda
// não foi jogado, em vez de simplesmente não aparecer no card.
function buildTopMaps(rows: Row[], activeMapAssets: Array<{ id: string; nome: string }>): MapWinrate[] {
  const byMap = new Map<string, { wins: number; total: number; mapId: string | null }>();
  for (const r of rows) {
    const mapName = r.match.map?.nome ?? "—";
    const entry = byMap.get(mapName) ?? { wins: 0, total: 0, mapId: r.match.mapId };
    entry.total++;
    if (r.won) entry.wins++;
    byMap.set(mapName, entry);
  }
  for (const m of activeMapAssets) {
    if (!byMap.has(m.nome)) byMap.set(m.nome, { wins: 0, total: 0, mapId: m.id });
  }
  return [...byMap.entries()]
    .map(([map, s]) => ({ map, mapId: s.mapId, winratePercent: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0, wins: s.wins, total: s.total }))
    .sort((a, b) => b.total - a.total || b.winratePercent - a.winratePercent);
}

export async function buildSeasonOverview(
  puuid: string,
  region: string,
  requestedSeasonId?: string,
  mapIdFilter?: string,
  agentNameFilter?: string,
  modoFilter?: string,
): Promise<SeasonOverview | null> {
  const availableSeasons = await listAvailableSeasons();
  const seasonId = requestedSeasonId ?? (await getCurrentSeasonId());
  if (!seasonId) return null;

  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, match: { seasonId } },
    orderBy: { match: { startedAt: "desc" } },
    take: MAX_SEASON_MATCHES,
    ...rowArgs,
  });

  // Sem `modoFilter`, o painel mistura só os modos com estatística de
  // verdade (Competitivo/Sem classificação/Premier — ver countsTowardStats,
  // ACS zerado nos outros na sincronização). Com um modo específico
  // escolhido no seletor, mostra só esse — mesmo que normalmente não conte
  // pra estatística (ex.: Deathmatch), já que a pessoa pediu explicitamente.
  const statRows = modoFilter ? rows.filter((r) => r.match.modo === modoFilter) : rows.filter((r) => countsTowardStats(r.match.modo));
  const availableModos = [...new Set(rows.map((r) => r.match.modo))];
  const seasonShort = availableSeasons.find((s) => s.seasonId === seasonId)?.seasonShort ?? null;

  let currentRank: SeasonOverview["currentRank"] = null;
  let peakRank: SeasonOverview["peakRank"] = null;
  try {
    const mmr = await getMmr(region, puuid);
    currentRank = { tierLabel: mmr.current_data.currenttierpatched, rr: mmr.current_data.ranking_in_tier, iconUrl: mmr.current_data.images.small };
    if (mmr.highest_rank) peakRank = { tierLabel: mmr.highest_rank.patched_tier, seasonShort: mmr.highest_rank.season };
  } catch {
    // sem MMR disponível — mantém null
  }

  if (statRows.length === 0) {
    return {
      seasonId,
      seasonShort,
      availableSeasons,
      availableModos,
      accountLevel: rows[0]?.accountLevel ?? null,
      currentRank,
      peakRank,
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
      attackDefense: emptySides(),
      topAgents: [],
      topMaps: [],
      roles: [],
      accuracy: { headPercent: 0, bodyPercent: 0, legPercent: 0, headHits: 0, bodyHits: 0, legHits: 0 },
      topWeapons: [],
      mapIcons: {},
      agentIcons: {},
    };
  }

  // Ícones sempre vêm do ato inteiro (não do filtro atual) — os seletores
  // de mapa/agente do painel precisam continuar mostrando o catálogo
  // completo mesmo com um filtro já aplicado. Inclui os mapas do pool
  // ativo (ver ACTIVE_MAP_POOL) mesmo que a pessoa ainda não tenha jogado
  // nenhum deles nesse ato — senão o card de Mapa não teria ícone pra eles.
  const activeMapAssets = await prisma.mapAsset.findMany({ where: { nome: { in: ACTIVE_MAP_POOL } }, select: { id: true, nome: true, displayIcon: true } });
  const mapIcons = Object.fromEntries(
    [
      ...new Map(
        [
          ...statRows.map((r) => [r.match.map?.nome ?? "—", r.match.map?.displayIcon ?? null] as [string, string | null]),
          ...activeMapAssets.map((m) => [m.nome, m.displayIcon] as [string, string | null]),
        ],
      ).entries(),
    ].filter(([, icon]) => icon !== null) as [string, string][],
  );
  const agentAssets = await prisma.agentAsset.findMany({ select: { nome: true, funcao: true, displayIcon: true } });
  const agentIcons = Object.fromEntries(agentAssets.filter((a) => a.displayIcon).map((a) => [a.nome, a.displayIcon!]));

  const topAgents = await buildTopAgents(mapIdFilter ? statRows.filter((r) => r.match.mapId === mapIdFilter) : statRows);
  const topMaps = buildTopMaps(agentNameFilter ? statRows.filter((r) => r.agentName === agentNameFilter) : statRows, activeMapAssets);

  // O resto do painel (KPIs, últimas partidas, funções, precisão, ataque/
  // defesa, armas) respeita os dois filtros juntos — é a visão "sob esse
  // filtro", diferente de Agentes/Mapas acima que de propósito ficam
  // completos pros seletores continuarem úteis.
  const filteredStatRows = statRows.filter(
    (r) => (!mapIdFilter || r.match.mapId === mapIdFilter) && (!agentNameFilter || r.agentName === agentNameFilter),
  );

  if (filteredStatRows.length === 0) {
    return {
      seasonId,
      seasonShort,
      availableSeasons,
      availableModos,
      accountLevel: rows[0]?.accountLevel ?? null,
      currentRank,
      peakRank,
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
      attackDefense: emptySides(),
      topAgents,
      topMaps,
      roles: [],
      accuracy: { headPercent: 0, bodyPercent: 0, legPercent: 0, headHits: 0, bodyHits: 0, legHits: 0 },
      topWeapons: [],
      mapIcons,
      agentIcons,
    };
  }

  const kills = filteredStatRows.reduce((s, r) => s + r.kills, 0);
  const deaths = filteredStatRows.reduce((s, r) => s + r.deaths, 0);
  const assists = filteredStatRows.reduce((s, r) => s + r.assists, 0);
  const acsSum = filteredStatRows.reduce((s, r) => s + r.acs, 0);
  const dmg = filteredStatRows.reduce((s, r) => s + r.damageDealt, 0);
  const rounds = filteredStatRows.reduce((s, r) => s + r.roundsPlayed, 0);
  const headshots = filteredStatRows.reduce((s, r) => s + r.headshots, 0);
  const bodyshots = filteredStatRows.reduce((s, r) => s + r.bodyshots, 0);
  const legshots = filteredStatRows.reduce((s, r) => s + r.legshots, 0);
  const shotsTotal = headshots + bodyshots + legshots;
  const wins = filteredStatRows.filter((r) => r.won).length;
  const losses = filteredStatRows.length - wins;
  const kda = deaths > 0 ? round2((kills + assists) / deaths) : kills + assists;
  const acs = Math.round(acsSum / filteredStatRows.length);
  const adr = rounds > 0 ? Math.round(dmg / rounds) : 0;
  const hsPercent = shotsTotal > 0 ? round1((headshots / shotsTotal) * 100) : 0;
  const winratePercent = Math.round((wins / filteredStatRows.length) * 100);

  const playtimeMs = filteredStatRows.reduce((s, r) => s + r.match.durationMs, 0);
  const matchesCount = filteredStatRows.length;

  // DDΔ/round: seu ADR na partida menos a média de ADR dos outros 9
  // jogadores da mesma partida — quanto de dano a mais (ou a menos) você
  // fez por round comparado ao resto da lobby. Só colunas escalares já
  // salvas (damageDealt/roundsPlayed de todo mundo), sem tocar rawJson.
  // Alinhado 1:1 com `filteredStatRows` (mesma ordem) — reusado depois pro
  // Índice callout por partida.
  const matchIds = filteredStatRows.map((r) => r.matchId);
  const allPlayers =
    matchIds.length > 0
      ? await prisma.matchPlayer.findMany({
          where: { matchId: { in: matchIds } },
          select: { matchId: true, puuid: true, teamId: true, acs: true, damageDealt: true, roundsPlayed: true },
        })
      : [];
  const othersByMatch = new Map<string, { dmg: number; rounds: number }>();
  for (const p of allPlayers) {
    if (p.puuid === puuid) continue;
    const entry = othersByMatch.get(p.matchId) ?? { dmg: 0, rounds: 0 };
    entry.dmg += p.damageDealt;
    entry.rounds += p.roundsPlayed;
    othersByMatch.set(p.matchId, entry);
  }
  const perMatchDelta = filteredStatRows.map((r) => {
    const selfAdr = r.roundsPlayed > 0 ? r.damageDealt / r.roundsPlayed : 0;
    const others = othersByMatch.get(r.matchId);
    const othersAdr = others && others.rounds > 0 ? others.dmg / others.rounds : selfAdr;
    return selfAdr - othersAdr;
  });
  const ddPerRound = round1(perMatchDelta.reduce((s, d) => s + d, 0) / perMatchDelta.length);

  // Funções — agentName -> AgentAsset.funcao (em inglês) -> label pt-BR.
  const roleByAgent = new Map(agentAssets.map((a) => [a.nome, a.funcao]));
  const byRole = new Map<string, { matches: number; wins: number; kills: number; deaths: number; assists: number }>();
  for (const r of filteredStatRows) {
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
      kills: s.kills,
      deaths: s.deaths,
      assists: s.assists,
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

  // Ataque/defesa — soma direto de MatchPlayer.sidesRounds (calculado na
  // sincronização, ver sync.ts/insights.ts:computeMatchSides). Sem rawJson.
  let atkWins = 0,
    atkTotal = 0,
    defWins = 0,
    defTotal = 0,
    otWins = 0,
    otTotal = 0;
  for (const r of filteredStatRows) {
    const s = (r.sidesRounds as { atkWins?: number; atkTotal?: number; defWins?: number; defTotal?: number; otWins?: number; otTotal?: number } | null) ?? {};
    atkWins += s.atkWins ?? 0;
    atkTotal += s.atkTotal ?? 0;
    defWins += s.defWins ?? 0;
    defTotal += s.defTotal ?? 0;
    otWins += s.otWins ?? 0;
    otTotal += s.otTotal ?? 0;
  }
  const attackDefense: SidesBreakdown = {
    attack: { winratePercent: atkTotal > 0 ? Math.round((atkWins / atkTotal) * 100) : 0, wins: atkWins, total: atkTotal },
    defense: { winratePercent: defTotal > 0 ? Math.round((defWins / defTotal) * 100) : 0, wins: defWins, total: defTotal },
    overtime: { wins: otWins, total: otTotal },
  };

  // Top Weapons — lê as colunas weaponKills/weaponAccuracy já agregadas na
  // sincronização (ver sync.ts/matchReplay.ts), não relê rawJson aqui.
  // weaponAccuracy é aproximado (round.stats, não tiro a tiro — ver
  // PlayerMatchReplayStats.weaponAccuracy).
  const weaponTotals = new Map<string, number>();
  const weaponShots = new Map<string, { head: number; body: number; leg: number }>();
  for (const r of filteredStatRows) {
    const wk = (r.weaponKills as Record<string, number> | null) ?? {};
    for (const [weapon, count] of Object.entries(wk)) {
      weaponTotals.set(weapon, (weaponTotals.get(weapon) ?? 0) + count);
    }
    const wa = (r.weaponAccuracy as Record<string, { headshots: number; bodyshots: number; legshots: number }> | null) ?? {};
    for (const [weapon, s] of Object.entries(wa)) {
      const entry = weaponShots.get(weapon) ?? { head: 0, body: 0, leg: 0 };
      entry.head += s.headshots;
      entry.body += s.bodyshots;
      entry.leg += s.legshots;
      weaponShots.set(weapon, entry);
    }
  }
  const topWeapons: WeaponStat[] = [...weaponTotals.entries()]
    .map(([weapon, weaponKillsCount]) => {
      const shots = weaponShots.get(weapon);
      const shotsTotalForWeapon = shots ? shots.head + shots.body + shots.leg : 0;
      return {
        weapon,
        kills: weaponKillsCount,
        headPercent: shotsTotalForWeapon > 0 ? round1((shots!.head / shotsTotalForWeapon) * 100) : 0,
        bodyPercent: shotsTotalForWeapon > 0 ? round1((shots!.body / shotsTotalForWeapon) * 100) : 0,
        legPercent: shotsTotalForWeapon > 0 ? round1((shots!.leg / shotsTotalForWeapon) * 100) : 0,
      };
    })
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  const firstBloods = filteredStatRows.reduce((s, r) => s + (r.firstBloods ?? 0), 0);
  const aces = filteredStatRows.reduce((s, r) => s + ((r.multiKills as Record<string, number> | null)?.["5"] ?? 0), 0);

  return {
    seasonId,
    seasonShort,
    availableSeasons,
    availableModos,
    accountLevel: rows[0]?.accountLevel ?? null,
    currentRank,
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
    attackDefense,
    topAgents,
    topMaps,
    roles,
    accuracy,
    topWeapons,
    mapIcons,
    agentIcons,
  };
}

// Constrói o SeasonMatchSummary de cada linha — badges de clutch/multi-kill,
// placar (via rawJson, só das partidas dessa página), MVP (maior ACS do
// próprio time) e posição (1º-5º no time por ACS, pra quem não foi MVP),
// Índice callout por partida. `perMatchDelta` e `rows` precisam estar
// alinhados 1:1 (mesmo índice = mesma partida).
function toSeasonMatchSummaries(
  rows: Row[],
  perMatchDelta: number[],
  rrByMatch: Map<string, number>,
  rawJsonByMatchId: Map<string, unknown>,
  maxAcsByMatchTeam: Map<string, number>,
  teamPositionByMatchPuuid: Map<string, number>,
  rankIconByTierId: Map<number, string>,
  now: Date,
): SeasonMatchSummary[] {
  return rows.map((r, i) => {
    const shotsTotalMatch = r.headshots + r.bodyshots + r.legshots;
    const kdaRatio = r.deaths > 0 ? round2((r.kills + r.assists) / r.deaths) : r.kills + r.assists;
    const ddDelta = round1(perMatchDelta[i] ?? 0);

    const badges: MatchBadge[] = [];
    const clutches = (r.clutches as Record<string, number> | null) ?? {};
    for (const [size, count] of Object.entries(clutches)) {
      for (let n = 0; n < count; n++) badges.push({ kind: "clutch", size: Number(size) });
    }
    const multiKills = (r.multiKills as Record<string, number> | null) ?? {};
    for (const [size, count] of Object.entries(multiKills)) {
      for (let n = 0; n < count; n++) badges.push({ kind: "multiKill", size: Number(size) });
    }

    const score = scoreFor(rawJsonByMatchId.get(r.matchId), r.teamId);

    return {
      id: r.matchId,
      result: matchResult(r.won, rrByMatch.get(r.matchId)),
      map: r.match.map?.nome ?? mapNameFrom(rawJsonByMatchId.get(r.matchId)),
      agent: r.agentName,
      modo: r.match.modo,
      rankIconUrl: r.rankTierId !== null ? rankIconByTierId.get(r.rankTierId) ?? null : null,
      score: `${score.own}—${score.opponent}`,
      kda: `${r.kills}/${r.deaths}/${r.assists}`,
      kdaRatio,
      acs: r.acs,
      ddPerRound: ddDelta,
      hsPercent: shotsTotalMatch > 0 ? round1((r.headshots / shotsTotalMatch) * 100) : 0,
      rr: rrByMatch.get(r.matchId) ?? null,
      playedAtLabel: formatPlayedAt(r.match.startedAt, now),
      playedAtIso: r.match.startedAt.toISOString(),
      badges,
      mvp: r.acs === maxAcsByMatchTeam.get(`${r.matchId}:${r.teamId}`),
      position: teamPositionByMatchPuuid.get(`${r.matchId}:${r.puuid}`) ?? null,
      calloutIndex: calcularIndiceCallout(r.won ? 100 : 0, kdaRatio, r.acs, ddDelta),
    };
  });
}

const MATCHES_PAGE_SIZE = 12;

// Lista paginada de partidas do ato (12 por página) — separada de
// buildSeasonOverview de propósito: virar página não deveria recalcular os
// KPIs/top agentes/mapas/etc. de novo, só a própria lista. Reaplica os
// mesmos filtros de ato/mapa/agente/modo do painel (ver buildSeasonOverview),
// mas o DDΔ/round e o rawJson só são buscados pras partidas dessa página —
// nunca das ~150 inteiras.
export async function buildSeasonMatchesPage(
  puuid: string,
  region: string,
  requestedSeasonId?: string,
  mapIdFilter?: string,
  agentNameFilter?: string,
  modoFilter?: string,
  page = 1,
): Promise<SeasonMatchesPage | null> {
  const seasonId = requestedSeasonId ?? (await getCurrentSeasonId());
  if (!seasonId) return null;

  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, match: { seasonId } },
    orderBy: { match: { startedAt: "desc" } },
    take: MAX_SEASON_MATCHES,
    ...rowArgs,
  });

  const statRows = modoFilter ? rows.filter((r) => r.match.modo === modoFilter) : rows.filter((r) => countsTowardStats(r.match.modo));
  const filteredStatRows = statRows.filter(
    (r) => (!mapIdFilter || r.match.mapId === mapIdFilter) && (!agentNameFilter || r.agentName === agentNameFilter),
  );

  const total = filteredStatRows.length;
  const safePage = Math.max(1, page);
  const pageRows = filteredStatRows.slice((safePage - 1) * MATCHES_PAGE_SIZE, safePage * MATCHES_PAGE_SIZE);

  if (pageRows.length === 0) {
    return { matches: [], page: safePage, pageSize: MATCHES_PAGE_SIZE, total };
  }

  // DDΔ/round só pras partidas dessa página (não das ~150 do ato inteiro).
  const matchIds = pageRows.map((r) => r.matchId);
  const allPlayers = await prisma.matchPlayer.findMany({
    where: { matchId: { in: matchIds } },
    select: { matchId: true, puuid: true, teamId: true, acs: true, damageDealt: true, roundsPlayed: true },
  });
  const othersByMatch = new Map<string, { dmg: number; rounds: number }>();
  for (const p of allPlayers) {
    if (p.puuid === puuid) continue;
    const entry = othersByMatch.get(p.matchId) ?? { dmg: 0, rounds: 0 };
    entry.dmg += p.damageDealt;
    entry.rounds += p.roundsPlayed;
    othersByMatch.set(p.matchId, entry);
  }
  const perMatchDelta = pageRows.map((r) => {
    const selfAdr = r.roundsPlayed > 0 ? r.damageDealt / r.roundsPlayed : 0;
    const others = othersByMatch.get(r.matchId);
    const othersAdr = others && others.rounds > 0 ? others.dmg / others.rounds : selfAdr;
    return selfAdr - othersAdr;
  });

  let rrByMatch = new Map<string, number>();
  try {
    const history = await getMmrHistory(region, puuid);
    rrByMatch = new Map(history.map((h) => [h.match_id, h.last_change]));
  } catch {
    // sem histórico de RR — a página fica com rr null
  }

  const rawJsonByMatchId = new Map(
    (await prisma.match.findMany({ where: { id: { in: matchIds } }, select: { id: true, rawJson: true } })).map((m) => [m.id, m.rawJson]),
  );

  const rankIconByTierId = new Map(
    (await prisma.rankTierAsset.findMany({ select: { tierId: true, smallIcon: true } })).filter((t) => t.smallIcon !== null).map((t) => [t.tierId, t.smallIcon!]),
  );

  const matches = toSeasonMatchSummaries(
    pageRows,
    perMatchDelta,
    rrByMatch,
    rawJsonByMatchId,
    buildMaxAcsByMatchTeam(allPlayers),
    buildTeamPositionByMatchPuuid(allPlayers),
    rankIconByTierId,
    new Date(),
  );

  return { matches, page: safePage, pageSize: MATCHES_PAGE_SIZE, total };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
