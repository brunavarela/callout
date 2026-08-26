import type { MatchDetail, MatchPlayerRow, MatchV4Data, RoundResult } from "@callout/shared";
import { prisma } from "./prisma.js";
import { loadAgentColorsByName } from "./assets.js";
import { replayMatchStats } from "./matchReplay.js";

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

  const replay = replayMatchStats(raw).get(selfPuuid);
  const extra = replay
    ? { firstBloods: replay.firstBloods, plants: replay.plants, clutchesPlayed: replay.clutchesPlayed, clutchesWon: replay.clutchesWon }
    : { firstBloods: 0, plants: 0, clutchesPlayed: 0, clutchesWon: 0 };

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
