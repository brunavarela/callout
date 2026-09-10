// Preenche seasonId/seasonShort (Match) e accountLevel/weaponKills/
// multiKills/clutches (MatchPlayer) das partidas sincronizadas antes
// desses campos existirem. Tudo já está no rawJson que cada partida já
// tinha salvo — não bate na HenrikDev de novo, só reprocessa dado que já
// temos. Roda em lotes pequenos (BATCH_SIZE) e busca só id+rawJson por vez
// (não a tabela inteira de uma vez) — mesmo cuidado de memória do resto do
// projeto, ver MAX_EQUIPE_MATCHES em packages/shared/src/domain.ts.
// Idempotente — só pega partidas com `seasonId: null`.
import type { MatchV4Data } from "@callout/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { replayMatchStats } from "../lib/matchReplay.js";
import { computeMatchSides } from "../lib/insights.js";

const BATCH_SIZE = 25;

async function main() {
  let processed = 0;

  for (;;) {
    const matches = await prisma.match.findMany({
      where: { OR: [{ seasonId: null }, { players: { some: { sidesRounds: { equals: Prisma.DbNull } } } }] },
      select: { id: true, rawJson: true },
      take: BATCH_SIZE,
    });
    if (matches.length === 0) break;

    for (const match of matches) {
      const raw = match.rawJson as unknown as MatchV4Data;
      const replay = replayMatchStats(raw);
      const teamIds = [...new Set(raw.players.map((p) => p.team_id))];
      const sidesByTeam = new Map(teamIds.map((teamId) => [teamId, computeMatchSides(raw, teamId)]));

      await prisma.match.update({
        where: { id: match.id },
        data: { seasonId: raw.metadata.season.id, seasonShort: raw.metadata.season.short },
      });

      for (const p of raw.players) {
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
        await prisma.matchPlayer.updateMany({
          where: { matchId: match.id, puuid: p.puuid },
          data: {
            accountLevel: p.account_level,
            weaponKills: playerReplay?.weaponKills ?? {},
            multiKills: playerReplay?.multiKills ?? {},
            clutches: playerReplay?.clutchesWonBySize ?? {},
            firstBloods: playerReplay?.firstBloods ?? 0,
            plants: playerReplay?.plants ?? 0,
            sidesRounds,
          },
        });
      }

      processed++;
      console.log(`  ${match.id}: ${raw.metadata.season.short}`);
    }
  }

  console.log(`Backfill concluído — ${processed} partida(s) processada(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
