import type { MatchV4Data, TeamAgentPick, TeamDashboardSummary, TeamStandoutMatch } from "@callout/shared";
import { MIN_TEAM_MATCH_PLAYERS } from "@callout/shared";
import { prisma } from "./prisma.js";
import { loadAgentColorsByName } from "./assets.js";
import { mapNameFrom, scoreFor, formatPlayedAt } from "./dashboard.js";
import { countsTowardStats } from "./match-result.js";
import { replayMatchStats } from "./matchReplay.js";

const round0 = (n: number) => Math.round(n);

const EMPTY_SUMMARY: TeamDashboardSummary = {
  qualifyingMatchCount: 0,
  wins: 0,
  losses: 0,
  winratePercent: 0,
  currentStreak: { type: null, count: 0 },
  bestWinStreak: 0,
  mapWinrates: [],
  lineupCombos: [],
  acsRanking: [],
  assistRanking: [],
  mvpRanking: [],
  clutchRanking: [],
  firstBloodRanking: [],
  mostPickedAgents: [],
  biggestWin: null,
  closestMatch: null,
};

function computeStreaks(resultsOldToNew: boolean[]): { current: TeamDashboardSummary["currentStreak"]; bestWinStreak: number } {
  if (resultsOldToNew.length === 0) return { current: { type: null, count: 0 }, bestWinStreak: 0 };

  const last = resultsOldToNew[resultsOldToNew.length - 1]!;
  let count = 0;
  for (let i = resultsOldToNew.length - 1; i >= 0; i--) {
    if (resultsOldToNew[i] === last) count++;
    else break;
  }

  let bestWinStreak = 0;
  let run = 0;
  for (const won of resultsOldToNew) {
    run = won ? run + 1 : 0;
    bestWinStreak = Math.max(bestWinStreak, run);
  }

  return { current: { type: last ? "V" : "D", count }, bestWinStreak };
}

