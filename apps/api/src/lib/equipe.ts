import type { User, Equipe } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { CARGOS_GERENCIAM_ESTRATEGIA, type EquipeOverview } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr } from "./henrikdev.js";
import { loadAgentsByUuid } from "./assets.js";
import { countsTowardStats } from "./match-result.js";
import { resolveDisplayName, resolveAvatarUrl } from "./dto.js";

// Multi-tenancy real (LAUNCH.md §5) — um usuário pertence a no máximo uma
// equipe (MembroEquipe.userId é @unique). "Qual é a minha equipe" sempre se
// resolve a partir de quem está logado, nunca "a equipe que existir" (era
// assim antes, funcionava só porque só existia uma — ver CONTEXT.md §1 pro
// contexto de <10 amigos que motivou aquela simplificação original).
export async function getUserEquipeId(userId: string): Promise<string | null> {
  const membership = await prisma.membroEquipe.findUnique({ where: { userId } });
  return membership?.equipeId ?? null;
}

export async function getUserEquipe(userId: string): Promise<{ id: string; nome: string } | null> {
  const membership = await prisma.membroEquipe.findUnique({ where: { userId }, include: { equipe: true } });
  return membership ? { id: membership.equipe.id, nome: membership.equipe.nome } : null;
}

function gerarCodigoConvite(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // 8 chars, ex. "A3F9C210"
}

