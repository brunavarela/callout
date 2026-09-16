import type { SimulacaoBasis, SimulacaoJogador, SimulacaoResult } from "@callout/shared";
import { prisma } from "./prisma.js";
import { ROLE_LABELS } from "./seasonOverview.js";
import { resolveDisplayName, resolveAvatarUrl } from "./dto.js";

// Só recomenda (pra TROCAR) um agente que o jogador já tenha jogado pelo
// menos essa quantidade de vezes naquele mapa (solo + equipe somados) — sem
// isso, um pick de 1-2 partidas poderia virar recomendação por sorte.
const MIN_AGENT_GAMES = 4;

// Sem persistência (a simulação é descartável, ver conversa que definiu
// isso) — cache em memória por processo, mesmo padrão de progressByUser em
// sync.ts. Chave = equipe + mapa + os 5 jogadores exatos (ordenados, pra
// "A,B,C,D,E" e "E,D,C,B,A" caírem na mesma entrada).
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { result: SimulacaoResult; expiresAt: number }>();

function cacheKey(equipeId: string, mapId: string, userIds: string[]): string {
  return `${equipeId}:${mapId}:${[...userIds].sort().join(",")}`;
}

// As únicas 3 composições válidas (sempre 5 agentes, sem ordem de
// prioridade entre elas) — ver conversa de design. NO_TEMPLATE é o último
// recurso (só evita agente repetido, ignora a contagem por função) quando
// nenhuma das 3 é alcançável com os agentes elegíveis de cada um.
const COMPOSITION_TEMPLATES: Array<Record<string, number>> = [
  { Duelista: 1, Iniciador: 1, Controlador: 1, Sentinela: 2 },
  { Duelista: 2, Iniciador: 1, Controlador: 1, Sentinela: 1 },
  { Duelista: 1, Iniciador: 2, Controlador: 1, Sentinela: 1 },
];
const NO_TEMPLATE: Record<string, number> = { Duelista: 5, Iniciador: 5, Controlador: 5, Sentinela: 5 };

interface AgentStat {
  agent: string;
  kda: number;
  games: number;
}

function kdaFromSums(kills: number, deaths: number, assists: number): number {
  const raw = deaths > 0 ? (kills + assists) / deaths : kills + assists;
  return Math.round(raw * 100) / 100;
}

type GroupRow = { matchId: string; puuid: string; teamId: string; won: boolean; agentName: string; kills: number; deaths: number; assists: number };

