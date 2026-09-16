import { ZodError } from "zod";
import type { MatchV4Data, SyncStatus } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMatchlist, getMmrHistory, HenrikDevError } from "./henrikdev.js";
import { ensureMapAsset } from "./strategy.js";
import { countsTowardStats } from "./match-result.js";
import { replayMatchStats } from "./matchReplay.js";
import { computeMatchSides } from "./insights.js";

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
    // Pagina pra trás (start=0, start=<recebidas até agora>, ...) até achar
    // uma página onde TODAS as partidas já existem no banco (sinal de que
    // alcançamos o que já tinha sido sincronizado antes) ou até um teto de
    // segurança. Sem isso, a HenrikDev só devolve as mais recentes de
    // qualquer jeito (sem `start` ela nunca "anda" pro passado) — então se
    // a pessoa jogar muitas partidas (de qualquer modo) sem abrir o app
    // entre uma sincronização e outra, as mais antigas desse intervalo
    // ficavam pra sempre fora do alcance, sem essa paginação.
    //
    // O `start` avança por `matches.length` (quantas vieram DE VERDADE),
    // não por um tamanho de página fixo — a API às vezes devolve bem menos
    // que o `size` pedido (visto na prática: pedindo 30, vêm só ~10), e
    // avançar por um valor fixo nesse caso pularia registros no meio.
    const PAGE_REQUEST_SIZE = 30;
    // Teto de segurança -- a HenrikDev tem rate limit apertado por chave
    // (CONTEXT.md §5.2), poucas páginas por sync evita estourar.
    const MAX_PAGES = 3;
    const matches: MatchV4Data[] = [];
    for (let i = 0; i < MAX_PAGES; i++) {
      let batch: MatchV4Data[];
      try {
        batch = await getMatchlist(region, puuid, matches.length, PAGE_REQUEST_SIZE);
      } catch (err) {
        // Rate limit no meio da paginação (só a 1ª página é essencial pro
        // sync normal) -- usa o que já foi coletado em vez de falhar tudo.
        if (err instanceof HenrikDevError && err.status === 429) break;
        throw err;
      }
      if (batch.length === 0) break;
      matches.push(...batch);
      // A 1ª página (mais recente) está sempre 100% sincronizada em uso
      // normal (é o que todo sync anterior já cobriu) -- um gap de verdade
      // fica no MEIO do histórico, não no topo. Por isso só passa a
      // considerar parar a partir da 2ª página em diante; parar já na 1ª
      // nunca alcançaria um gap que começa depois dela.
      if (i > 0) {
        const existingInBatch = await prisma.match.count({ where: { id: { in: batch.map((m) => m.metadata.match_id) } } });
        if (existingInBatch === batch.length) break; // página inteira já sincronizada — sem mais gap
      }
    }
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
    // recentes da conta — depois disso o RR (e o tier de então) some da API
    // pra sempre. Por isso capturamos aqui, no momento do sync (quando a
    // partida ainda tá bem dentro da janela), em vez de buscar sob demanda
    // depois. `tier.id` é o elo que a pessoa estava NESSA partida — usado
    // pro ícone de elo na lista de partidas (ver RankTierAsset). Busca
    // sempre (não só quando há partida nova) porque também serve pra
    // corrigir abaixo partidas já existentes que ficaram com rr/rankTierId
    // null (ver comentário mais abaixo).
    const rrByMatchId = new Map<string, number>();
    const rankTierByMatchId = new Map<string, number>();
    let mmrHistory: Awaited<ReturnType<typeof getMmrHistory>> = [];
    // Dado de segurança temporário (até migrar pra API oficial da Riot): 1
    // retry antes de desistir (falha isolada não deve perder rr/rankTierId
    // da rodada inteira), e se mesmo assim falhar, cai pro último
    // mmr-history que funcionou (cacheado em User na vez anterior que essa
    // chamada teve sucesso) em vez de deixar tudo null.
    try {
      try {
        mmrHistory = await getMmrHistory(region, puuid);
      } catch {
        mmrHistory = await getMmrHistory(region, puuid);
      }
      for (const h of mmrHistory) {
        rrByMatchId.set(h.match_id, h.last_change);
        rankTierByMatchId.set(h.match_id, h.tier.id);
      }
      await prisma.user.update({
        where: { id: userId },
        data: { lastMmrHistoryJson: mmrHistory as unknown as object, lastMmrHistoryAt: new Date() },
      });
    } catch {
      // getMmrHistory falhou (mesmo com retry) — usa o cache da última vez
      // que funcionou, se tiver, pra ainda corrigir/preencher rr/rankTierId
      // das partidas que continuam dentro da janela.
      const cached = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastMmrHistoryJson: true },
      });
      if (cached?.lastMmrHistoryJson) {
        mmrHistory = cached.lastMmrHistoryJson as unknown as typeof mmrHistory;
        for (const h of mmrHistory) {
          rrByMatchId.set(h.match_id, h.last_change);
          rankTierByMatchId.set(h.match_id, h.tier.id);
        }
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
        await persistMatch(
          match,
          puuid,
          rrByMatchId.get(match.metadata.match_id) ?? null,
          rankTierByMatchId.get(match.metadata.match_id) ?? null,
        );
        done++;
        progressByUser.set(userId, { state: "syncing", progress: { done, total: matches.length } });
      }
    }
    await Promise.all(Array.from({ length: Math.min(PERSIST_CONCURRENCY, newMatches.length) }, worker));

    // Corrige partidas que já existiam no banco mas ficaram com rr/
    // rankTierId null -- acontece quando, no sync em que a partida foi
    // criada, ela ainda não tinha aparecido no mmr-history (delay de
    // propagação da própria Riot/HenrikDev) ou a chamada falhou por algum
    // motivo transitório. Como esse endpoint só cobre as ~20 partidas
    // ranqueadas mais recentes, se a partida ainda está na janela agora,
    // corrige; se já saiu da janela, o rr dela ficou perdido pra sempre
    // (limitação da API, não retroativo).
    if (mmrHistory.length > 0) {
      // Mesmo teto de concorrência do worker de persistMatch acima —
      // Promise.all sem limite aqui (até 20 updates de uma vez) chegou a
      // estourar o pool de conexões do Neon (P1001) numa conta com gap
      // grande pra corrigir.
      let rrCursor = 0;
      async function rrWorker() {
        while (rrCursor < mmrHistory.length) {
          const h = mmrHistory[rrCursor++]!;
          await prisma.matchPlayer.updateMany({
            where: { matchId: h.match_id, puuid, rr: null },
            data: { rr: h.last_change, rankTierId: h.tier.id },
          });
        }
      }
      await Promise.all(Array.from({ length: Math.min(PERSIST_CONCURRENCY, mmrHistory.length) }, rrWorker));
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

async function persistMatch(match: MatchV4Data, selfPuuid: string, selfRr: number | null, selfRankTierId: number | null) {
  const roundCount = match.rounds.length;
  const modo = match.metadata.queue.name ?? match.metadata.queue.id;
  // Deathmatch (e Team Deathmatch) vem com `rounds` de 1 item cobrindo a
  // partida inteira, não zero — `roundCount || 1` nunca protegia disso.
  // `stats.score` é a pontuação total da partida, então dividir por esse
  // "round" único inflava o ACS pra milhares. countsTowardStats (mesma
  // allowlist usada em dashboard.ts/equipe.ts) evita gravar esse número sem
  // sentido já na sincronização — só Competitivo/Sem classificação/Premier
  // ganham ACS de verdade, o resto fica 0.
  const map = await ensureMapAsset(match.metadata.map.name);

  // Calculado uma vez aqui (não em toda carga do dashboard depois) — ver
  // MatchPlayer.weaponKills/multiKills/clutches no schema. clutchesWonBySize
  // vira a coluna `clutches` (mesmo formato, só nome mais curto no banco).
  const replay = replayMatchStats(match);

  // Ataque/defesa (mesmo cálculo de computeMatchSides em insights.ts) — só
  // depende do time, não do jogador, então calcula uma vez por time e
  // reusa pros jogadores desse time.
  const teamIds = [...new Set(match.players.map((p) => p.team_id))];
  const sidesByTeam = new Map(teamIds.map((teamId) => [teamId, computeMatchSides(match, teamId)]));

  await prisma.match.create({
    data: {
      id: match.metadata.match_id,
      mapId: map.id,
      modo,
      startedAt: new Date(match.metadata.started_at),
      durationMs: match.metadata.game_length_in_ms,
      rawJson: match as unknown as object,
      seasonId: match.metadata.season.id,
      seasonShort: match.metadata.season.short,
      players: {
        create: match.players.map((p) => {
          const team = match.teams.find((t) => t.team_id === p.team_id);
          const playerReplay = replay.get(p.puuid);
          const sides = sidesByTeam.get(p.team_id);
          const sidesRounds = sides
            ? {
                atkWins: sides.attack[0],
                atkTotal: sides.attack[1],
                defWins: sides.defense[0],
                defTotal: sides.defense[1],
                otWins: sides.overtime[0],
                otTotal: sides.overtime[1],
              }
            : {};
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
            rankTierId: p.puuid === selfPuuid ? selfRankTierId : null,
            accountLevel: p.account_level,
            weaponKills: playerReplay?.weaponKills ?? {},
            weaponAccuracy: playerReplay?.weaponAccuracy ?? {},
            multiKills: playerReplay?.multiKills ?? {},
            clutches: playerReplay?.clutchesWonBySize ?? {},
            firstBloods: playerReplay?.firstBloods ?? 0,
            plants: playerReplay?.plants ?? 0,
            sidesRounds,
          };
        }),
      },
    },
  });
}