// Painel do time: agregado sobre as mesmas "partidas do time" do histórico
// em grupo (buildTeamMatches) — >=MIN_TEAM_MATCH_PLAYERS membros rastreados
// juntos —, com uma exigência a mais: todo mundo do MESMO lado (teamId).
// buildTeamMatches não checa isso porque não precisa (só lista partidas);
// aqui precisa, senão "melhor combinação" ficaria sem sentido se o grupo
// tivesse caído dividido nos dois lados por acaso.
export async function buildTeamDashboard(): Promise<TeamDashboardSummary | null> {
  const team = await prisma.team.findFirst({ include: { members: { include: { user: true } } } });
  if (!team) return null;

  const trackedMembers = team.members.filter((m) => m.user.riotPuuid);
  if (trackedMembers.length === 0) return EMPTY_SUMMARY;

  const memberByPuuid = new Map(trackedMembers.map((m) => [m.user.riotPuuid as string, m]));
  const nameByUserId = new Map(team.members.map((m) => [m.userId, m.user.riotName ?? m.user.discordUsername]));
  const puuids = [...memberByPuuid.keys()];

  // Sem `include: { match: true }` — puxaria o rawJson da partida (~400KB
  // em média) uma vez por jogador rastreado nela, não uma vez por partida.
  // Sem recorte de data (histórico é tudo, igual buildTeamMatches), isso é
  // exatamente o padrão que estourou a memória em produção. Busca os campos
  // do jogador + só o `modo` do match primeiro, decide quais partidas
  // qualificam, e só então busca o rawJson dessas partidas — uma vez cada.
  //
  // Só Competitivo/Sem classificação/Premier — os rankings (ACS, MVP etc.)
  // não podem ser contaminados por Deathmatch (ACS não é comparável, não
  // tem round pra ganhar/perder) ou outros modos fora desse conjunto,
  // mesmo que o histórico bruto do time (buildTeamMatches) mostre todo mundo.
  const rows = (
    await prisma.matchPlayer.findMany({
      where: { puuid: { in: puuids } },
      select: {
        matchId: true,
        puuid: true,
        teamId: true,
        won: true,
        agentName: true,
        acs: true,
        assists: true,
        match: { select: { modo: true } },
      },
    })
  ).filter((r) => countsTowardStats(r.match.modo));

  const byMatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r);
    byMatch.set(r.matchId, list);
  }
  const qualifyingLists = [...byMatch.values()].filter(
    (list) => list.length >= MIN_TEAM_MATCH_PLAYERS && new Set(list.map((r) => r.teamId)).size === 1,
  );
  if (qualifyingLists.length === 0) return EMPTY_SUMMARY;

  const matches = await prisma.match.findMany({
    where: { id: { in: qualifyingLists.map((list) => list[0]!.matchId) } },
    orderBy: { startedAt: "asc" },
  });
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const qualifying = qualifyingLists
    .map((list) => ({ match: matchById.get(list[0]!.matchId), list }))
    .filter((x): x is { match: (typeof matches)[number]; list: typeof rows } => x.match !== undefined)
    .sort((a, b) => a.match.startedAt.getTime() - b.match.startedAt.getTime());

  const now = new Date();
  const wins = qualifying.filter(({ list }) => list[0]!.won).length;
  const losses = qualifying.length - wins;
  const { current, bestWinStreak } = computeStreaks(qualifying.map(({ list }) => list[0]!.won));

  const byMap = new Map<string, { mapId: string | null; wins: number; total: number }>();
  const byCombo = new Map<string, { memberUserIds: string[]; wins: number; total: number }>();
  const acsAgg = new Map<string, { sum: number; count: number }>();
  const assistAgg = new Map<string, { sum: number; count: number }>();
  const mvpAgg = new Map<string, number>();
  const clutchAgg = new Map<string, { won: number; played: number }>();
  const firstBloodAgg = new Map<string, number>();
  const agentPickCounts = new Map<string, number>();

  let biggestWin: TeamStandoutMatch | null = null;
  let biggestWinMargin = -Infinity;
  let closestMatch: TeamStandoutMatch | null = null;
  let closestMatchMargin = Infinity;

  // Trocar "só pra mim" (matches.ts) por "o time inteiro nessa partida" —
  // MIN_TEAM_MATCH_PLAYERS+1 é o único caso em que "quem ficou de fora"
  // faz sentido (time de 6, jogo de 5); com outro tamanho de time fica
  // ambíguo demais pra valer a pena mostrar.
  const trackedUserIds = trackedMembers.map((m) => m.userId);
  const missingFor = (comboUserIds: string[]): string | null =>
    trackedMembers.length === MIN_TEAM_MATCH_PLAYERS + 1 ? (trackedUserIds.find((id) => !comboUserIds.includes(id)) ?? null) : null;

  for (const { match, list } of qualifying) {
    const raw = match.rawJson as unknown as MatchV4Data;
    const map = mapNameFrom(match.rawJson);
    const score = scoreFor(match.rawJson, list[0]!.teamId);
    const margin = score.own - score.opponent;

    const mEntry = byMap.get(map) ?? { mapId: match.mapId, wins: 0, total: 0 };
    mEntry.total++;
    if (list[0]!.won) mEntry.wins++;
    byMap.set(map, mEntry);

    const comboUserIds = [...list.map((r) => memberByPuuid.get(r.puuid)!.userId)].sort();
    const comboKey = comboUserIds.join(",");
    const cEntry = byCombo.get(comboKey) ?? { memberUserIds: comboUserIds, wins: 0, total: 0 };
    cEntry.total++;
    if (list[0]!.won) cEntry.wins++;
    byCombo.set(comboKey, cEntry);

    const maxAcs = Math.max(...list.map((r) => r.acs));
    const replay = replayMatchStats(raw);

    for (const r of list) {
      const userId = memberByPuuid.get(r.puuid)!.userId;

      const acsEntry = acsAgg.get(userId) ?? { sum: 0, count: 0 };
      acsEntry.sum += r.acs;
      acsEntry.count++;
      acsAgg.set(userId, acsEntry);

      const assistEntry = assistAgg.get(userId) ?? { sum: 0, count: 0 };
      assistEntry.sum += r.assists;
      assistEntry.count++;
      assistAgg.set(userId, assistEntry);

      if (r.acs === maxAcs) mvpAgg.set(userId, (mvpAgg.get(userId) ?? 0) + 1);

      const replayRow = replay.get(r.puuid);
      if (replayRow) {
        const clutchEntry = clutchAgg.get(userId) ?? { won: 0, played: 0 };
        clutchEntry.won += replayRow.clutchesWon;
        clutchEntry.played += replayRow.clutchesPlayed;
        clutchAgg.set(userId, clutchEntry);
        firstBloodAgg.set(userId, (firstBloodAgg.get(userId) ?? 0) + replayRow.firstBloods);
      }

      agentPickCounts.set(r.agentName, (agentPickCounts.get(r.agentName) ?? 0) + 1);
    }

    const standout: TeamStandoutMatch = {
      matchId: match.id,
      map,
      score: `${score.own}—${score.opponent}`,
      marginRounds: margin,
      playedAtLabel: formatPlayedAt(match.startedAt, now),
    };
    if (list[0]!.won && margin > biggestWinMargin) {
      biggestWinMargin = margin;
      biggestWin = standout;
    }
    if (Math.abs(margin) < closestMatchMargin) {
      closestMatchMargin = Math.abs(margin);
      closestMatch = standout;
    }
  }

  const mapWinrates = [...byMap.entries()]
    .map(([map, s]) => ({ map, mapId: s.mapId, winratePercent: s.total ? round0((s.wins / s.total) * 100) : 0, wins: s.wins, total: s.total }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  const lineupCombos = [...byCombo.entries()]
    .map(([comboKey, s]) => {
      const missingUserId = missingFor(s.memberUserIds);
      return {
        comboKey,
        memberUserIds: s.memberUserIds,
        memberNames: s.memberUserIds.map((id) => nameByUserId.get(id) ?? "?"),
        missingUserId,
        missingName: missingUserId ? (nameByUserId.get(missingUserId) ?? null) : null,
        wins: s.wins,
        total: s.total,
        winratePercent: s.total ? round0((s.wins / s.total) * 100) : 0,
      };
    })
    .sort((a, b) => b.winratePercent - a.winratePercent);

  const acsRanking = [...acsAgg.entries()]
    .map(([userId, s]) => ({ userId, name: nameByUserId.get(userId) ?? "?", value: round0(s.sum / s.count), matchesPlayed: s.count }))
    .sort((a, b) => b.value - a.value);

  const assistRanking = [...assistAgg.entries()]
    .map(([userId, s]) => ({ userId, name: nameByUserId.get(userId) ?? "?", value: s.sum, matchesPlayed: s.count }))
    .sort((a, b) => b.value - a.value);

  const mvpRanking = [...mvpAgg.entries()]
    .map(([userId, value]) => ({ userId, name: nameByUserId.get(userId) ?? "?", value, matchesPlayed: acsAgg.get(userId)?.count ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const clutchRanking = [...clutchAgg.entries()]
    .map(([userId, s]) => ({ userId, name: nameByUserId.get(userId) ?? "?", clutchesWon: s.won, clutchesPlayed: s.played }))
    .sort((a, b) => b.clutchesWon - a.clutchesWon || b.clutchesPlayed - a.clutchesPlayed);

  const firstBloodRanking = [...firstBloodAgg.entries()]
    .map(([userId, value]) => ({ userId, name: nameByUserId.get(userId) ?? "?", value, matchesPlayed: acsAgg.get(userId)?.count ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const agentColors = await loadAgentColorsByName();
  const mostPickedAgents: TeamAgentPick[] = [...agentPickCounts.entries()]
    .map(([agent, count]) => ({ agent, color: agentColors.get(agent) ?? "#9A9DA1", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    qualifyingMatchCount: qualifying.length,
    wins,
    losses,
    winratePercent: round0((wins / qualifying.length) * 100),
    currentStreak: current,
    bestWinStreak,
    mapWinrates,
    lineupCombos,
    acsRanking,
    assistRanking,
    mvpRanking,
    clutchRanking,
    firstBloodRanking,
    mostPickedAgents,
    biggestWin,
    closestMatch,
  };
}