// Cria uma equipe nova com quem chamou como dono e primeiro membro. Retry em
// colisão de codigoConvite (P2002) — espaço de 16^8 códigos torna isso
// astronomicamente raro, mas o custo de tratar é baixo (mesmo padrão de
// ensureMapAsset em strategy.ts).
export async function criarEquipe(userId: string, nome: string): Promise<Equipe> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.equipe.create({
        data: { nome, donoId: userId, codigoConvite: gerarCodigoConvite(), membros: { create: { userId, isAdmin: true } } },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw new Error("Não consegui gerar um código de convite único.");
}

// `null` cobre tanto "código não existe" quanto qualquer erro de formato —
// a rota trata os dois como 404, sem distinguir motivo (não vaza se o código
// é de outra equipe válida ou simplesmente não existe).
export async function entrarEquipePorCodigo(userId: string, code: string): Promise<Equipe | null> {
  const equipe = await prisma.equipe.findUnique({ where: { codigoConvite: code.trim().toUpperCase() } });
  if (!equipe) return null;

  await prisma.membroEquipe.create({ data: { equipeId: equipe.id, userId } });
  return equipe;
}

const round0 = (n: number) => Math.round(n);

// Resolve de quem é o painel que a rota /dashboard* deve montar: o próprio
// usuário autenticado (sem `targetUserId`) ou outro membro da MESMA equipe —
// usado pelo filtro "ver painel de outro membro". `null` cobre os três
// motivos de recusa (usuário autenticado não tem equipe / alvo não existe /
// alvo não é membro da mesma equipe) — a rota trata todos como 404.
export async function resolveDashboardTarget(authUser: User, targetUserId: string | undefined): Promise<User | null> {
  if (!targetUserId || targetUserId === authUser.id) return authUser;

  const equipeId = await getUserEquipeId(authUser.id);
  if (!equipeId) return null;

  const isMember = await prisma.membroEquipe.findUnique({ where: { equipeId_userId: { equipeId, userId: targetUserId } } });
  if (!isMember) return null;

  return prisma.user.findUnique({ where: { id: targetUserId } });
}

// Mesma ideia de resolveDashboardTarget, mas usada por toda rota que o
// painel individual (busca livre de RiotID, ver publicSearch.ts) também
// precisa resolver -- /dashboard*, /matches/:id. `free=true` pula a
// restrição de equipe (qualquer usuário existente vale, real ou "fantasma"
// criado pela busca); sem isso, cai na mesma regra de sempre (só membro da
// mesma equipe). Ver resolveTarget em routes/dashboard.ts pro contrato de
// query string (`userId`/`free`) que decide qual dos dois modos usar.
export async function resolveViewTarget(authUser: User, targetUserId: string | undefined, free: boolean): Promise<User | null> {
  if (!free) return resolveDashboardTarget(authUser, targetUserId);
  if (!targetUserId || targetUserId === authUser.id) return authUser;
  return prisma.user.findUnique({ where: { id: targetUserId } });
}

export async function buildEquipeOverview(equipeId: string): Promise<EquipeOverview | null> {
  const equipe = await prisma.equipe.findUnique({
    where: { id: equipeId },
    include: { membros: { include: { user: true } } },
  });
  if (!equipe) return null;

  const windowStart = new Date(Date.now() - 30 * 86_400_000);
  const puuids = equipe.membros.map((m) => m.user.riotPuuid).filter((p): p is string => Boolean(p));

  // Só Competitivo/Sem classificação/Premier entram nas estatísticas do
  // card da equipe (ver countsTowardStats) — mais simples excluir o resto
  // de tudo (kda/acs/winrate por membro, partidas juntos) do que só do ACS.
  //
  // `select` só o `modo` do match (não `include: { match: true }`) —
  // essa rota roda em todo login/carga do app, e o rawJson de cada partida
  // chega a ~400KB; puxar ele aqui pra só ler `modo` é o tipo de coisa que
  // estourou a memória em produção (ver buildEquipeMatches).
  const rows = puuids.length
    ? (
        await prisma.matchPlayer.findMany({
          where: { puuid: { in: puuids }, match: { startedAt: { gte: windowStart } } },
          select: {
            puuid: true,
            matchId: true,
            won: true,
            kills: true,
            deaths: true,
            assists: true,
            acs: true,
            headshots: true,
            bodyshots: true,
            legshots: true,
            match: { select: { modo: true } },
          },
        })
      ).filter((r) => countsTowardStats(r.match.modo))
    : [];

  const byMatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r);
    byMatch.set(r.matchId, list);
  }
  const togetherMatches = [...byMatch.values()].filter((list) => new Set(list.map((r) => r.puuid)).size >= 2);
  const togetherWins = togetherMatches.filter((list) => list[0]!.won).length;

  const agentsByUuid = await loadAgentsByUuid();

  const members = await Promise.all(
    equipe.membros.map(async (m) => {
      const puuid = m.user.riotPuuid;
      const memberRows = puuid ? rows.filter((r) => r.puuid === puuid) : [];

      const kills = memberRows.reduce((s, r) => s + r.kills, 0);
      const deaths = memberRows.reduce((s, r) => s + r.deaths, 0);
      const assists = memberRows.reduce((s, r) => s + r.assists, 0);
      const acsSum = memberRows.reduce((s, r) => s + r.acs, 0);
      const headshots = memberRows.reduce((s, r) => s + r.headshots, 0);
      const bodyshots = memberRows.reduce((s, r) => s + r.bodyshots, 0);
      const legshots = memberRows.reduce((s, r) => s + r.legshots, 0);
      const shotsTotal = headshots + bodyshots + legshots;
      const wins = memberRows.filter((r) => r.won).length;

      let rankLabel = "—";
      if (puuid && m.user.riotRegion) {
        try {
          const mmr = await getMmr(m.user.riotRegion, puuid);
          rankLabel = mmr.current_data.currenttierpatched;
        } catch {
          // sem rank disponível — mantém o placeholder
        }
      }

      return {
        userId: m.userId,
        name: resolveDisplayName(m.user),
        avatarUrl: resolveAvatarUrl(m.user),
        riotIdLabel: m.user.riotName && m.user.riotTag ? `${m.user.riotName}#${m.user.riotTag}` : null,
        rankLabel,
        roles: (m.funcoes.length > 0 ? m.funcoes : [m.user.funcaoPreferida ?? "iniciador"]) as EquipeOverview["members"][number]["roles"],
        cargo: m.cargo as EquipeOverview["members"][number]["cargo"],
        isAdmin: m.isAdmin,
        isOwner: m.userId === equipe.donoId,
        joinedAtLabel: m.createdAt.toLocaleDateString("pt-BR"),
        isSelf: false, // preenchido pela rota, que sabe quem é o usuário autenticado
        kda: memberRows.length ? round0(((kills + assists) / Math.max(deaths, 1)) * 100) / 100 : 0,
        acs: memberRows.length ? round0(acsSum / memberRows.length) : 0,
        hsPercent: shotsTotal > 0 ? round0((headshots / shotsTotal) * 100) : 0,
        winratePercent: memberRows.length ? round0((wins / memberRows.length) * 100) : 0,
        note: m.nota ?? "",
        hasRiotLinked: Boolean(m.user.riotPuuid && m.user.riotRegion),
        mainAgents: m.mainAgentUuids
          .map((uuid) => {
            const agent = agentsByUuid.get(uuid);
            return agent ? { uuid, name: agent.nome } : null;
          })
          .filter((a): a is { uuid: string; name: string } => a !== null),
      };
    }),
  );

  return {
    id: equipe.id,
    name: equipe.nome,
    descricao: equipe.descricao ?? "",
    imagemUrl: equipe.imagemUrl,
    donoId: equipe.donoId,
    codigoConvite: equipe.codigoConvite,
    memberCount: equipe.membros.length,
    matchesTogether30d: togetherMatches.length,
    groupWinratePercent: togetherMatches.length ? round0((togetherWins / togetherMatches.length) * 100) : 0,
    members,
  };
}

// Admin da equipe: qualquer membro com isAdmin true (o dono é sempre um
// deles, ver criarEquipe/backfillEquipeOwnerAdmin). `null` cobre "não é
// membro" — quem chama decide o que fazer (as rotas tratam como 403/404).
export async function isEquipeAdmin(userId: string, equipeId: string): Promise<boolean> {
  const membership = await prisma.membroEquipe.findUnique({ where: { equipeId_userId: { equipeId, userId } } });
  return membership?.isAdmin ?? false;
}

// Quem pode criar/editar/apagar estratégia DE EQUIPE (18/09/2026) — IGL,
// treinador principal/assistente ou admin. Jogador comum só visualiza (ver
// /strategies em routes/strategies.ts). Estratégia INDIVIDUAL não passa por
// aqui — quem criou é sempre dono dela, sem depender de cargo/equipe.
export async function canManageEquipeStrategies(userId: string, equipeId: string): Promise<boolean> {
  const membership = await prisma.membroEquipe.findUnique({ where: { equipeId_userId: { equipeId, userId } } });
  if (!membership) return false;
  return membership.isAdmin || CARGOS_GERENCIAM_ESTRATEGIA.includes(membership.cargo as (typeof CARGOS_GERENCIAM_ESTRATEGIA)[number]);
}

