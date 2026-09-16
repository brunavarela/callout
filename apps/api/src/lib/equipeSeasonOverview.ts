import type {
  AccuracyBreakdown,
  MatchBadge,
  MatchCountFilter,
  RoleStat,
  SeasonMatchesPage,
  SeasonMatchSummary,
  SeasonOverview,
  SidesBreakdown,
  TopAgentStat,
  WeaponStat,
} from "@callout/shared";
import { MIN_TEAM_MATCH_PLAYERS } from "@callout/shared";
import { prisma } from "./prisma.js";
import { mapNameFrom, scoreFor, formatPlayedAt } from "./dashboard.js";
import { matchResult, STATS_MODES_LIST } from "./match-result.js";
import { loadAgentColorsByName } from "./assets.js";
import {
  ACTIVE_MAP_POOL,
  ROLE_LABELS,
  rowArgs,
  MAX_SEASON_MATCHES,
  takeFor,
  buildTopMaps,
  calcularIndiceCallout,
  emptySides,
  round1,
  round2,
  type Row,
} from "./seasonOverview.js";

// Painel da equipe, "estilo Visão do ato" — mesmo card/design/filtro do
// painel individual (ver SeasonOverviewSection.tsx), mas cada número é a
// média de todos os jogadores da equipe nas partidas onde jogaram juntos
// (>=MIN_TEAM_MATCH_PLAYERS do mesmo lado — mesma regra de "partida da
// equipe" que buildEquipePainel/buildEquipeMatches já usam).
//
// A ideia central: em vez de "1 linha por partida" (um puuid só, como o
// painel individual), aqui é "até 5 linhas por partida" (uma por membro
// que jogou) — feito isso, a MAIORIA das contas do painel individual
// (soma de kills/ACS/dano/etc dividida pela quantidade de linhas) já dá
// exatamente "a média de todos os jogadores", sem precisar reescrever a
// fórmula. As exceções (que precisam contar por PARTIDA, não por linha,
// senão saem infladas ~5x) são: matchesCount, vitórias/derrotas,
// playtimeMs, o total de rounds do card Ataque/defesa (sidesRounds é uma
// contagem do time inteiro, igual pros 5 titulares) e o total/vitórias do
// card Mapa — essas usam `dedupeByMatch` (1 linha por partida) em vez das
// linhas cheias.

function dedupeByMatch<T extends { matchId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.matchId)) continue;
    seen.add(r.matchId);
    out.push(r);
  }
  return out;
}

// Partidas "da equipe" (>=MIN_TEAM_MATCH_PLAYERS membros rastreados juntos,
// do mesmo lado) — mesma regra de buildEquipePainel, sem o rawJson (só
// precisa saber QUAIS partidas qualificam aqui).
async function findQualifyingMatchIds(equipeId: string): Promise<{ puuids: string[]; matchIds: string[] } | null> {
  const equipe = await prisma.equipe.findUnique({ where: { id: equipeId }, include: { membros: { include: { user: true } } } });
  if (!equipe) return null;

  const puuids = equipe.membros.map((m) => m.user.riotPuuid).filter((p): p is string => !!p);
  if (puuids.length === 0) return { puuids: [], matchIds: [] };

  const rows = await prisma.matchPlayer.findMany({ where: { puuid: { in: puuids } }, select: { matchId: true, teamId: true } });
  const byMatch = new Map<string, string[]>();
  for (const r of rows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r.teamId);
    byMatch.set(r.matchId, list);
  }
  const matchIds = [...byMatch.entries()]
    .filter(([, teamIds]) => teamIds.length >= MIN_TEAM_MATCH_PLAYERS && new Set(teamIds).size === 1)
    .map(([matchId]) => matchId);
  return { puuids, matchIds };
}

