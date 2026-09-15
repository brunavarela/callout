import type { Competicao } from "@callout/shared";

// Chaveamento oficial do VCT Americas Playoffs 2026 — dupla eliminação, 8
// times. Semente inicial pro banco (ver scripts/seedCompeticoes.ts) — depois
// de seedado uma vez, a edição de verdade acontece pela tela de Competições
// (admin), não editando este arquivo.
export const vctAmericasPlayoffs2026: Competicao = {
  id: "vct-americas-playoffs-2026",
  nome: "VCT Americas · Etapa 2 · Playoffs",
  formato: "Dupla eliminação · 8 times",
  categorias: ["mista"],
  fase: "Finalizada",
  status: "encerrada",
  linkTwitch: "https://www.twitch.tv/valorant_br",
  linkYoutube: "https://www.youtube.com/@valesportsbr",
  times: [
    { id: "loud", nome: "LOUD", sigla: "LOUD", cor: "#6FCF44" },
    { id: "fur", nome: "FURIA", sigla: "FUR", cor: "#B9B9BD" },
    { id: "lev", nome: "Leviatán", sigla: "LEV", cor: "#3B82F6" },
    { id: "mibr", nome: "MIBR", sigla: "MIBR", cor: "#F2C94C" },
    { id: "nrg", nome: "NRG", sigla: "NRG", cor: "#9B59B6" },
    { id: "100t", nome: "100 Thieves", sigla: "100T", cor: "#C0392B" },
    { id: "g2", nome: "G2 Esports", sigla: "G2", cor: "#8E8E93" },
    { id: "eg", nome: "Evil Geniuses", sigla: "EG", cor: "#17A398" },
  ],
  // Campeão: 100 Thieves. Placares reais do torneio (encerrado).
  confrontos: [
    // Chave superior — rodada 1
    { id: "P1", chave: "superior", data: "2026-08-27T18:00", status: "encerrada", ladoA: { tipo: "time", timeId: "loud" }, ladoB: { tipo: "time", timeId: "fur" }, placarA: 2, placarB: 0 },
    { id: "P2", chave: "superior", data: "2026-08-27T21:00", status: "encerrada", ladoA: { tipo: "time", timeId: "lev" }, ladoB: { tipo: "time", timeId: "mibr" }, placarA: 2, placarB: 0 },

    // Chave superior — rodada 2
    { id: "P3", chave: "superior", data: "2026-08-28T18:00", status: "encerrada", ladoA: { tipo: "time", timeId: "nrg" }, ladoB: { tipo: "vencedor", confrontoId: "P1" }, placarA: 2, placarB: 1 },
    { id: "P4", chave: "superior", data: "2026-08-28T21:00", status: "encerrada", ladoA: { tipo: "time", timeId: "100t" }, ladoB: { tipo: "vencedor", confrontoId: "P2" }, placarA: 2, placarB: 0 },

    // Chave inferior — rodada 1
    { id: "P5", chave: "inferior", data: "2026-08-29T18:00", status: "encerrada", ladoA: { tipo: "perdedor", confrontoId: "P1" }, ladoB: { tipo: "time", timeId: "g2" }, placarA: 1, placarB: 2 },
    { id: "P6", chave: "inferior", data: "2026-08-29T21:00", status: "encerrada", ladoA: { tipo: "perdedor", confrontoId: "P2" }, ladoB: { tipo: "time", timeId: "eg" }, placarA: 2, placarB: 1 },

    // Chave inferior — rodada 2
    { id: "P7", chave: "inferior", data: "2026-08-30T18:00", status: "encerrada", ladoA: { tipo: "perdedor", confrontoId: "P4" }, ladoB: { tipo: "vencedor", confrontoId: "P5" }, placarA: 1, placarB: 2 },
    { id: "P8", chave: "inferior", data: "2026-08-30T21:00", status: "encerrada", ladoA: { tipo: "perdedor", confrontoId: "P3" }, ladoB: { tipo: "vencedor", confrontoId: "P6" }, placarA: 2, placarB: 0 },

    // Semifinais das chaves
    { id: "P9", chave: "superior", data: "2026-09-04T14:00", status: "encerrada", ladoA: { tipo: "vencedor", confrontoId: "P3" }, ladoB: { tipo: "vencedor", confrontoId: "P4" }, placarA: 0, placarB: 2 },
    { id: "P10", chave: "inferior", data: "2026-09-04T17:00", status: "encerrada", ladoA: { tipo: "vencedor", confrontoId: "P7" }, ladoB: { tipo: "vencedor", confrontoId: "P8" }, placarA: 0, placarB: 2 },
    { id: "P11", chave: "inferior", data: "2026-09-05T14:00", status: "encerrada", ladoA: { tipo: "perdedor", confrontoId: "P9" }, ladoB: { tipo: "vencedor", confrontoId: "P10" }, placarA: 2, placarB: 3 },

    // Grande final
    { id: "FINAL", chave: "final", data: "2026-09-06T14:00", status: "encerrada", ladoA: { tipo: "vencedor", confrontoId: "P9" }, ladoB: { tipo: "vencedor", confrontoId: "P11" }, placarA: 3, placarB: 2 },
  ],
};
