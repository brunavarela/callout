// Antes desse script, `Match.mapId` nunca foi preenchido pelo sync (ver
// PROGRESS.md, débitos técnicos). Rode uma vez pra ligar as partidas já
// sincronizadas ao MapAsset correto, resolvido pelo nome dentro do
// `rawJson`. Idempotente — só toca linhas com `mapId: null`.
import type { MatchV4Data } from "@callout/shared";
import { prisma } from "../lib/prisma.js";
import { ensureMapAsset } from "../lib/strategy.js";

async function main() {
  const matches = await prisma.match.findMany({ where: { mapId: null } });
  console.log(`${matches.length} partida(s) sem mapId.`);

  for (const match of matches) {
    const raw = match.rawJson as unknown as MatchV4Data;
    const map = await ensureMapAsset(raw.metadata.map.name);
    await prisma.match.update({ where: { id: match.id }, data: { mapId: map.id } });
    console.log(`  ${match.id}: ${raw.metadata.map.name}`);
  }

  console.log("Backfill concluído.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
