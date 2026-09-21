import type { FastifyInstance, FastifyReply } from "fastify";
import type { User } from "@prisma/client";
import type { MatchCountFilter } from "@callout/shared";
import { requireAuth } from "../lib/session.js";
import { buildDashboardSummary } from "../lib/dashboard.js";
import { buildRrAndInsights, buildSidesBreakdown } from "../lib/insights.js";
import { buildSeasonOverview, buildSeasonMatchesPage } from "../lib/seasonOverview.js";
import { resolveViewTarget } from "../lib/equipe.js";
import { resolveOrCreateSearchTarget } from "../lib/publicSearch.js";
import { RIOT_ID_REGEX } from "../lib/authCodes.js";
import { HenrikDevError } from "../lib/henrikdev.js";

// Resolve de quem é o painel que a rota deve montar. Dois modos, escolhidos
// por quem chama (ver dashboardQuery em apps/web/src/lib/appData.ts):
// - `free=1` (painel individual, filtro de busca livre por RiotID — decisão
//   de produto de 21/09/2026): qualquer `userId` existente vale, sem
//   restrição de equipe — pode ser um usuário de verdade ou uma linha
//   "fantasma" criada por /dashboard/buscar pra alguém que nunca teve conta.
// - padrão (painel da equipe, EquipePainel.tsx): mantém a regra de sempre,
//   só membro da MESMA equipe pode ser alvo (resolveDashboardTarget).
async function resolveTarget(request: { user?: User; query: unknown }, reply: FastifyReply): Promise<User | null> {
  const { userId: targetUserId, free } = request.query as { userId?: string; free?: string };
  const target = await resolveViewTarget(request.user!, targetUserId, free === "1");
  if (!target) {
    reply.code(404).send({ error: "Usuário não encontrado." });
    return null;
  }
  if (!target.riotPuuid || !target.riotRegion) {
    const message = target.id === request.user!.id ? "Vincule seu Riot ID antes de ver o dashboard." : "Esse jogador ainda não tem Riot ID vinculado.";
    reply.code(409).send({ error: message });
    return null;
  }
  return target;
}

// "all" (ou qualquer outro valor) vira `undefined` — sem filtro. Só os dois
// modos que a Riot ranqueia/não ranqueia fazem sentido pro filtro do
// dashboard (deathmatch, spike rush etc. ficam de fora por ora).
function parseModoFilter(raw: unknown): "Competitive" | "Unrated" | undefined {
  return raw === "Competitive" || raw === "Unrated" ? raw : undefined;
}

function parseMatchCount(raw: unknown): MatchCountFilter {
  return raw === "7" ? 7 : raw === "all" ? "all" : 20;
}

// String vazia/ausente vira `undefined` — sem filtro de mapa. Não valida
// contra o catálogo de mapas: um mapId inválido só resulta numa query sem
// resultado nenhum, sem risco de segurança (é o mesmo puuid do target, já
// resolvido e autorizado por resolveTarget).
function parseMapIdFilter(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export async function dashboardRoutes(app: FastifyInstance) {
  // Busca livre por RiotID no painel individual — resolve (ou cria, se for
  // a primeira vez que alguém pesquisa esse jogador) o usuário-alvo e
  // devolve o `userId` pra web reusar nas outras rotas de /dashboard* com
  // `free=1`. Só quem tem sessão pode pesquisar; o alvo pesquisado NÃO
  // precisa ter conta/equipe em comum — ver resolveOrCreateSearchTarget.
  app.get("/dashboard/buscar", { preHandler: requireAuth }, async (request, reply) => {
    const { riotId } = request.query as { riotId?: string };
    if (!riotId || !RIOT_ID_REGEX.test(riotId)) {
      return reply.code(400).send({ error: "Formato inválido. Use nome#tag." });
    }
    const [riotName, riotTag] = riotId.split("#") as [string, string];

    try {
      const target = await resolveOrCreateSearchTarget(riotName, riotTag);
      return { userId: target.id, riotName: target.riotName, riotTag: target.riotTag };
    } catch (err) {
      if (err instanceof HenrikDevError) {
        return reply.code(err.status === 404 ? 404 : 502).send({ error: `Não achamos essa conta na Riot: ${err.message}` });
      }
      request.log.error(err, "falha ao buscar RiotID no painel individual");
      return reply.code(502).send({ error: "Falha ao falar com a HenrikDev. Tenta de novo em instantes." });
    }
  });

  app.get("/dashboard", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { modo, mapId } = request.query as { modo?: string; mapId?: string };
    return buildDashboardSummary(target.id, target.riotPuuid!, target.riotRegion!, parseModoFilter(modo), parseMapIdFilter(mapId));
  });

  app.get("/dashboard/rr-history", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { modo, matches, mapId } = request.query as { modo?: string; matches?: string; mapId?: string };

    try {
      return await buildRrAndInsights(target.riotRegion!, target.riotPuuid!, parseMatchCount(matches), parseModoFilter(modo), parseMapIdFilter(mapId));
    } catch (err) {
      request.log.error(err, "falha ao buscar histórico de RR");
      return reply.code(502).send({ error: "Falha ao buscar o histórico de RR na HenrikDev." });
    }
  });

  app.get("/dashboard/sides", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { modo, mapId } = request.query as { modo?: string; mapId?: string };
    return buildSidesBreakdown(target.riotPuuid!, parseModoFilter(modo), parseMapIdFilter(mapId));
  });

  // Visão do ato — cards "estilo tracker.gg" (ver plano de 10/09/2026).
  // Escopada por `matches` (Todas/20/7 partidas mais recentes, de qualquer
  // ato — ver MatchCountFilter). `mapId`/`agent` filtram a visão sem sair
  // desse recorte — mesmo padrão dual de mapIdFilter do /dashboard antigo
  // (ver comentário em buildSeasonOverview). `modo` restringe a um modo de
  // jogo específico (inclusive fora da allowlist de estatística, como
  // Deathmatch) — sem ele, mistura só os modos com estatística de verdade
  // (ver countsTowardStats).
  app.get("/dashboard/season", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { matches, mapId, agent, modo } = request.query as { matches?: string; mapId?: string; agent?: string; modo?: string };
    return buildSeasonOverview(target.riotPuuid!, target.riotRegion!, parseMatchCount(matches), mapId || undefined, agent || undefined, modo || undefined);
  });

  // Lista paginada (12 por página) das partidas — separada de
  // /dashboard/season pra virar página sem recalcular KPIs/top agentes/
  // mapas/etc de novo. Mesmos filtros de mapa/agente/modo do painel, mas
  // de propósito IGNORA o filtro de contagem (Todas/20/7) — mostra sempre
  // o histórico completo paginado.
  app.get("/dashboard/season/matches", { preHandler: requireAuth }, async (request, reply) => {
    const target = await resolveTarget(request, reply);
    if (!target) return;
    const { mapId, agent, modo, page } = request.query as { mapId?: string; agent?: string; modo?: string; page?: string };
    const pageNumber = Number(page);
    return buildSeasonMatchesPage(
      target.riotPuuid!,
      target.riotRegion!,
      mapId || undefined,
      agent || undefined,
      modo || undefined,
      Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1,
    );
  });
}
