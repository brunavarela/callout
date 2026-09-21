import type { User } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getAccountByRiotId } from "./henrikdev.js";
import { syncUserMatches, recentlySynced } from "./sync.js";

// Resolve o alvo de uma busca livre no painel individual ("espiar qualquer
// jogador" — decisão de produto de 21/09/2026, ver LAUNCH.md/memória do
// projeto). Diferente do vínculo de conta em auth.ts, aqui não existe
// login/senha: se o RiotID pesquisado nunca teve conta no callout, cria uma
// linha "fantasma" de User (só riotPuuid/riotName/riotTag/riotRegion, sem
// email/senha) só pra reaproveitar toda a infra de sync/dashboard que já
// existe pra usuário de verdade — buildDashboardSummary, buildSeasonOverview
// etc. são todos indexados por userId+puuid.
export async function resolveOrCreateSearchTarget(riotName: string, riotTag: string): Promise<User> {
  let target = await prisma.user.findFirst({
    where: { riotName: { equals: riotName, mode: "insensitive" }, riotTag: { equals: riotTag, mode: "insensitive" } },
  });

  if (!target) {
    const account = await getAccountByRiotId(riotName, riotTag);
    try {
      target = await prisma.user.create({
        data: {
          riotPuuid: account.puuid,
          riotName: account.name,
          riotTag: account.tag,
          riotRegion: account.region,
          riotVerificado: false,
        },
      });
    } catch (err: unknown) {
      // Corrida: duas buscas simultâneas pelo mesmo RiotID inédito colidem
      // no @unique de riotPuuid -- mesmo padrão de ensureMapAsset() em
      // strategy.ts, rebusca em vez de propagar o erro.
      if ((err as { code?: string })?.code === "P2002") {
        target = await prisma.user.findUnique({ where: { riotPuuid: account.puuid } });
      } else {
        throw err;
      }
    }
  }

  if (!target) throw new Error("Falha ao resolver o usuário pesquisado.");

  // Sincroniza sob demanda (mesmo cooldown de 60s do sync normal, ver
  // sync.ts) -- sem isso, toda pesquisa bateria na HenrikDev de novo mesmo
  // pra alguém já pesquisado há poucos segundos.
  if (target.riotPuuid && target.riotRegion && !recentlySynced(target.id)) {
    await syncUserMatches(target.id, target.riotPuuid, target.riotRegion);
  }

  return target;
}