function emptySeasonOverview(availableModos: string[] = [], topAgents: TopAgentStat[] = [], topMaps: SeasonOverview["topMaps"] = [], mapIcons: Record<string, string> = {}, agentIcons: Record<string, string> = {}): SeasonOverview {
  return {
    availableModos,
    accountLevel: null,
    currentRank: null,
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

// Soma de dano/rounds de TODOS os 10 jogadores das partidas passadas —
// base pro "DDΔ/round" de cada linha (o dano daquele jogador comparado à
// média dos outros 9 da mesma partida). Diferente do painel individual
// (que sempre exclui o MESMO puuid), aqui cada linha pode ser de um membro
// diferente da equipe, então o "self" a excluir muda linha a linha — daí
// guardar o TOTAL da partida e subtrair a própria linha na hora de usar,
// em vez de pré-calcular um "outros" fixo por partida.
async function matchTotals(matchIds: string[]): Promise<Map<string, { dmg: number; rounds: number }>> {
  const allPlayers = matchIds.length > 0 ? await prisma.matchPlayer.findMany({ where: { matchId: { in: matchIds } }, select: { matchId: true, damageDealt: true, roundsPlayed: true } }) : [];
  const totals = new Map<string, { dmg: number; rounds: number }>();
  for (const p of allPlayers) {
    const entry = totals.get(p.matchId) ?? { dmg: 0, rounds: 0 };
    entry.dmg += p.damageDealt;
    entry.rounds += p.roundsPlayed;
    totals.set(p.matchId, entry);
  }
  return totals;
}

function ddDeltaFor(r: { matchId: string; damageDealt: number; roundsPlayed: number }, totals: Map<string, { dmg: number; rounds: number }>): number {
  const selfAdr = r.roundsPlayed > 0 ? r.damageDealt / r.roundsPlayed : 0;
  const t = totals.get(r.matchId);
  if (!t) return 0;
  const othersDmg = t.dmg - r.damageDealt;
  const othersRounds = t.rounds - r.roundsPlayed;
  const othersAdr = othersRounds > 0 ? othersDmg / othersRounds : selfAdr;
  return selfAdr - othersAdr;
}

// Agentes mais jogados pela equipe (qualquer membro, em qualquer partida) —
// "matches" aqui é por LINHA de propósito (não por partida): dois membros
// jogando o mesmo agente na mesma partida conta como 2, porque a pergunta
// é "quantas vezes a equipe colocou esse agente em campo", não "em quantas
// partidas ele apareceu". Espelha buildTopAgents (seasonOverview.ts), só
// que o "outros 9" é recalculado por linha via ddDeltaFor (não dá pra
// assumir um puuid fixo de "self" por partida como lá).
async function buildEquipeTopAgents(rows: Row[]): Promise<TopAgentStat[]> {
  const matchIds = [...new Set(rows.map((r) => r.matchId))];
  const totals = await matchTotals(matchIds);

  const byAgent = new Map<
    string,
    { matches: number; wins: number; kills: number; deaths: number; assists: number; dmg: number; rounds: number; acsSum: number; ddSum: number; durationMs: number; maps: Map<string, { wins: number; total: number }> }
  >();
  for (const r of rows) {
    const entry = byAgent.get(r.agentName) ?? { matches: 0, wins: 0, kills: 0, deaths: 0, assists: 0, dmg: 0, rounds: 0, acsSum: 0, ddSum: 0, durationMs: 0, maps: new Map() };
    entry.matches++;
    if (r.won) entry.wins++;
    entry.kills += r.kills;
    entry.deaths += r.deaths;
    entry.assists += r.assists;
    entry.dmg += r.damageDealt;
    entry.rounds += r.roundsPlayed;
    entry.acsSum += r.acs;
    entry.durationMs += r.match.durationMs;
    entry.ddSum += ddDeltaFor(r, totals);
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
        kd: s.deaths > 0 ? round2(s.kills / s.deaths) : s.kills,
        adr: s.rounds > 0 ? Math.round(s.dmg / s.rounds) : 0,
        acs: Math.round(s.acsSum / s.matches),
        ddPerRound: round1(s.ddSum / s.matches),
        playtimeMs: s.durationMs,
        bestMap,
      };
    })
    .sort((a, b) => b.matches - a.matches);
}

