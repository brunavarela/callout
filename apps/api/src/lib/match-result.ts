// Regra de negócio: a Riot não expõe "empate" no campo `won` de match_players
// (vem `false` pro jogador, igual uma derrota). O jeito de identificar um
// empate é pelo RR: ganhar até 5 pontos numa partida competitiva só acontece
// quando ela empatou (vitória/derrota de verdade sempre dá mais que isso).
const DRAW_MAX_RR_GAIN = 5;

export function matchResult(won: boolean, rrDelta: number | null | undefined): "V" | "D" | "E" {
  if (rrDelta !== null && rrDelta !== undefined && rrDelta > 0 && rrDelta <= DRAW_MAX_RR_GAIN) return "E";
  return won ? "V" : "D";
}
