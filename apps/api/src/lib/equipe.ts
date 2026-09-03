import type { User, Equipe } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PartidaEquipeSummary, EquipeOverview } from "@callout/shared";
import { MIN_TEAM_MATCH_PLAYERS, MAX_EQUIPE_MATCHES } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr } from "./henrikdev.js";
import { loadAgentsByUuid } from "./assets.js";
import { mapNameFrom, scoreFor, hasAce, formatPlayedAt } from "./dashboard.js";
import { matchResult, countsTowardStats } from "./match-result.js";
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

// Histórico de partidas com pelo menos MIN_TEAM_MATCH_PLAYERS membros da
// equipe juntos, até as MAX_EQUIPE_MATCHES mais recentes (sem recorte de 30
// dias como o resumo do card da equipe — mas não é "todo o histórico" mais,
// ver MAX_EQUIPE_MATCHES). Como um time de Valorant só tem 5 vagas, exigir
// >=5 dos nossos jogados na mesma partida já significa que a equipe inteira
// daquela partida é gente rastreada — não sobra vaga pra ninguém de fora,
// então dá pra calcular MVP só entre os `list`, sem query extra dos 10.
export async function buildEquipeMatches(equipeId: string): Promise<PartidaEquipeSummary[]> {
  const equipe = await prisma.equipe.findUnique({ where: { id: equipeId }, include: { membros: { include: { user: true } } } });
  if (!equipe) return [];

  const trackedMembers = equipe.membros.filter((m) => m.user.riotPuuid);
  if (trackedMembers.length < MIN_TEAM_MATCH_PLAYERS) return [];

  const memberByPuuid = new Map(trackedMembers.map((m) => [m.user.riotPuuid as string, m]));
  const puuids = [...memberByPuuid.keys()];

  // Sem `include: { match: true }` aqui de propósito — isso puxaria o
  // rawJson da partida (~400KB em média) uma vez POR JOGADOR rastreado
  // nela, não uma vez por partida. Com histórico completo (sem recorte de
  // data) e vários jogos em grupo, isso já estourou a memória em produção.
  // Busca só os campos do jogador primeiro, decide quais partidas
  // qualificam, e só então busca o rawJson dessas partidas — uma vez cada.
  const rows = await prisma.matchPlayer.findMany({
    where: { puuid: { in: puuids } },
    select: {
      matchId: true,
      puuid: true,
      teamId: true, // lado Red/Blue bruto da HenrikDev — não é o id da nossa Equipe
      won: true,
      agentName: true,
      acs: true,
      kills: true,
      deaths: true,
      assists: true,
      headshots: true,
      bodyshots: true,
      legshots: true,
      rr: true,
    },
  });

  const byMatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byMatch.get(r.matchId) ?? [];
    list.push(r);
    byMatch.set(r.matchId, list);
  }
  const qualifyingLists = [...byMatch.values()].filter((list) => new Set(list.map((r) => r.puuid)).size >= MIN_TEAM_MATCH_PLAYERS);
  if (qualifyingLists.length === 0) return [];

  // Teto em duas etapas (ver MAX_EQUIPE_MATCHES): primeiro descobre a data
  // de cada partida qualificada SEM o rawJson (~400KB cada), pra decidir
  // quais são as mais recentes; só busca o rawJson de verdade pras que
  // sobreviverem ao corte — nunca das outras.
  const qualifyingIds = qualifyingLists.map((list) => list[0]!.matchId);
  const recentIds = (
    await prisma.match.findMany({
      where: { id: { in: qualifyingIds } },
      select: { id: true },
      orderBy: { startedAt: "desc" },
      take: MAX_EQUIPE_MATCHES,
    })
  ).map((m) => m.id);
  const recentIdSet = new Set(recentIds);
  const cappedQualifyingLists = qualifyingLists.filter((list) => recentIdSet.has(list[0]!.matchId));

  const matches = await prisma.match.findMany({ where: { id: { in: recentIds } } });
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const qualifying = cappedQualifyingLists
    .map((list) => ({ match: matchById.get(list[0]!.matchId), list }))
    .filter((x): x is { match: (typeof matches)[number]; list: typeof rows } => x.match !== undefined)
    .sort((a, b) => b.match.startedAt.getTime() - a.match.startedAt.getTime());

  const now = new Date();
  return qualifying.map(({ match, list }): PartidaEquipeSummary => {
    const score = scoreFor(match.rawJson, list[0]!.teamId); // lado Red/Blue, não a Equipe
    const maxAcs = Math.max(...list.map((r) => r.acs));

    return {
      id: match.id,
      map: mapNameFrom(match.rawJson),
      score: `${score.own}—${score.opponent}`,
      playedAtLabel: formatPlayedAt(match.startedAt, now),
      participants: list.map((r) => {
        const member = memberByPuuid.get(r.puuid)!;
        const rr = r.rr;
        const shotsTotal = r.headshots + r.bodyshots + r.legshots;
        return {
          userId: member.userId,
          name: resolveDisplayName(member.user),
          agent: r.agentName,
          kda: `${r.kills}/${r.deaths}/${r.assists}`,
          acs: r.acs,
          hsPercent: shotsTotal > 0 ? Math.round((r.headshots / shotsTotal) * 100) : 0,
          mvp: r.acs === maxAcs,
          ace: hasAce(match.rawJson, r.puuid),
          rr,
          result: matchResult(r.won, rr),
        };
      }),
    };
  });
}
