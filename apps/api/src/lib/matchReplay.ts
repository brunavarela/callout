import type { MatchKill, MatchV4Data } from "@callout/shared";

export interface PlayerMatchReplayStats {
  puuid: string;
  teamId: string;
  firstBloods: number;
  firstDeaths: number;
  plants: number;
  clutchesPlayed: number;
  clutchesWon: number;
}

// Clutch: o round em que o time do jogador fica reduzido a ele sozinho, com
// pelo menos um adversário ainda vivo. Simula as mortes do round em ordem
// cronológica pra achar esse momento; "ganho" se o jogador segue vivo no
// fim e o round foi ganho pelo time dele.
//
// Generalizado (era só pra um `selfPuuid` fixo, em matches.ts) pra devolver
// o resultado de todo mundo na partida numa passada só — usado tanto pelo
// detalhe de uma partida (um jogador) quanto pelo painel do time (agregado
// de várias partidas, todo mundo rastreado de uma vez). Uma implementação
// só evita o painel de time e o detalhe de partida divergirem silenciosamente
// no mesmo cálculo.
export function replayMatchStats(match: MatchV4Data): Map<string, PlayerMatchReplayStats> {
  const killsByRound = new Map<number, MatchKill[]>();
  for (const kill of match.kills) {
    const arr = killsByRound.get(kill.round) ?? [];
    arr.push(kill);
    killsByRound.set(kill.round, arr);
  }

  const stats = new Map<string, PlayerMatchReplayStats>();
  for (const p of match.players) {
    stats.set(p.puuid, { puuid: p.puuid, teamId: p.team_id, firstBloods: 0, firstDeaths: 0, plants: 0, clutchesPlayed: 0, clutchesWon: 0 });
  }

  const teamIds = [...new Set(match.players.map((p) => p.team_id))];

  for (const round of match.rounds) {
    const kills = (killsByRound.get(round.id) ?? []).slice().sort((a, b) => a.time_in_round_in_ms - b.time_in_round_in_ms);

    if (kills.length > 0) {
      const killer = stats.get(kills[0]!.killer.puuid);
      if (killer) killer.firstBloods++;
      const victim = stats.get(kills[0]!.victim.puuid);
      if (victim) victim.firstDeaths++;
    }
    if (round.plant) {
      const planter = stats.get(round.plant.player.puuid);
      if (planter) planter.plants++;
    }

    const aliveByTeam = new Map<string, Set<string>>(
      teamIds.map((teamId) => [teamId, new Set(match.players.filter((p) => p.team_id === teamId).map((p) => p.puuid))]),
    );
    // Marca o(a) sobrevivente só na primeira vez que o time dele cai pra 1
    // com o adversário ainda vivo — não "descongela" se mais gente morrer
    // depois, igual o original.
    const clutchSurvivorByTeam = new Map<string, string>();

    for (const kill of kills) {
      for (const alive of aliveByTeam.values()) alive.delete(kill.victim.puuid);

      for (const teamId of teamIds) {
        if (clutchSurvivorByTeam.has(teamId)) continue;
        const teamAlive = aliveByTeam.get(teamId)!;
        const enemyAlive = [...aliveByTeam.entries()].filter(([id]) => id !== teamId).reduce((sum, [, set]) => sum + set.size, 0);
        if (teamAlive.size === 1 && enemyAlive >= 1) {
          clutchSurvivorByTeam.set(teamId, [...teamAlive][0]!);
        }
      }
    }

    for (const [teamId, puuid] of clutchSurvivorByTeam) {
      const entry = stats.get(puuid);
      if (!entry) continue;
      entry.clutchesPlayed++;
      if (aliveByTeam.get(teamId)!.has(puuid) && round.winning_team === teamId) entry.clutchesWon++;
    }
  }

  return stats;
}
