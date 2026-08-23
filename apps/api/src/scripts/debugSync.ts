import { prisma } from "../lib/prisma.js";

const t0 = Date.now();
console.log("passo 1: team.findFirst({ include members.user })");
const team = await prisma.team.findFirst({ include: { members: { include: { user: true } } } });
console.log("  OK em", Date.now() - t0, "ms —", team?.members.length, "membros");

const puuids = (team?.members ?? []).map((m) => m.user.riotPuuid).filter((p): p is string => Boolean(p));
console.log("passo 2: matchPlayer.findMany (puuids:", puuids.length, ")");
const t1 = Date.now();
const windowStart = new Date(Date.now() - 30 * 86_400_000);
const rows = puuids.length
  ? await prisma.matchPlayer.findMany({
      where: { puuid: { in: puuids }, match: { startedAt: { gte: windowStart } } },
      include: { match: true },
    })
  : [];
console.log("  OK em", Date.now() - t1, "ms —", rows.length, "linhas");

process.exit(0);
