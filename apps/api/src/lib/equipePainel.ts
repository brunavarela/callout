import type { BestAgentComposition, LineupComboMatch, MatchV4Data, EquipeAgentePerformance, EquipeAgentePick, EquipePainelSummary, EquipePartidaDestaque } from "@callout/shared";
import { MIN_TEAM_MATCH_PLAYERS } from "@callout/shared";
import { prisma } from "./prisma.js";
import { loadAgentColorsByName } from "./assets.js";
import { mapNameFrom, scoreFor, formatPlayedAt } from "./dashboard.js";
import { countsTowardStats, matchResult } from "./match-result.js";
import { replayMatchStats } from "./matchReplay.js";

const round0 = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

const EMPTY_SUMMARY: EquipePainelSummary = {
  qualifyingMatchCount: 0,
  wins: 0,
  losses: 0,
  winratePercent: 0,
  currentStreak: { type: null, count: 0 },
  bestWinStreak: 0,
  mapWinrates: [],
  lineupCombos: [],
  bestAgentComposition: null,
  bestAgents: [],
  acsRanking: [],
  assistRanking: [],
  mvpRanking: [],
  clutchRanking: [],
  firstBloodRanking: [],
  firstDeathRanking: [],
  mostPickedAgents: [],
  biggestWin: null,
  worstLoss: null,
  closestMatch: null,
};

