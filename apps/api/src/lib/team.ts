import type { User, Team } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { TeamMatchSummary, TeamOverview } from "@callout/shared";
import { MIN_TEAM_MATCH_PLAYERS } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmr } from "./henrikdev.js";
import { loadAgentsByUuid } from "./assets.js";
import { mapNameFrom, scoreFor, hasAce, formatPlayedAt } from "./dashboard.js";
import { matchResult, countsTowardStats } from "./match-result.js";

// Multi-tenancy real (LAUNCH.md §5) — um usuário pertence a no máximo um
// time (TeamMember.userId é @unique). "Qual é o meu time" sempre se resolve
// a partir de quem está logado, nunca "o time que existir" (era assim antes,
// funcionava só porque só existia um time — ver CONTEXT.md §1 pro contexto
// de <10 amigos que motivou aquela simplificação original).
export async function getUserTeamId(userId: string): Promise<string | null> {
  const membership = await prisma.teamMember.findUnique({ where: { userId } });
  return membership?.teamId ?? null;
}

export async function getUserTeam(userId: string): Promise<{ id: string; nome: string } | null> {
  const membership = await prisma.teamMember.findUnique({ where: { userId }, include: { team: true } });
  return membership ? { id: membership.team.id, nome: membership.team.nome } : null;
}

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // 8 chars, ex. "A3F9C210"
}

// Cria um time novo com quem chamou como dono e primeiro membro. Retry em
// colisão de inviteCode (P2002) — espaço de 16^8 códigos torna isso
// astronomicamente raro, mas o custo de tratar é baixo (mesmo padrão de
// ensureMapAsset em strategy.ts).
export async function createTeam(userId: string, nome: string): Promise<Team> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.team.create({
        data: { nome, ownerId: userId, inviteCode: generateInviteCode(), members: { create: { userId } } },
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
// é de outro time válido ou simplesmente não existe).
export async function joinTeamByCode(userId: string, code: string): Promise<Team | null> {
  const team = await prisma.team.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
  if (!team) return null;

  await prisma.teamMember.create({ data: { teamId: team.id, userId } });
  return team;
}

const round0 = (n: number) => Math.round(n);

// Resolve de quem é o painel que a rota /dashboard* deve montar: o próprio
// usuário autenticado (sem `targetUserId`) ou outro membro do MESMO time —
// usado pelo filtro "ver painel de outro membro". `null` cobre os três
// motivos de recusa (usuário autenticado não tem time / alvo não existe /
// alvo não é membro do mesmo time) — a rota trata todos como 404.
export async function resolveDashboardTarget(authUser: User, targetUserId: string | undefined): Promise<User | null> {
  if (!targetUserId || targetUserId === authUser.id) return authUser;

  const teamId = await getUserTeamId(authUser.id);
  if (!teamId) return null;

  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: targetUserId } } });
  if (!isMember) return null;

  return prisma.user.findUnique({ where: { id: targetUserId } });
}

export async function buildTeamOverview(teamId: string): Promise<TeamOverview | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: { include: { user: true } } },
  });
  if (!team) return null;

  const windowStart = new Date(Date.now() - 30 * 86_400_000);
  const puuids = team.members.map((m) => m.user.riotPuuid).filter((p): p is string => Boolean(p));

  // Só Competitivo/Sem classificação/Premier entram nas estatísticas do
  // card do time (ver countsTowardStats) — mais simples excluir o resto
  // de tudo (kda/acs/winrate por membro, partidas juntos) do que só do ACS.
  //
  // `select` só o `modo` do match (não `include: { match: true }`) —
  // essa rota roda em todo login/carga do app, e o rawJson de cada partida
  // chega a ~400KB; puxar ele aqui pra só ler `modo` é o tipo de coisa que
  // estourou a memória em produção (ver buildTeamMatches).
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
    team.members.map(async (m) => {
      const puuid = m.user.riotPuuid;
      const memberRows = puuid ? rows.filter((r) => r.puuid === puuid) : [];

      const kills = memberRows.reduce((s, r) => s + r.kills, 0);
      const deaths = memberRows.reduce((s, r) => s + r.deaths, 0);
      const assists = memberRows.reduce((s, r) => s + r.assists, 0);
      const acsSum = memberRows.reduce((s, r) => s + r.acs, 0);
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
        name: m.user.riotName ?? m.user.discordUsername,
        rankLabel,
        roles: (m.funcoes.length > 0 ? m.funcoes : [m.user.funcaoPreferida ?? "iniciador"]) as TeamOverview["members"][number]["roles"],
        isSelf: false, // preenchido pela rota, que sabe quem é o usuário autenticado
        kda: memberRows.length ? round0(((kills + assists) / Math.max(deaths, 1)) * 100) / 100 : 0,
        acs: memberRows.length ? round0(acsSum / memberRows.length) : 0,
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
    id: team.id,
    name: team.nome,
    ownerId: team.ownerId,
    inviteCode: team.inviteCode,
    memberCount: team.members.length,
    matchesTogether30d: togetherMatches.length,
    groupWinratePercent: togetherMatches.length ? round0((togetherWins / togetherMatches.length) * 100) : 0,
    members,
  };
}

// Histórico de partidas com pelo menos MIN_TEAM_MATCH_PLAYERS membros do
// time juntos (sem recorte de 30 dias — "histórico" é tudo, diferente do
// resumo do card do time). Como um time de Valorant só tem 5 vagas, exigir
// >=5 dos nossos jogados na mesma partida já significa que o time inteiro
// daquela partida é gente rastreada — não sobra vaga pra ninguém de fora,
// então dá pra calcular MVP só entre os `list`, sem query extra dos 10.
export async function buildTeamMatches(teamId: string): Promise<TeamMatchSummary[]> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { members: { include: { user: true } } } });
  if (!team) return [];

  const trackedMembers = team.members.filter((m) => m.user.riotPuuid);
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
      teamId: true,
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

  const matches = await prisma.match.findMany({ where: { id: { in: qualifyingLists.map((list) => list[0]!.matchId) } } });
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const qualifying = qualifyingLists
    .map((list) => ({ match: matchById.get(list[0]!.matchId), list }))
    .filter((x): x is { match: (typeof matches)[number]; list: typeof rows } => x.match !== undefined)
    .sort((a, b) => b.match.startedAt.getTime() - a.match.startedAt.getTime());

  const now = new Date();
  return qualifying.map(({ match, list }): TeamMatchSummary => {
    const score = scoreFor(match.rawJson, list[0]!.teamId);
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
          name: member.user.riotName ?? member.user.discordUsername,
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
