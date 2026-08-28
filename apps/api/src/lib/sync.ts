import { ZodError } from "zod";
import type { MatchV4Data, SyncStatus } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMatchlist, getMmrHistory, HenrikDevError } from "./henrikdev.js";
import { ensureMapAsset } from "./strategy.js";
import { countsTowardStats } from "./match-result.js";

function describeSyncFailure(err: unknown): string {
  if (err instanceof ZodError) return "A HenrikDev devolveu um formato de dado inesperado.";
  if (err instanceof HenrikDevError) return err.message;
  if (err instanceof Error) return err.message;
  return "erro desconhecido";
}

// Estado em memória, por processo — suficiente pro tamanho do grupo (<10
// usuários, um único processo de API). Se algum dia precisar sobreviver a
// restart ou rodar em mais de um processo, isso vira uma tabela.
const progressByUser = new Map<string, SyncStatus>();

export function getSyncProgress(userId: string): SyncStatus {
  return progressByUser.get(userId) ?? { state: "idle" };
}

// A sincronização agora dispara sozinha a cada abertura do app (não só no
// clique manual) — sem isso, um F5 rápido bateria na HenrikDev de novo sem
// necessidade (é API não-oficial, com rate limit por chave — CONTEXT.md §5.2).
const SYNC_COOLDOWN_MS = 60_000;

export function recentlySynced(userId: string): boolean {
  const lastSuccessAt = progressByUser.get(userId)?.lastSuccessAt;
  if (!lastSuccessAt) return false;
  return Date.now() - new Date(lastSuccessAt).getTime() < SYNC_COOLDOWN_MS;
}

export async function syncUserMatches(userId: string, puuid: string, region: string) {
  progressByUser.set(userId, { state: "syncing", progress: { done: 0, total: 0 } });

  try {
    const matches = await getMatchlist(region, puuid);
    progressByUser.set(userId, { state: "syncing", progress: { done: 0, total: matches.length } });

    // Um findMany só pra ver quais dos 30 já existem, em vez de um
    // findUnique sequencial por partida — no caso comum (sync roda de novo
    // pouco depois, quase tudo já sincronizado) isso troca ~30 idas ao
    // banco em série por 1. Partida antiga nunca muda (CONTEXT.md §8), só
    // as que sobram (novas) precisam ser persistidas, e em paralelo — a
    // corrida em ensureMapAsset() já é segura (ver Fase 0 do PROGRESS.md).
    const existingIds = new Set(
      (
        await prisma.match.findMany({
          where: { id: { in: matches.map((m) => m.metadata.match_id) } },
          select: { id: true },
        })
      ).map((m) => m.id),
    );
    const newMatches = matches.filter((m) => !existingIds.has(m.metadata.match_id));

    let done = matches.length - newMatches.length;
    progressByUser.set(userId, { state: "syncing", progress: { done, total: matches.length } });

    // O endpoint mmr-history só cobre as ~20 partidas ranqueadas mais
    // recentes da conta — depois disso o RR some da API pra sempre. Por
    // isso capturamos aqui, no momento do sync (quando a partida ainda tá
    // bem dentro da janela), em vez de buscar sob demanda depois.
    const rrByMatchId = new Map<string, number>();
    if (newMatches.length > 0) {
      try {
        const history = await getMmrHistory(region, puuid);
        for (const h of history) rrByMatchId.set(h.match_id, h.last_change);
      } catch {
        // sem histórico de RR agora — as partidas novas ficam com rr null
      }
    }

    // Paralelo, mas com teto — Promise.all sem limite chegou a abrir uma
    // query por partida nova de uma vez (findFirst/create de ensureMapAsset
    // + o create da partida, cada uma pegando uma conexão), estourando o
    // pool do Prisma/Neon (P2024) quando o backlog de novas era grande
    // (ex.: primeiro sync depois do auto-sync). Um puuid só tem uma
    // partida nova por vez de verdade, então nem perde a vantagem do
    // paralelismo no caso comum — só protege o caso de backlog grande.
    const PERSIST_CONCURRENCY = 4;
    let cursor = 0;
    async function worker() {
      while (cursor < newMatches.length) {
        const match = newMatches[cursor++]!;
        await persistMatch(match, puuid, rrByMatchId.get(match.metadata.match_id) ?? null);
        done++;
        progressByUser.set(userId, { state: "syncing", progress: { done, total: matches.length } });
      }
    }
    await Promise.all(Array.from({ length: Math.min(PERSIST_CONCURRENCY, newMatches.length) }, worker));

    progressByUser.set(userId, {
      state: "idle",
      progress: { done: matches.length, total: matches.length },
      lastSuccessAt: new Date().toISOString(),
    });
  } catch (err) {
    progressByUser.set(userId, {
      state: "failed",
      reason: describeSyncFailure(err),
    });
    throw err;
  }
}

async function persistMatch(match: MatchV4Data, selfPuuid: string, selfRr: number | null) {
  const roundCount = match.rounds.length;
  const modo = match.metadata.queue.name ?? match.metadata.queue.id;
  // Deathmatch (e Team Deathmatch) vem com `rounds` de 1 item cobrindo a
  // partida inteira, não zero — `roundCount || 1` nunca protegia disso.
  // `stats.score` é a pontuação total da partida, então dividir por esse
  // "round" único inflava o ACS pra milhares. countsTowardStats (mesma
  // allowlist usada em dashboard.ts/team.ts) evita gravar esse número sem
  // sentido já na sincronização — só Competitivo/Sem classificação/Premier
  // ganham ACS de verdade, o resto fica 0.
  const map = await ensureMapAsset(match.metadata.map.name);

  await prisma.match.create({
    data: {
      id: match.metadata.match_id,
      mapId: map.id,
      modo,
      startedAt: new Date(match.metadata.started_at),
      durationMs: match.metadata.game_length_in_ms,
      rawJson: match as unknown as object,
      players: {
        create: match.players.map((p) => {
          const team = match.teams.find((t) => t.team_id === p.team_id);
          return {
            puuid: p.puuid,
            teamId: p.team_id,
            won: team?.won ?? false,
            agentUuid: p.agent.id,
            agentName: p.agent.name,
            name: p.name,
            tag: p.tag,
            roundsPlayed: roundCount,
            acs: roundCount > 0 && countsTowardStats(modo) ? Math.round(p.stats.score / roundCount) : 0,
            kills: p.stats.kills,
            deaths: p.stats.deaths,
            assists: p.stats.assists,
            headshots: p.stats.headshots,
            bodyshots: p.stats.bodyshots,
            legshots: p.stats.legshots,
            damageDealt: p.stats.damage.dealt,
            damageReceived: p.stats.damage.received,
            rr: p.puuid === selfPuuid ? selfRr : null,
          };
        }),
      },
    },
  });
}