export async function buildEquipeSeasonOverview(
  equipeId: string,
  matchCountFilter: MatchCountFilter,
  mapIdFilter?: string,
  agentNameFilter?: string,
  modoFilter?: string,
): Promise<SeasonOverview | null> {
  const qualifying = await findQualifyingMatchIds(equipeId);
  if (!qualifying) return null;
  if (qualifying.matchIds.length === 0) return emptySeasonOverview();

  // Filtra por modo NA QUERY (antes do `take`) -- mesmo motivo do
  // buildSeasonOverview individual: sem isso, "Últimas 20 partidas" pegava
  // as 20 partidas qualificadas mais recentes de QUALQUER modo primeiro, e
  // só depois filtrava por modo, deixando pouca (ou nenhuma) partida de um
  // modo menos jogado (ex.: Premier) dentro da janela.
  const modoWhere = modoFilter ? { modo: modoFilter } : { modo: { in: [...STATS_MODES_LIST] } };
  const recentMatches = await prisma.match.findMany({
    where: { id: { in: qualifying.matchIds }, ...modoWhere },
    select: { id: true },
    orderBy: { startedAt: "desc" },
    take: takeFor(matchCountFilter),
  });
  const recentIds = recentMatches.map((m) => m.id);

  const statRows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: qualifying.puuids }, matchId: { in: recentIds } },
    orderBy: { match: { startedAt: "desc" } },
    ...rowArgs,
  });

  // Modos disponíveis pro seletor -- consulta separada, sem o filtro de
  // modo acima (mesma janela de recência), senão o seletor só mostraria os
  // modos que sobraram dentro do próprio filtro já aplicado.
  const availableModosMatches = await prisma.match.findMany({
    where: { id: { in: qualifying.matchIds } },
    select: { modo: true },
    orderBy: { startedAt: "desc" },
    take: takeFor(matchCountFilter),
  });
  const availableModos = [...new Set(availableModosMatches.map((m) => m.modo))];

  if (statRows.length === 0) return emptySeasonOverview(availableModos);

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

  const topAgents = await buildEquipeTopAgents(mapIdFilter ? statRows.filter((r) => r.match.mapId === mapIdFilter) : statRows);
  // Mapa é por PARTIDA (dedupeByMatch), não por linha -- senão uma partida
  // com os 5 titulares contaria 5x pro mesmo mapa (ver comentário no topo).
  const topMapsSourceRows = agentNameFilter ? statRows.filter((r) => r.agentName === agentNameFilter) : statRows;
  const topMaps = buildTopMaps(dedupeByMatch(topMapsSourceRows), activeMapAssets);

  const filteredStatRows = statRows.filter((r) => (!mapIdFilter || r.match.mapId === mapIdFilter) && (!agentNameFilter || r.agentName === agentNameFilter));
  if (filteredStatRows.length === 0) return emptySeasonOverview(availableModos, topAgents, topMaps, mapIcons, agentIcons);

  const dedupedMatches = dedupeByMatch(filteredStatRows);
  const matchesCount = dedupedMatches.length;
  const wins = dedupedMatches.filter((r) => r.won).length;
  const losses = matchesCount - wins;
  const winratePercent = matchesCount > 0 ? Math.round((wins / matchesCount) * 100) : 0;
  const playtimeMs = dedupedMatches.reduce((s, r) => s + r.match.durationMs, 0);

  // Daqui pra baixo, tudo que soma sobre `filteredStatRows` (não
  // `dedupedMatches`) já É a média do time -- soma de todo mundo dividida
  // pela quantidade de linhas (até 5 por partida), exatamente o "média dos
  // números de todos os jogadores" pedido.
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
  const kda = deaths > 0 ? round2((kills + assists) / deaths) : kills + assists;
  const acs = Math.round(acsSum / filteredStatRows.length);
  const adr = rounds > 0 ? Math.round(dmg / rounds) : 0;
  const hsPercent = shotsTotal > 0 ? round1((headshots / shotsTotal) * 100) : 0;

  const matchIdsForDelta = [...new Set(filteredStatRows.map((r) => r.matchId))];
  const totals = await matchTotals(matchIdsForDelta);
  const perRowDelta = filteredStatRows.map((r) => ddDeltaFor(r, totals));
  const ddPerRound = round1(perRowDelta.reduce((s, d) => s + d, 0) / perRowDelta.length);

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

  // Ataque/defesa — sidesRounds é uma contagem do TIME inteiro naquela
  // partida (não por jogador) -- os 5 titulares têm o mesmo valor, soma só
  // 1x por partida (dedupedMatches), senão infla ~5x o total de rounds.
  let atkWins = 0,
    atkTotal = 0,
    defWins = 0,
    defTotal = 0,
    otWins = 0,
    otTotal = 0;
  for (const r of dedupedMatches) {
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

  // Armas — cada jogador tem seu próprio uso de arma, soma legítima sobre
  // as linhas cheias (não precisa dedupeByMatch aqui).
  const weaponTotals = new Map<string, number>();
  const weaponShots = new Map<string, { head: number; body: number; leg: number }>();
  for (const r of filteredStatRows) {
    const wk = (r.weaponKills as Record<string, number> | null) ?? {};
    for (const [weapon, count] of Object.entries(wk)) weaponTotals.set(weapon, (weaponTotals.get(weapon) ?? 0) + count);
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
    availableModos,
    accountLevel: null,
    currentRank: null,
    peakRank: null,
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

const MATCHES_PAGE_SIZE = 12;

// Lista paginada de "partidas da equipe" — cada linha é 1 partida (não 1
// jogador), com os números já resumidos pra média do time naquela partida
// específica. Sem RR (não existe RR de equipe) nem MVP/posição (esses são
// por jogador dentro do time, não fazem sentido resumidos pra equipe
// inteira) -- `agent` fica vazio de propósito, o ícone da linha cai pro
// mapa (ver SeasonMatchRow em SeasonMatchesList.tsx, já trata esse fallback).
export async function buildEquipeSeasonMatchesPage(
  equipeId: string,
  mapIdFilter?: string,
  agentNameFilter?: string,
  modoFilter?: string,
  page = 1,
): Promise<SeasonMatchesPage | null> {
  const qualifying = await findQualifyingMatchIds(equipeId);
  if (!qualifying) return null;
  const safePage = Math.max(1, page);
  if (qualifying.matchIds.length === 0) return { matches: [], page: safePage, pageSize: MATCHES_PAGE_SIZE, total: 0 };

  // Mesmo motivo do buildEquipeSeasonOverview acima -- filtra por modo NA
  // QUERY, antes do teto de MAX_SEASON_MATCHES.
  const modoWhere = modoFilter ? { modo: modoFilter } : { modo: { in: [...STATS_MODES_LIST] } };
  const recentMatches = await prisma.match.findMany({
    where: { id: { in: qualifying.matchIds }, ...modoWhere },
    select: { id: true },
    orderBy: { startedAt: "desc" },
    take: MAX_SEASON_MATCHES,
  });
  const recentIds = recentMatches.map((m) => m.id);

  const statRows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: qualifying.puuids }, matchId: { in: recentIds } },
    orderBy: { match: { startedAt: "desc" } },
    ...rowArgs,
  });

  const filteredStatRows = statRows.filter((r) => (!mapIdFilter || r.match.mapId === mapIdFilter) && (!agentNameFilter || r.agentName === agentNameFilter));

  const byMatch = new Map<string, Row[]>();
  for (const r of filteredStatRows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r);
    byMatch.set(r.matchId, list);
  }
  const matchGroups = [...byMatch.values()].sort((a, b) => b[0]!.match.startedAt.getTime() - a[0]!.match.startedAt.getTime());

  const total = matchGroups.length;
  const pageGroups = matchGroups.slice((safePage - 1) * MATCHES_PAGE_SIZE, safePage * MATCHES_PAGE_SIZE);

  if (pageGroups.length === 0) return { matches: [], page: safePage, pageSize: MATCHES_PAGE_SIZE, total };

  const pageMatchIds = pageGroups.map((g) => g[0]!.matchId);
  const rawJsonByMatchId = new Map((await prisma.match.findMany({ where: { id: { in: pageMatchIds } }, select: { id: true, rawJson: true } })).map((m) => [m.id, m.rawJson]));
  const totals = await matchTotals(pageMatchIds);

  const now = new Date();
  const matches: SeasonMatchSummary[] = pageGroups.map((group) => {
    const first = group[0]!;
    const n = group.length;
    const kills = group.reduce((s, r) => s + r.kills, 0) / n;
    const deaths = group.reduce((s, r) => s + r.deaths, 0) / n;
    const assists = group.reduce((s, r) => s + r.assists, 0) / n;
    const acs = group.reduce((s, r) => s + r.acs, 0) / n;
    const dmg = group.reduce((s, r) => s + r.damageDealt, 0);
    const roundsPlayed = group.reduce((s, r) => s + r.roundsPlayed, 0);
    const headshots = group.reduce((s, r) => s + r.headshots, 0);
    const shotsTotal = group.reduce((s, r) => s + r.headshots + r.bodyshots + r.legshots, 0);
    const kdaRatio = deaths > 0 ? round2((kills + assists) / deaths) : round2(kills + assists);

    // ADR do time (soma dos titulares) contra a média dos outros 5 da
    // partida, igual ao ddPerRound do resto do painel.
    const teamAdr = roundsPlayed > 0 ? dmg / roundsPlayed : 0;
    const t = totals.get(first.matchId);
    const othersAdr = t && t.rounds - roundsPlayed > 0 ? (t.dmg - dmg) / (t.rounds - roundsPlayed) : teamAdr;
    const ddPerRound = round1(teamAdr - othersAdr);

    const badges: MatchBadge[] = [];
    for (const r of group) {
      const clutches = (r.clutches as Record<string, number> | null) ?? {};
      for (const [size, count] of Object.entries(clutches)) for (let i = 0; i < count; i++) badges.push({ kind: "clutch", size: Number(size) });
      const multiKills = (r.multiKills as Record<string, number> | null) ?? {};
      for (const [size, count] of Object.entries(multiKills)) for (let i = 0; i < count; i++) badges.push({ kind: "multiKill", size: Number(size) });
    }

    const score = scoreFor(rawJsonByMatchId.get(first.matchId), first.teamId);
    const acsRounded = Math.round(acs);

    return {
      id: first.matchId,
      result: matchResult(first.won, null),
      map: first.match.map?.nome ?? mapNameFrom(rawJsonByMatchId.get(first.matchId)),
      agent: "",
      modo: first.match.modo,
      rankIconUrl: null,
      score: `${score.own} : ${score.opponent}`,
      // toFixed direto (não round1 interpolado) -- round1 devolve um number,
      // e concatenar ele numa string reaproveita o toString() padrão do JS,
      // que pode expor imprecisão de ponto flutuante (ex.: "28.200000000000003"
      // em vez de "28.2"). toFixed sempre formata com exatamente 1 casa.
      kda: `${kills.toFixed(1)}/${deaths.toFixed(1)}/${assists.toFixed(1)}`,
      kdaRatio,
      acs: acsRounded,
      ddPerRound,
      hsPercent: shotsTotal > 0 ? round1((headshots / shotsTotal) * 100) : 0,
      rr: null,
      playedAtLabel: formatPlayedAt(first.match.startedAt, now),
      playedAtIso: first.match.startedAt.toISOString(),
      badges,
      mvp: false,
      position: null,
      calloutIndex: calcularIndiceCallout(first.won ? 100 : 0, kdaRatio, acsRounded, ddPerRound),
    };
  });

  return { matches, page: safePage, pageSize: MATCHES_PAGE_SIZE, total };
}
