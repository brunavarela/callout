import { prisma } from "../lib/prisma.js";
import { seedAgents, seedMaps } from "../lib/assets.js";

async function main() {
  console.log("Buscando mapas na valorant-api.com…");
  for (const line of await seedMaps()) console.log(`  ${line}`);

  console.log("Buscando agentes na valorant-api.com…");
  for (const line of await seedAgents()) console.log(`  ${line}`);

  console.log("Seed concluído.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
