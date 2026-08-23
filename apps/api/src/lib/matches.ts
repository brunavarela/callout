import type { MatchDetail, MatchKill, MatchPlayerRow, MatchV4Data, RoundResult } from "@callout/shared";
import { prisma } from "./prisma.js";
import { loadAgentColorsByName } from "./assets.js";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatPlayedAt(date: Date, now: Date): string {
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return `hoje ${time}`;
  if (diffDays === 1) return `ontem ${time}`;
  if (diffDays < 7) return `${WEEKDAY_LABELS[date.getDay()]} ${time}`;
  return date.toLocaleDateString("pt-BR");
}

function formatDuration(ms: number): string {
  return `${Math.round(ms / 60_000)} min`;
}

function scoreFor(match: MatchV4Data, teamId: string): { own: number; opponent: number } {
  const own = match.teams.find((t) => t.team_id === teamId);
  const opponent = match.teams.find((t) => t.team_id !== teamId);
  return { own: own?.rounds.won ?? 0, opponent: opponent?.rounds.won ?? 0 };
}

// Clutch: o round em que o time do jogador fica reduzido a ele sozinho,
// com pelo menos um adversário ainda vivo. Simula as mortes do round em
// ordem cronológica pra achar esse momento; "ganho" se o jogador segue
// vivo no fim e o round foi ganho pelo time dele.
function computeMyStats(match: MatchV4Data, selfPuuid: string, selfTeamId: string) {
  const killsByRound = new Map<number, MatchKill[]>();
  for (const kill of match.kills) {
    const arr = killsByRound.get(kill.round) ?? [];
    arr.push(kill);
    killsByRound.set(kill.round, arr);
  }

  let firstBloods = 0;
  let plants = 0;
  let clutchesPlayed = 0;
  let clutchesWon = 0;

  for (const round of match.rounds) {
    const kills = (killsByRound.get(round.id) ?? []).slice().sort((a, b) => a.time_in_round_in_ms - b.time_in_round_in_ms);

    if (kills.length > 0 && kills[0]!.killer.puuid === selfPuuid) firstBloods++;
    if (round.plant?.player.puuid === selfPuuid) plants++;

    const selfTeamAlive = new Set(match.players.filter((p) => p.team_id === selfTeamId).map((p) => p.puuid));
    const enemyTeamAlive = new Set(match.players.filter((p) => p.team_id !== selfTeamId).map((p) => p.puuid));
    let inClutch = false;
    let selfAlive = true;
    for (const kill of kills) {
      selfTeamAlive.delete(kill.victim.puuid);
      enemyTeamAlive.delete(kill.victim.puuid);
      if (kill.victim.puuid === selfPuuid) selfAlive = false;
      if (!inClutch && selfAlive && selfTeamAlive.size === 1 && selfTeamAlive.has(selfPuuid) && enemyTeamAlive.size >= 1) {
        inClutch = true;
      }
    }
    if (inClutch) {
      clutchesPlayed++;
      if (selfAlive && round.winning_team === selfTeamId) clutchesWon++;
    }
  }

  return { firstBloods, plants, clutchesPlayed, clutchesWon };
}

export async function buildMatchDetail(matchId: string, selfPuuid: string): Promise<MatchDetail | null> {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { players: true } });
  if (!match) return null;

  const selfRow = match.players.find((p) => p.puuid === selfPuuid);
  if (!selfRow) return null;

  const raw = match.rawJson as unknown as MatchV4Data;
  const now = new Date();

  const rounds: RoundResult[] = raw.rounds.map((r) => ({ number: r.id, wonBySelf: r.winning_team === selfRow.teamId }));

  const agentColors = await loadAgentColorsByName();
  const toRow = (p: (typeof match.players)[number]): MatchPlayerRow => ({
    puuid: p.puuid,
    name: p.name,
    tag: p.tag,
    side: p.teamId === selfRow.teamId ? "own" : "opponent",
    isSelf: p.puuid === selfPuuid,
    agent: p.agentName,
    agentColor: agentColors.get(p.agentName) ?? "#9A9DA1",
    acs: p.acs,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    hsPercent: p.headshots + p.bodyshots + p.legshots > 0 ? Math.round((p.headshots / (p.headshots + p.bodyshots + p.legshots)) * 100) : 0,
  });

  const own = match.players.filter((p) => p.teamId === selfRow.teamId).map(toRow).sort((a, b) => b.acs - a.acs);
  const opponents = match.players.filter((p) => p.teamId !== selfRow.teamId).map(toRow).sort((a, b) => b.acs - a.acs);

  const extra = computeMyStats(raw, selfPuuid, selfRow.teamId);

  return {
    id: match.id,
    mode: raw.metadata.queue.name ?? "Partida",
    map: raw.metadata.map.name,
    playedAtLabel: formatPlayedAt(match.startedAt, now),
    durationLabel: formatDuration(match.durationMs),
    score: scoreFor(raw, selfRow.teamId),
    rounds,
    players: [...own, ...opponents],
    myStats: {
      acs: selfRow.acs,
      kda: selfRow.deaths > 0 ? Math.round(((selfRow.kills + selfRow.assists) / selfRow.deaths) * 100) / 100 : selfRow.kills + selfRow.assists,
      adr: selfRow.roundsPlayed > 0 ? Math.round(selfRow.damageDealt / selfRow.roundsPlayed) : 0,
      ...extra,
    },
  };
}
