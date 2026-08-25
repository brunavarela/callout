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

// Deathmatch (e Team Deathmatch) não tem round de verdade — a HenrikDev
// devolve `rounds` com 1 item cobrindo a partida inteira, então
// `stats.score` vira a pontuação total, não por round. Dividir isso pelo
// "round" único infla o ACS pra milhares (visto em produção: até 8000+).
// Usado pra excluir essas partidas de qualquer média/estatística — elas
// continuam sincronizadas e aparecem nas listas normalmente.
export function hasRoundBasedAcs(modo: string): boolean {
  return !modo.toLowerCase().includes("deathmatch");
}
