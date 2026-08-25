// Regra de negócio: a Riot não expõe "empate" no campo `won` de match_players
// (vem `false` pro jogador, igual uma derrota). O jeito de identificar um
// empate é pelo RR: ganhar de 0 até 5 pontos numa partida competitiva só
// acontece quando ela empatou (vitória/derrota de verdade sempre dá mais que
// isso, e perder RR nunca é empate).
const DRAW_MAX_RR_GAIN = 5;

export function matchResult(won: boolean, rrDelta: number | null | undefined): "V" | "D" | "E" {
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
const STATS_MODES = new Set(["Competitive", "Unrated", "Premier"]);

export function countsTowardStats(modo: string): boolean {
  return STATS_MODES.has(modo);
}
