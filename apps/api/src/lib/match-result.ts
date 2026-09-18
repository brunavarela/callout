// Regra de negócio: a Riot não expõe "empate" no campo `won` de match_players
// (vem `false` pro jogador, igual uma derrota). O jeito de identificar um
// empate é pelo RR: ganhar de 0 até 5 pontos numa partida competitiva só
// acontece quando ela empatou (vitória/derrota de verdade sempre dá mais que
// isso, e perder RR nunca é empate).
const DRAW_MAX_RR_GAIN = 5;

// tier.id 0 = "Unranked" (ver competitivetiers em @callout/shared) — é o
// valor que a HenrikDev devolve pro elo enquanto ele ainda não foi
// calculado, ou seja, durante as partidas de colocação (início de
// episódio/ato, ou conta nova). Nesse período o RR "ganho" na partida pode
// vir 0 (o elo nem existe pra ter RR pra mexer), o que bateria na faixa de
// empate acima sem ser um empate de verdade -- então nesse caso ignora o RR
// e confia direto no `won` (resultado real da partida, que a colocação não
// muda).
const UNRANKED_TIER_ID = 0;

export function matchResult(won: boolean, rrDelta: number | null | undefined, rankTierId?: number | null): "V" | "D" | "E" {
  if (rankTierId === UNRANKED_TIER_ID) return won ? "V" : "D";
  if (rrDelta !== null && rrDelta !== undefined && rrDelta >= 0 && rrDelta <= DRAW_MAX_RR_GAIN) return "E";
  return won ? "V" : "D";
}

// Só esses 3 modos entram em média/estatística — allowlist, não denylist:
// qualquer outra coisa (Deathmatch, Spike Rush, Escalation, custom etc.)
// fica de fora sem precisar listar cada um. Deathmatch em particular nem
// tem round de verdade (a HenrikDev devolve `rounds` com 1 item cobrindo
// a partida inteira), então `stats.score` vira pontuação total, não por
// round — dividir por esse "round" único já inflou ACS pra milhares.
// Partidas fora da lista continuam sincronizadas e aparecem nas listas
// normalmente, só não contam pra nenhuma média/KPI.
// Exportado como array (não só o Set) pra dar pra usar direto num `where:
// { modo: { in: STATS_MODES_LIST } }` do Prisma -- ver seasonOverview.ts/
// equipeSeasonOverview.ts, que filtram por modo NA QUERY (antes do `take`),
// não depois de já ter buscado um teto de partidas de qualquer modo.
export const STATS_MODES_LIST = ["Competitive", "Unrated", "Premier"] as const;
const STATS_MODES = new Set<string>(STATS_MODES_LIST);

export function countsTowardStats(modo: string): boolean {
  return STATS_MODES.has(modo);
}