function computeStreaks(resultsOldToNew: boolean[]): { current: EquipePainelSummary["currentStreak"]; bestWinStreak: number } {
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

// Painel da equipe: agregado sobre as mesmas "partidas da equipe" do
// histórico em grupo (buildEquipeMatches) — >=MIN_TEAM_MATCH_PLAYERS
// membros rastreados juntos —, com uma exigência a mais: todo mundo do
// MESMO lado (MatchPlayer.teamId, Red/Blue — não é o id da nossa Equipe).
// buildEquipeMatches não checa isso porque não precisa (só lista partidas);
// aqui precisa, senão as variações de formação não fariam sentido se o
// grupo tivesse caído dividido nos dois lados por acaso.
export async function buildEquipePainel(equipeId: string): Promise<EquipePainelSummary | null> {
  const equipe = await prisma.equipe.findUnique({ where: { id: equipeId }, include: { membros: { include: { user: true } } } });
  if (!equipe) return null;

  const trackedMembers = equipe.membros.filter((m) => m.user.riotPuuid);
  if (trackedMembers.length === 0) return EMPTY_SUMMARY;

  const memberByPuuid = new Map(trackedMembers.map((m) => [m.user.riotPuuid as string, m]));
  const nameByUserId = new Map(equipe.membros.map((m) => [m.userId, m.user.riotName ?? m.user.discordUsername]));
  const puuids = [...memberByPuuid.keys()];

  // Sem `include: { match: true }` — puxaria o rawJson da partida (~400KB
  // em média) uma vez por jogador rastreado nela, não uma vez por partida.
  // Sem recorte de data (histórico é tudo, igual buildEquipeMatches), isso é
  // exatamente o padrão que estourou a memória em produção. Busca os campos
  // do jogador + só o `modo` do match primeiro, decide quais partidas
  // qualificam, e só então busca o rawJson dessas partidas — uma vez cada.
  //
  // Só Competitivo/Sem classificação/Premier — os rankings (ACS, MVP etc.)
  // não podem ser contaminados por Deathmatch (ACS não é comparável, não
  // tem round pra ganhar/perder) ou outros modos fora desse conjunto,
  // mesmo que o histórico bruto da equipe (buildEquipeMatches) mostre todo mundo.
  const rows = (
    await prisma.matchPlayer.findMany({
      where: { puuid: { in: puuids } },
      select: {
        matchId: true,
        puuid: true,
        teamId: true, // lado Red/Blue bruto da HenrikDev — não é o id da nossa Equipe
        won: true,
        agentName: true,
        acs: true,
        kills: true,
        assists: true,
        rr: true,
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
  const byCombo = new Map<
    string,
    {
      memberUserIds: string[];
      wins: number;
      losses: number;
      draws: number;
      overtimeWins: number;
      overtimeLosses: number;
      total: number;
      matches: LineupComboMatch[];
    }
  >();
  // Agente mais jogado por cada membro DENTRO de cada formação específica
  // (não o agente favorito dele no geral) — comboKey -> userId -> agente -> contagem.
  const comboAgentCounts = new Map<string, Map<string, Map<string, number>>>();
  // Composição de 5 agentes (não jogadores) -> vitórias/total — agentes
  // ordenados viram a chave, então duas partidas com os mesmos 5 agentes
  // (independente de quem jogou qual) caem no mesmo grupo.
  const byAgentCompo = new Map<string, { agents: string[]; wins: number; total: number }>();
  const acsAgg = new Map<string, { sum: number; count: number }>();
  const assistAgg = new Map<string, { sum: number; count: number }>();
  const mvpAgg = new Map<string, number>();
  const clutchAgg = new Map<string, { won: number; played: number }>();
  const firstBloodAgg = new Map<string, number>();
  const firstDeathAgg = new Map<string, number>();
  const agentPickCounts = new Map<string, number>();
  const agentPerfAgg = new Map<string, { kills: number; assists: number; firstBloods: number; acsSum: number; count: number }>();

  let biggestWin: EquipePartidaDestaque | null = null;
  let biggestWinMargin = -Infinity;
  let worstLoss: EquipePartidaDestaque | null = null;
  let worstLossMargin = Infinity; // mais negativo = derrota mais dura
  let closestMatch: EquipePartidaDestaque | null = null;
  let closestMatchMargin = Infinity;

  for (const { match, list } of qualifying) {
    const raw = match.rawJson as unknown as MatchV4Data;
    const map = mapNameFrom(match.rawJson);
    const score = scoreFor(match.rawJson, list[0]!.teamId);
    const margin = score.own - score.opponent;
    const won = list[0]!.won;

    const mEntry = byMap.get(map) ?? { mapId: match.mapId, wins: 0, total: 0 };
    mEntry.total++;
    if (won) mEntry.wins++;
    byMap.set(map, mEntry);

    const comboUserIds = [...list.map((r) => memberByPuuid.get(r.puuid)!.userId)].sort();
    const comboKey = comboUserIds.join(",");
    const cEntry = byCombo.get(comboKey) ?? { memberUserIds: comboUserIds, wins: 0, losses: 0, draws: 0, overtimeWins: 0, overtimeLosses: 0, total: 0, matches: [] };
    cEntry.total++;
    // Overtime: rounds além dos 24 de regulação (12 de cada lado) — mesmo
    // corte que insights.ts usa pro ataque/defesa por overtime. Separado por
    // V/D pra mostrar "4 (2OT)" ao lado de cada um, não uma coluna à parte.
    const wentToOvertime = raw.rounds.length > 24;
    // V/D/E pelo RR, não pelo `won` cru — a Riot não tem flag de empate
    // (vem `false`, igual derrota); RR vem gravado desde o sync (ver
    // comentário em MatchPlayer.rr no schema).
    const rrDelta = list[0]!.rr;
    const comboResult = matchResult(won, rrDelta);
    if (comboResult === "V") {
      cEntry.wins++;
      if (wentToOvertime) cEntry.overtimeWins++;
    } else if (comboResult === "D") {
      cEntry.losses++;
      if (wentToOvertime) cEntry.overtimeLosses++;
    } else {
      cEntry.draws++;
    }
    cEntry.matches.push({
      matchId: match.id,
      result: comboResult,
      score: `${score.own}—${score.opponent}`,
      map,
      playedAtLabel: formatPlayedAt(match.startedAt, now),
      agents: list.map((r) => ({ userId: memberByPuuid.get(r.puuid)!.userId, name: nameByUserId.get(memberByPuuid.get(r.puuid)!.userId) ?? "?", agent: r.agentName })),
    });
    byCombo.set(comboKey, cEntry);

    const agentCompoKey = [...list.map((r) => r.agentName)].sort().join(",");
    const compoEntry = byAgentCompo.get(agentCompoKey) ?? { agents: [...list.map((r) => r.agentName)].sort(), wins: 0, total: 0 };
    compoEntry.total++;
    if (won) compoEntry.wins++;
    byAgentCompo.set(agentCompoKey, compoEntry);

    const memberAgentCounts = comboAgentCounts.get(comboKey) ?? new Map<string, Map<string, number>>();
    for (const r of list) {
      const userId = memberByPuuid.get(r.puuid)!.userId;
      const agentCounts = memberAgentCounts.get(userId) ?? new Map<string, number>();
      agentCounts.set(r.agentName, (agentCounts.get(r.agentName) ?? 0) + 1);
      memberAgentCounts.set(userId, agentCounts);
    }
    comboAgentCounts.set(comboKey, memberAgentCounts);

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
        firstDeathAgg.set(userId, (firstDeathAgg.get(userId) ?? 0) + replayRow.firstDeaths);
      }

      agentPickCounts.set(r.agentName, (agentPickCounts.get(r.agentName) ?? 0) + 1);

      const perfEntry = agentPerfAgg.get(r.agentName) ?? { kills: 0, assists: 0, firstBloods: 0, acsSum: 0, count: 0 };
      perfEntry.kills += r.kills;
      perfEntry.assists += r.assists;
      perfEntry.firstBloods += replayRow?.firstBloods ?? 0;
      perfEntry.acsSum += r.acs;
      perfEntry.count++;
      agentPerfAgg.set(r.agentName, perfEntry);
    }

    const standout: EquipePartidaDestaque = {
      matchId: match.id,
      map,
      score: `${score.own}—${score.opponent}`,
      marginRounds: margin,
      playedAtLabel: formatPlayedAt(match.startedAt, now),
    };
    if (won && margin > biggestWinMargin) {
      biggestWinMargin = margin;
      biggestWin = standout;
    }
    if (!won && margin < worstLossMargin) {
      worstLossMargin = margin;
      worstLoss = standout;
    }
    if (Math.abs(margin) < closestMatchMargin) {
      closestMatchMargin = Math.abs(margin);
      closestMatch = standout;
    }
  }

  const mapWinrates = [...byMap.entries()]
    .map(([map, s]) => ({ map, mapId: s.mapId, winratePercent: s.total ? round0((s.wins / s.total) * 100) : 0, wins: s.wins, total: s.total }))
    .sort((a, b) => b.winratePercent - a.winratePercent);

  // Ordenado por quantas vezes essa formação jogou, não por winrate —
  // "variações de equipe" é sobre o que aconteceu, não um ranking de qual
  // formação é "melhor" (isso soa mal apontando pra quem ficou de fora).
  const lineupCombos = [...byCombo.entries()]
    .map(([comboKey, s]) => {
      const memberAgentCounts = comboAgentCounts.get(comboKey);
      return {
        comboKey,
        members: s.memberUserIds.map((userId) => {
          const agentCounts = memberAgentCounts?.get(userId);
          const topAgent = agentCounts ? [...agentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
          return { userId, name: nameByUserId.get(userId) ?? "?", agent: topAgent ?? "?" };
        }),
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        overtimeWins: s.overtimeWins,
        overtimeLosses: s.overtimeLosses,
        total: s.total,
        winratePercent: s.total ? round0((s.wins / s.total) * 100) : 0,
        matches: [...s.matches].reverse(), // mais recente primeiro (empilhado em ordem cronológica no loop acima)
      };
    })
    .sort((a, b) => b.total - a.total);

  // Composição de 5 agentes com mais vitórias repetidas; sem nenhuma
  // repetição de peso (>1 vitória), cai pra "a última vez que a equipe
  // ganhou", que é sempre uma composição válida (não uma "melhor" de
  // verdade, só a mais recente que funcionou).
  const bestCompoEntry = [...byAgentCompo.values()].sort((a, b) => b.wins - a.wins)[0];
  let bestAgentComposition: BestAgentComposition | null = null;
  if (bestCompoEntry && bestCompoEntry.wins > 1) {
    bestAgentComposition = { agents: bestCompoEntry.agents, wins: bestCompoEntry.wins, total: bestCompoEntry.total, isFallback: false, playedAtLabel: null };
  } else {
    const lastWin = [...qualifying].reverse().find(({ list }) => list[0]!.won);
    if (lastWin) {
      bestAgentComposition = {
        agents: [...lastWin.list.map((r) => r.agentName)].sort(),
        wins: 1,
        total: 1,
        isFallback: true,
        playedAtLabel: formatPlayedAt(lastWin.match.startedAt, now),
      };
    }
  }

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
    .map(([userId, s]) => ({
      userId,
      name: nameByUserId.get(userId) ?? "?",
      clutchesWon: s.won,
      clutchesPlayed: s.played,
      matchesPlayed: acsAgg.get(userId)?.count ?? 0,
    }))
    .sort((a, b) => b.clutchesWon - a.clutchesWon || b.clutchesPlayed - a.clutchesPlayed);

  const firstBloodRanking = [...firstBloodAgg.entries()]
    .map(([userId, value]) => ({ userId, name: nameByUserId.get(userId) ?? "?", value, matchesPlayed: acsAgg.get(userId)?.count ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const firstDeathRanking = [...firstDeathAgg.entries()]
    .map(([userId, value]) => ({ userId, name: nameByUserId.get(userId) ?? "?", value, matchesPlayed: acsAgg.get(userId)?.count ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const agentColors = await loadAgentColorsByName();
  const mostPickedAgents: EquipeAgentePick[] = [...agentPickCounts.entries()]
    .map(([agent, count]) => ({ agent, color: agentColors.get(agent) ?? "#9A9DA1", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // "Melhores agentes": kills/assistências/first bloods/impacto (ACS) são
  // média por partida jogada com aquele agente, cada métrica normalizada
  // 0-100 (min-max contra os outros agentes) e a pontuação final é a média
  // simples das 4 — sem pesar uma métrica mais que outra, decisão neutra
  // já que ninguém pediu um peso específico.
  const agentPerfEntries = [...agentPerfAgg.entries()];
  const perAgent = agentPerfEntries.map(([agent, s]) => ({
    agent,
    color: agentColors.get(agent) ?? "#9A9DA1",
    picks: s.count,
    kills: round1(s.kills / s.count),
    assists: round1(s.assists / s.count),
    firstBloods: round1(s.firstBloods / s.count),
    impact: round0(s.acsSum / s.count),
  }));
  const normalize = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return (v: number) => ((v - min) / span) * 100;
  };
  const killsNorm = normalize(perAgent.map((a) => a.kills));
  const assistsNorm = normalize(perAgent.map((a) => a.assists));
  const fbNorm = normalize(perAgent.map((a) => a.firstBloods));
  const impactNorm = normalize(perAgent.map((a) => a.impact));
  const bestAgents: EquipeAgentePerformance[] = perAgent
    .map((a) => ({ ...a, score: (killsNorm(a.kills) + assistsNorm(a.assists) + fbNorm(a.firstBloods) + impactNorm(a.impact)) / 4 }))
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...rest }) => rest);

  return {
    qualifyingMatchCount: qualifying.length,
    wins,
    losses,
    winratePercent: round0((wins / qualifying.length) * 100),
    currentStreak: current,
    bestWinStreak,
    mapWinrates,
    lineupCombos,
    bestAgentComposition,
    bestAgents,
    acsRanking,
    assistRanking,
    mvpRanking,
    clutchRanking,
    firstBloodRanking,
    firstDeathRanking,
    mostPickedAgents,
    biggestWin,
    worstLoss,
    closestMatch,
  };
}
