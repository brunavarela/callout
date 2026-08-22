import { ZodError } from "zod";
import type { MatchV4Data, SyncStatus } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMatchlist, HenrikDevError } from "./henrikdev.js";
import { ensureMapAsset } from "./strategy.js";

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

export async function syncUserMatches(userId: string, puuid: string, region: string) {
  progressByUser.set(userId, { state: "syncing", progress: { done: 0, total: 0 } });

  try {
    const matches = await getMatchlist(region, puuid);
    progressByUser.set(userId, { state: "syncing", progress: { done: 0, total: matches.length } });

    for (let i = 0; i < matches.length; i++) {
      await persistMatchIfNew(matches[i]!);
      progressByUser.set(userId, { state: "syncing", progress: { done: i + 1, total: matches.length } });
    }

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

// Partida antiga nunca muda — buscou uma vez, persistiu, nunca mais reprocessa
// esse match_id (CONTEXT.md §8).
async function persistMatchIfNew(match: MatchV4Data) {
  const exists = await prisma.match.findUnique({ where: { id: match.metadata.match_id } });
  if (exists) return;

  const roundCount = match.rounds.length || 1;
  const map = await ensureMapAsset(match.metadata.map.name);

  await prisma.match.create({
    data: {
      id: match.metadata.match_id,
      mapId: map.id,
      modo: match.metadata.queue.name ?? match.metadata.queue.id,
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
            acs: Math.round(p.stats.score / roundCount),
            kills: p.stats.kills,
            deaths: p.stats.deaths,
            assists: p.stats.assists,
            headshots: p.stats.headshots,
            bodyshots: p.stats.bodyshots,
            legshots: p.stats.legshots,
            damageDealt: p.stats.damage.dealt,
            damageReceived: p.stats.damage.received,
          };
        }),
      },
    },
  });
}
