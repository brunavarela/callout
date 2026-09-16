import type { SimulacaoBasis, SimulacaoJogador, SimulacaoResult } from "@callout/shared";
import { prisma } from "./prisma.js";
import { ROLE_LABELS } from "./seasonOverview.js";
import { resolveDisplayName, resolveAvatarUrl } from "./dto.js";

// Diferente do resto do app (que mistura Competitivo/Sem classificação/
// Premier pras estatísticas gerais, ver STATS_MODES_LIST), a simulação usa
// SÓ Competitivo -- pedido explícito, é o modo que reflete melhor o nível
// de jogo "de verdade" pra decidir composição.
const SIMULACAO_MODO = "Competitive";

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
  // Só modos com estatística de verdade (mesma allowlist do resto do app) --
  // Deathmatch/Spike Rush etc não são 5x5 "de verdade" (ACS nem é calculado
  // neles, ver countsTowardStats) e não deveriam entrar na comparação.
  const groupRows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: puuids }, match: { mapId, modo: SIMULACAO_MODO } },
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
  // Mesmo filtro de modo do groupRows acima.
  const lifetimeRows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: puuids }, match: { mapId, modo: SIMULACAO_MODO } },
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

  function lifetimeRanked(puuid: string, minGames = MIN_AGENT_GAMES): AgentStat[] {
    const byAgent = lifetimeByPuuid.get(puuid) ?? new Map();
    return [...byAgent.entries()]
      .filter(([, s]) => s.games >= minGames)
      .map(([agent, s]) => ({ agent, kda: kdaFromSums(s.kills, s.deaths, s.assists), games: s.games }))
      .sort((a, b) => b.kda - a.kda);
  }
  function lifetimeStat(puuid: string, agent: string): AgentStat | null {
    const s = lifetimeByPuuid.get(puuid)?.get(agent);
    return s ? { agent, kda: kdaFromSums(s.kills, s.deaths, s.assists), games: s.games } : null;
  }
  // Sempre sugere algo, mesmo sem bater o piso de MIN_AGENT_GAMES -- cai pro
  // agente com mais dado que ela tiver nesse mapa (mesmo 1 partida só) em
  // vez de deixar sem sugestão nenhuma. `games` no resultado continua
  // mostrando quantas partidas embasam aquilo, pra dar noção de confiança.
  function bestAvailable(puuid: string): AgentStat[] {
    const eligible = lifetimeRanked(puuid);
    return eligible.length > 0 ? eligible : lifetimeRanked(puuid, 1);
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
      const ranked = bestAvailable(puuid);
      const pick = ranked[0] ?? null;
      const lowSample = pick && pick.games < MIN_AGENT_GAMES;
      return {
        userId: m.userId,
        name,
        avatarUrl,
        currentAgent: null,
        // Sem partida de equipe pra comparar, usa o próprio KDA do melhor
        // agente dela como prioridade na resolução de conflito abaixo --
        // sem isso, todo mundo empataria em 0 e a ordem viraria arbitrária.
        kda: pick?.kda ?? 0,
        candidates: pick ? ranked : [],
        initialReason: pick
          ? `Esse grupo ainda não jogou ${map.nome} junto — sugestão baseada no histórico geral dela: KDA ${pick.kda} de ${pick.agent} (${pick.games} ${pick.games === 1 ? 'partida' : 'partidas'} nesse mapa${lowSample ? ', amostra pequena' : ''}).`
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
      const lifetimePool = bestAvailable(puuid);
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
        candidates: [{ agent: currentAgent, kda: actualKda, games: basisRowsForCurrent.length }, ...bestAvailable(puuid).filter((c) => c.agent !== currentAgent)],
        initialReason: null,
      };
    }
    const alternatives = bestAvailable(puuid).filter((c) => c.agent !== currentAgent);
    const best = alternatives[0] ?? null;
    if (!best) {
      // Ela só jogou esse mapa com o próprio agente atual (nenhum outro,
      // nem com amostra pequena) -- mantém, mesmo vetado, por falta de
      // qualquer alternativa.
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
    const reason = `Em ${map.nome}, o KDA dela nesse grupo foi ${actualKda} de ${currentAgent} — abaixo da própria média histórica com esse agente (${historicalAvg}). Com ${best.agent} ela tem KDA médio ${best.kda} nesse mapa (${best.games} ${best.games === 1 ? 'partida' : 'partidas'}${best.games < MIN_AGENT_GAMES ? ', amostra pequena' : ''}).`;
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

  // Quem não tem candidato nenhum (nunca bateu MIN_AGENT_GAMES com agente
  // nenhum nesse mapa) fica de fora da resolução de conflito/tipo -- não dá
  // pra validar composição de 5 quando uma das pontas nem tem sugestão.
  const withData = drafts.filter((d) => d.candidates.length > 0);
  const withoutData = drafts.filter((d) => d.candidates.length === 0);

  // Resolve conflito de agente repetido + tenta encaixar num dos 3 tipos de
  // composição, sempre priorizando quem tem o PIOR KDA nessa simulação (ele
  // trava seu agente de melhor KDA primeiro; quem vem depois cai pro
  // próximo da própria lista se o de cima já foi levado).
  const order = [...withData].sort((a, b) => a.kda - b.kda);

  // Tenta os 3 tipos válidos (sem prioridade entre eles, ver conversa de
  // design) e escolhe o que fecha com MENOS gente precisando sair da
  // própria 1ª escolha -- sem isso, o primeiro tipo que coubesse "vencia"
  // mesmo quando outro tipo permitiria todo mundo ficar com o próprio
  // agente ideal (ex.: 2 duelistas de primeira escolha cabem no tipo
  // 2D/1I/1C/1S, mas não no 1D/1I/1C/2S -- tentar só o primeiro forçaria
  // uma troca desnecessária).
  function attempt(roleCap: Record<string, number>): { assignment: Map<string, string>; cost: number } | null {
    const roleUsed: Record<string, number> = { Duelista: 0, Iniciador: 0, Controlador: 0, Sentinela: 0 };
    const usedAgents = new Set<string>();
    const assignment = new Map<string, string>();
    let cost = 0;
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
      if (!picked) return null;
      if (picked !== d.candidates[0]?.agent) cost++;
      assignment.set(d.userId, picked);
    }
    return { assignment, cost };
  }

  let finalAssignment: Map<string, string> | null = null;
  let usedTemplateIndex = -1;
  let bestCost = Infinity;
  for (let t = 0; t < COMPOSITION_TEMPLATES.length; t++) {
    const result = attempt(COMPOSITION_TEMPLATES[t]!);
    if (result && result.cost < bestCost) {
      finalAssignment = result.assignment;
      usedTemplateIndex = t;
      bestCost = result.cost;
      if (bestCost === 0) break; // já achou um tipo sem trocar ninguém -- não tem como melhorar
    }
  }
  // NO_TEMPLATE sempre aceita quando todo mundo (em `withData`) tem pelo
  // menos 1 candidato ainda livre -- só usado quando nenhum dos 3 tipos
  // coube. Mesmo esse pode falhar (ex.: duas pessoas só têm o mesmo único
  // agente disponível nesse mapa) -- nesse caso NUNCA cai pra um fallback
  // que ignore duplicata (agente repetido não é permitido de jeito nenhum,
  // ver regra do jogo): resolve o máximo possível respeitando "sem
  // repetir", e quem não sobrar opção nenhuma fica sem sugestão (null) em
  // vez de colidir com o agente de outra pessoa.
  if (!finalAssignment && withData.length > 0) {
    const fallback = attempt(NO_TEMPLATE);
    if (fallback) {
      finalAssignment = fallback.assignment;
    } else {
      const usedAgents = new Set<string>();
      const assignment = new Map<string, string>();
      for (const d of order) {
        const pick = d.candidates.find((c) => !usedAgents.has(c.agent));
        if (pick) {
          usedAgents.add(pick.agent);
          assignment.set(d.userId, pick.agent);
        }
      }
      finalAssignment = assignment;
    }
  }

  const players: SimulacaoJogador[] = drafts.map((d) => {
    if (d.candidates.length === 0 || !finalAssignment!.has(d.userId)) {
      // Sem NENHUM agente com >=MIN_AGENT_GAMES nesse mapa (solo+equipe) --
      // não tem base nenhuma pra sugerir nada pra ela ainda.
      return {
        userId: d.userId,
        name: d.name,
        avatarUrl: d.avatarUrl,
        currentAgent: d.currentAgent,
        recommendedAgent: null,
        role: null,
        kda: d.kda,
        changed: false,
        reason:
          d.candidates.length === 0
            ? `${d.name} ainda não jogou nenhuma partida em ${map.nome} (contando solo e em equipe) — sem dado nenhum pra sugerir um agente pra ela ainda.`
            : `Todos os agentes elegíveis de ${d.name} nesse mapa já tinham sido escolhidos por outras pessoas com prioridade maior — sem opção sobrando pra ela dessa vez.`,
      };
    }
    const finalAgent = finalAssignment!.get(d.userId)!;
    const changed = d.currentAgent !== null && finalAgent !== d.currentAgent;
    // Se a resolução de conflito empurrou alguém pra uma opção diferente da
    // 1ª escolha dela (agente ideal já levado por quem tinha prioridade), a
    // justificativa original não bate mais com o agente final -- troca por
    // um texto genérico. Vale tanto pra quem tinha motivo pra trocar quanto
    // pra "sem_dados" (onde `changed` fica sempre false, mas o agente final
    // ainda pode ter sido reatribuído pelo conflito).
    const bumpedByConflict = finalAgent !== d.candidates[0]?.agent;
    const reason = bumpedByConflict
      ? `O agente ideal pra ${d.name} nesse mapa já tinha sido escolhido por outra pessoa — fica com ${finalAgent} (KDA médio ${d.candidates.find((c) => c.agent === finalAgent)?.kda ?? "—"}).`
      : changed || d.currentAgent === null
        ? d.initialReason
        : null;
    return {
      userId: d.userId,
      name: d.name,
      avatarUrl: d.avatarUrl,
      currentAgent: d.currentAgent,
      recommendedAgent: finalAgent,
      role: roleByAgent.get(finalAgent) ?? null,
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
    compositionValid: withoutData.length === 0 && usedTemplateIndex >= 0,
    players,
  };
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
