import type { MatchV4Data, RrHistoryPoint, SidesBreakdown } from "@callout/shared";
import { prisma } from "./prisma.js";
import { getMmrHistory } from "./henrikdev.js";

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Histórico de RR real, vindo do endpoint -history da HenrikDev. Agrupa em
// ~10 barras: 1 dia por barra em janelas curtas, vários dias por barra em
// janelas longas (senão 90D vira 90 barras ilegíveis).
export async function buildRrHistory(affinity: string, puuid: string, days: number): Promise<RrHistoryPoint[]> {
  const history = await getMmrHistory(affinity, puuid);
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 86_400_000);

  const inWindow = history.filter((h) => new Date(h.date) >= windowStart);

  const bucketSizeDays = Math.max(1, Math.round(days / 10));
  const bucketCount = Math.ceil(days / bucketSizeDays);

  const points: RrHistoryPoint[] = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const bucketEnd = new Date(now.getTime() - i * bucketSizeDays * 86_400_000);
    const bucketStart = new Date(bucketEnd.getTime() - bucketSizeDays * 86_400_000);

    const delta = inWindow
      .filter((h) => {
        const d = new Date(h.date);
        return d >= bucketStart && d < bucketEnd;
      })
      .reduce((sum, h) => sum + h.last_change, 0);

    const label = bucketSizeDays === 1 ? WEEKDAY_LABELS[bucketEnd.getDay()]! : bucketEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    points.push({ label, delta });
  }

  return points;
}

const HALF_1_LAST_ROUND = 12;
const HALF_2_LAST_ROUND = 24;

function computeMatchSides(match: MatchV4Data, teamId: string): { attack: [number, number]; defense: [number, number]; overtime: [number, number] } {
  const result = { attack: [0, 0] as [number, number], defense: [0, 0] as [number, number], overtime: [0, 0] as [number, number] };

  const teamIdOfPuuid = (puuid: string) => match.players.find((p) => p.puuid === puuid)?.team_id;

  // Âncora: acha o time que atacou em algum round com plant na primeira
  // metade; se não achar, tenta na segunda e inverte.
  const firstHalfPlant = match.rounds.find((r) => r.id <= HALF_1_LAST_ROUND && r.plant)?.plant;
  const secondHalfPlant = match.rounds.find((r) => r.id > HALF_1_LAST_ROUND && r.id <= HALF_2_LAST_ROUND && r.plant)?.plant;

  let half1AttackTeam: string | undefined;
  if (firstHalfPlant) {
    half1AttackTeam = teamIdOfPuuid(firstHalfPlant.player.puuid);
  } else if (secondHalfPlant) {
    const half2AttackTeam = teamIdOfPuuid(secondHalfPlant.player.puuid);
    half1AttackTeam = match.teams.find((t) => t.team_id !== half2AttackTeam)?.team_id;
  }

  for (const round of match.rounds) {
    if (round.id > HALF_2_LAST_ROUND) {
      result.overtime[1]++;
      if (round.winning_team === teamId) result.overtime[0]++;
      continue;
    }

    if (!half1AttackTeam) continue; // sem âncora nessa partida — não dá pra atribuir lado com segurança

    const attackTeamThisRound = round.id <= HALF_1_LAST_ROUND ? half1AttackTeam : match.teams.find((t) => t.team_id !== half1AttackTeam)?.team_id;
    const side: "attack" | "defense" = teamId === attackTeamThisRound ? "attack" : "defense";

    result[side][1]++;
    if (round.winning_team === teamId) result[side][0]++;
  }

  return result;
}

export async function buildSidesBreakdown(puuid: string): Promise<SidesBreakdown> {
  const windowStart = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.matchPlayer.findMany({
    where: { puuid, match: { startedAt: { gte: windowStart } } },
    include: { match: true },
  });

  let attackWins = 0,
    attackTotal = 0,
    defenseWins = 0,
    defenseTotal = 0,
    otWins = 0,
    otTotal = 0;

  for (const row of rows) {
    const match = row.match.rawJson as unknown as MatchV4Data;
    const sides = computeMatchSides(match, row.teamId);
    attackWins += sides.attack[0];
    attackTotal += sides.attack[1];
    defenseWins += sides.defense[0];
    defenseTotal += sides.defense[1];
    otWins += sides.overtime[0];
    otTotal += sides.overtime[1];
  }

  const pct = (wins: number, total: number) => (total > 0 ? Math.round((wins / total) * 100) : 0);

  return {
    attack: { winratePercent: pct(attackWins, attackTotal), wins: attackWins, total: attackTotal },
    defense: { winratePercent: pct(defenseWins, defenseTotal), wins: defenseWins, total: defenseTotal },
    overtime: { wins: otWins, total: otTotal },
  };
}