export async function buildSimulacao(equipeId: string, mapId: string, userIds: string[]): Promise<SimulacaoResult | { error: string }> {
  const key = cacheKey(equipeId, mapId, userIds);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const members = await prisma.membroEquipe.findMany({ where: { equipeId, userId: { in: userIds } }, include: { user: true } });
  if (members.length !== userIds.length) return { error: "Algum jogador selecionado não é da sua equipe." };
  if (members.some((m) => !m.user.riotPuuid)) return { error: "Todo mundo selecionado precisa ter Riot ID vinculado." };

  const map = await prisma.mapAsset.findUnique({ where: { id: mapId } });
  if (!map) return { error: "Mapa inválido." };

  const puuids = members.map((m) => m.user.riotPuuid as string);

  // Partidas onde os 5 selecionados jogaram juntos, do mesmo lado, nesse
  // mapa -- como um time só tem 5 vagas, achar os 5 puuids no mesmo teamId
  // já garante que é o time inteiro (não sobra vaga pra ninguém de fora).
  const groupRows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: puuids }, match: { mapId } },
    select: { matchId: true, puuid: true, teamId: true, won: true, agentName: true, kills: true, deaths: true, assists: true },
  });
  const byMatch = new Map<string, GroupRow[]>();
  for (const r of groupRows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r);
    byMatch.set(r.matchId, list);
  }
  const qualifyingGroups = [...byMatch.values()].filter(
    (list) => list.length === puuids.length && new Set(list.map((r) => r.puuid)).size === puuids.length && new Set(list.map((r) => r.teamId)).size === 1,
  );

  const wins = qualifyingGroups.filter((g) => g[0]!.won);
  const losses = qualifyingGroups.filter((g) => !g[0]!.won);
  const basis: SimulacaoBasis = wins.length > 0 ? "vitorias" : losses.length > 0 ? "derrotas" : "sem_dados";
  const basisGroups = basis === "vitorias" ? wins : basis === "derrotas" ? losses : [];

  const basisRowsByPuuid = new Map<string, GroupRow[]>();
  for (const g of basisGroups) {
    for (const r of g) {
      const list = basisRowsByPuuid.get(r.puuid) ?? [];
      list.push(r);
      basisRowsByPuuid.set(r.puuid, list);
    }
  }

  // Histórico completo (solo + equipe, qualquer time) de cada um nesse
  // mapa, por agente -- base pra elegibilidade (>=MIN_AGENT_GAMES) e pra
  // achar "o melhor agente dela nesse mapa" fora do recorte da simulação.
  const lifetimeRows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: puuids }, match: { mapId } },
    select: { puuid: true, agentName: true, kills: true, deaths: true, assists: true },
  });
  const lifetimeByPuuid = new Map<string, Map<string, { kills: number; deaths: number; assists: number; games: number }>>();
  for (const r of lifetimeRows) {
    const byAgent = lifetimeByPuuid.get(r.puuid) ?? new Map();
    const entry = byAgent.get(r.agentName) ?? { kills: 0, deaths: 0, assists: 0, games: 0 };
    entry.kills += r.kills;
    entry.deaths += r.deaths;
    entry.assists += r.assists;
    entry.games++;
    byAgent.set(r.agentName, entry);
    lifetimeByPuuid.set(r.puuid, byAgent);
  }

  function lifetimeRanked(puuid: string): AgentStat[] {
    const byAgent = lifetimeByPuuid.get(puuid) ?? new Map();
    return [...byAgent.entries()]
      .filter(([, s]) => s.games >= MIN_AGENT_GAMES)
      .map(([agent, s]) => ({ agent, kda: kdaFromSums(s.kills, s.deaths, s.assists), games: s.games }))
      .sort((a, b) => b.kda - a.kda);
  }
  function lifetimeStat(puuid: string, agent: string): AgentStat | null {
    const s = lifetimeByPuuid.get(puuid)?.get(agent);
    return s ? { agent, kda: kdaFromSums(s.kills, s.deaths, s.assists), games: s.games } : null;
  }

  const agentAssets = await prisma.agentAsset.findMany({ select: { nome: true, funcao: true } });
  const roleByAgent = new Map(agentAssets.filter((a): a is { nome: string; funcao: string } => a.funcao !== null).map((a) => [a.nome, ROLE_LABELS[a.funcao] ?? a.funcao]));

  interface Draft {
    userId: string;
    name: string;
    avatarUrl: string | null;
    currentAgent: string | null;
    kda: number;
    // Ordem de preferência já com o pick inicial na frente -- usada pra
    // resolver conflito de agente repetido/tipo de composição abaixo.
    candidates: AgentStat[];
    initialReason: string | null;
  }

  const drafts: Draft[] = members.map((m) => {
    const puuid = m.user.riotPuuid as string;
    const name = resolveDisplayName(m.user);
    const avatarUrl = resolveAvatarUrl(m.user);
    const basisRows = basisRowsByPuuid.get(puuid) ?? [];

    if (basisRows.length === 0) {
      // "sem_dados" -- esse grupo de 5 nunca jogou esse mapa junto. Sem
      // recorte da simulação pra comparar, só sugere o histórico geral dela.
      const ranked = lifetimeRanked(puuid);
      const pick = ranked[0] ?? null;
      return {
        userId: m.userId,
        name,
        avatarUrl,
        currentAgent: null,
        kda: 0,
        candidates: pick ? ranked : [],
        initialReason: pick
          ? `Esse grupo ainda não jogou ${map.nome} junto — sugestão baseada no histórico geral dela: KDA ${pick.kda} de ${pick.agent} (${pick.games} partidas nesse mapa).`
          : null,
      };
    }

    // Agente mais jogado nas partidas-base (moda) -- é o que consideramos
    // "o agente atual dela" pra fim de comparação/justificativa.
    const countByAgent = new Map<string, number>();
    for (const r of basisRows) countByAgent.set(r.agentName, (countByAgent.get(r.agentName) ?? 0) + 1);
    const currentAgent = [...countByAgent.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const basisRowsForCurrent = basisRows.filter((r) => r.agentName === currentAgent);
    const actualKda = kdaFromSums(
      basisRowsForCurrent.reduce((s, r) => s + r.kills, 0),
      basisRowsForCurrent.reduce((s, r) => s + r.deaths, 0),
      basisRowsForCurrent.reduce((s, r) => s + r.assists, 0),
    );

    if (basis === "vitorias") {
      // Melhor agente DENTRO das vitórias desse grupo (pode variar de
      // vitória pra vitória) -- só vira recomendação de troca de verdade se
      // também bater o piso de elegibilidade (histórico >=MIN_AGENT_GAMES).
      const byAgentInWins = new Map<string, { kills: number; deaths: number; assists: number; games: number }>();
      for (const r of basisRows) {
        const e = byAgentInWins.get(r.agentName) ?? { kills: 0, deaths: 0, assists: 0, games: 0 };
        e.kills += r.kills;
        e.deaths += r.deaths;
        e.assists += r.assists;
        e.games++;
        byAgentInWins.set(r.agentName, e);
      }
      const rankedInWins = [...byAgentInWins.entries()]
        .map(([agent, s]) => ({ agent, kda: kdaFromSums(s.kills, s.deaths, s.assists), games: s.games }))
        .sort((a, b) => b.kda - a.kda);
      const lifetimePool = lifetimeRanked(puuid);
      const eligibleInWins = rankedInWins.filter((c) => c.agent === currentAgent || lifetimePool.some((l) => l.agent === c.agent));
      const best = eligibleInWins[0] ?? { agent: currentAgent, kda: actualKda, games: basisRowsForCurrent.length };
      const reason =
        best.agent !== currentAgent
          ? `Nas vitórias desse grupo em ${map.nome}, ${best.agent} rendeu KDA médio ${best.kda} pra ela, contra ${actualKda} de ${currentAgent}.`
          : null;
      return {
        userId: m.userId,
        name,
        avatarUrl,
        currentAgent,
        kda: actualKda,
        candidates: [best, ...lifetimePool.filter((c) => c.agent !== best.agent)],
        initialReason: reason,
      };
    }

    // "derrotas" -- veto pela própria média histórica com ESSE agente
    // específico nesse mapa (não pela média geral do time): mesmo sendo o
    // melhor agente dela em geral, se o desempenho em equipe ficou abaixo
    // do normal dela com ele, troca do mesmo jeito.
    const historicalForCurrent = lifetimeStat(puuid, currentAgent);
    const historicalAvg = historicalForCurrent?.kda ?? actualKda;
    if (actualKda >= historicalAvg) {
      return {
        userId: m.userId,
        name,
        avatarUrl,
        currentAgent,
        kda: actualKda,
        candidates: [{ agent: currentAgent, kda: actualKda, games: basisRowsForCurrent.length }, ...lifetimeRanked(puuid).filter((c) => c.agent !== currentAgent)],
        initialReason: null,
      };
    }
    const alternatives = lifetimeRanked(puuid).filter((c) => c.agent !== currentAgent);
    const best = alternatives[0] ?? null;
    if (!best) {
      // Ninguém mais elegível (>=MIN_AGENT_GAMES) pra sugerir -- mantém,
      // mesmo vetado, por falta de alternativa.
      return {
        userId: m.userId,
        name,
        avatarUrl,
        currentAgent,
        kda: actualKda,
        candidates: [{ agent: currentAgent, kda: actualKda, games: basisRowsForCurrent.length }],
        initialReason: null,
      };
    }
    const reason = `Em ${map.nome}, o KDA dela nesse grupo foi ${actualKda} de ${currentAgent} — abaixo da própria média histórica com esse agente (${historicalAvg}). Com ${best.agent} ela tem KDA médio ${best.kda} nesse mapa (${best.games} partidas).`;
    return {
      userId: m.userId,
      name,
      avatarUrl,
      currentAgent,
      kda: actualKda,
      candidates: [best, ...alternatives.slice(1)],
      initialReason: reason,
    };
  });

  // Resolve conflito de agente repetido + tenta encaixar num dos 3 tipos de
  // composição, sempre priorizando quem tem o PIOR KDA nessa simulação (ele
  // trava seu agente de melhor KDA primeiro; quem vem depois cai pro
  // próximo da própria lista se o de cima já foi levado).
  const order = [...drafts].sort((a, b) => a.kda - b.kda);
  const templates = [...COMPOSITION_TEMPLATES, NO_TEMPLATE];
  let finalAssignment: Map<string, string> | null = null;
  let usedTemplateIndex = -1;

  for (let t = 0; t < templates.length; t++) {
    const roleCap = templates[t]!;
    const roleUsed: Record<string, number> = { Duelista: 0, Iniciador: 0, Controlador: 0, Sentinela: 0 };
    const usedAgents = new Set<string>();
    const assignment = new Map<string, string>();
    let ok = true;
    for (const d of order) {
      let picked: string | null = null;
      for (const c of d.candidates) {
        if (usedAgents.has(c.agent)) continue;
        const role = roleByAgent.get(c.agent);
        if (!role || (roleUsed[role] ?? 0) >= (roleCap[role] ?? 0)) continue;
        picked = c.agent;
        usedAgents.add(c.agent);
        roleUsed[role] = (roleUsed[role] ?? 0) + 1;
        break;
      }
      if (!picked) {
        ok = false;
        break;
      }
      assignment.set(d.userId, picked);
    }
    if (ok) {
      finalAssignment = assignment;
      usedTemplateIndex = t;
      break;
    }
  }
  // NO_TEMPLATE sempre aceita quando todo mundo tem pelo menos 1 candidato
  // (o próprio agente atual, no pior caso) -- isso só falha se alguém não
  // tiver candidato nenhum (nunca jogou nada elegível nesse mapa).
  if (!finalAssignment) {
    finalAssignment = new Map(drafts.map((d) => [d.userId, d.candidates[0]?.agent ?? d.currentAgent ?? "—"]));
  }

  const players: SimulacaoJogador[] = drafts.map((d) => {
    const finalAgent = finalAssignment!.get(d.userId)!;
    const changed = d.currentAgent !== null && finalAgent !== d.currentAgent;
    // Se a resolução de conflito empurrou alguém pra uma opção diferente da
    // inicial (agente ideal já levado por quem tinha prioridade), a
    // justificativa original não bate mais -- troca por um texto genérico.
    const reason = changed ? (d.candidates[0]?.agent === finalAgent ? d.initialReason : `O agente ideal pra ${d.name} nesse mapa já tinha sido escolhido por outra pessoa — fica com ${finalAgent} (KDA médio ${d.candidates.find((c) => c.agent === finalAgent)?.kda ?? "—"}).`) : d.currentAgent === null ? d.initialReason : null;
    return {
      userId: d.userId,
      name: d.name,
      avatarUrl: d.avatarUrl,
      currentAgent: d.currentAgent,
      recommendedAgent: finalAgent,
      role: roleByAgent.get(finalAgent) ?? "—",
      kda: d.kda,
      changed,
      reason,
    };
  });

  const result: SimulacaoResult = {
    mapId,
    mapName: map.nome,
    basis,
    matchesConsidered: basisGroups.length,
    compositionValid: usedTemplateIndex >= 0 && usedTemplateIndex < COMPOSITION_TEMPLATES.length,
    players,
  };
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
