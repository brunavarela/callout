import type { Competicao } from "@callout/shared";

// VCT Champions Shanghai 2026 — 16 times, 4 grupos de 4 (formato GSL: 2
// partidas de abertura, 1 eliminação, 1 decisão de grupo/upper final, 1
// decisiva — 5 confrontos por grupo, os 2 primeiros de cada grupo avançam
// pros playoffs) + playoffs em mata-mata depois.
//
// Nomes completos/cores dos times foram deduzidos a partir só da sigla
// (print da fase de grupos) — Bruna confirma/corrige depois. Datas dos
// confrontos de grupo são um chute a partir do cronograma geral (só
// mostrava dia + "Upper/Lower Grupos", não o confronto exato) — ok pra
// aproximar, mas não é garantido bater hora certa com o oficial.
//
// Playoffs (mata-mata) ainda NÃO estão aqui -- só dá pra saber quem joga
// contra quem lá depois que os 4 grupos terminarem (top 2 de cada grupo
// avança), então esse pedaço entra num seed futuro quando isso for sabido.
export const vctChampionsShanghai2026: Competicao = {
  id: "vct-champions-shanghai-2026",
  nome: "VCT Champions Shanghai 2026",
  formato: "Fase de grupos (GSL, 4 grupos) + playoffs · 16 times",
  categorias: ["mista"],
  fase: "Fase de grupos",
  status: "agendada",
  linkTwitch: "https://www.twitch.tv/valorant_br",
  linkYoutube: "https://www.youtube.com/@valesportsbr",
  times: [
    // Grupo A
    { id: "100t", nome: "100 Thieves", sigla: "100T", cor: "#C0392B" },
    { id: "t1", nome: "T1", sigla: "T1", cor: "#FF1654" },
    { id: "jdg", nome: "JD Gaming", sigla: "JDG", cor: "#D4000C" },
    { id: "fut", nome: "FUT Esports", sigla: "FUT", cor: "#F7A800" },
    // Grupo B
    { id: "ge", nome: "Global Esports", sigla: "GE", cor: "#00B2A9" },
    { id: "vit", nome: "Team Vitality", sigla: "VIT", cor: "#FFE500" },
    { id: "loud", nome: "LOUD", sigla: "LOUD", cor: "#6FCF44" },
    { id: "edg", nome: "EDward Gaming", sigla: "EDG", cor: "#1B4F9C" },
    // Grupo C
    { id: "tyl", nome: "TYLOO", sigla: "TYL", cor: "#4A4A4A" },
    { id: "g2", nome: "G2 Esports", sigla: "G2", cor: "#8E8E93" },
    { id: "tl", nome: "Team Liquid", sigla: "TL", cor: "#00A8E1" },
    { id: "prx", nome: "Paper Rex", sigla: "PRX", cor: "#C13FCE" },
    // Grupo D
    { id: "kc", nome: "Karmine Corp", sigla: "KC", cor: "#1560BD" },
    { id: "xlg", nome: "Xi Lai Gaming", sigla: "XLG", cor: "#D42A2A" },
    { id: "ns", nome: "Nongshim RedForce", sigla: "NS", cor: "#DA291C" },
    { id: "nrg", nome: "NRG", sigla: "NRG", cor: "#9B59B6" },
  ],
  confrontos: [
    // Grupo A
    { id: "A1", chave: "grupos", grupo: "A", data: "2026-09-24T18:00", status: "agendada", ladoA: { tipo: "time", timeId: "100t" }, ladoB: { tipo: "time", timeId: "t1" }, placarA: null, placarB: null },
    { id: "A2", chave: "grupos", grupo: "A", data: "2026-09-24T21:00", status: "agendada", ladoA: { tipo: "time", timeId: "jdg" }, ladoB: { tipo: "time", timeId: "fut" }, placarA: null, placarB: null },
    { id: "A4", chave: "grupos", grupo: "A", data: "2026-09-29T18:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "A1" }, ladoB: { tipo: "vencedor", confrontoId: "A2" }, placarA: null, placarB: null },
    { id: "A3", chave: "grupos", grupo: "A", data: "2026-10-01T18:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "A1" }, ladoB: { tipo: "perdedor", confrontoId: "A2" }, placarA: null, placarB: null },
    { id: "A5", chave: "grupos", grupo: "A", data: "2026-10-03T18:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "A4" }, ladoB: { tipo: "vencedor", confrontoId: "A3" }, placarA: null, placarB: null },

    // Grupo B
    { id: "B1", chave: "grupos", grupo: "B", data: "2026-09-25T18:00", status: "agendada", ladoA: { tipo: "time", timeId: "ge" }, ladoB: { tipo: "time", timeId: "vit" }, placarA: null, placarB: null },
    { id: "B2", chave: "grupos", grupo: "B", data: "2026-09-25T21:00", status: "agendada", ladoA: { tipo: "time", timeId: "loud" }, ladoB: { tipo: "time", timeId: "edg" }, placarA: null, placarB: null },
    { id: "B4", chave: "grupos", grupo: "B", data: "2026-09-29T21:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "B1" }, ladoB: { tipo: "vencedor", confrontoId: "B2" }, placarA: null, placarB: null },
    { id: "B3", chave: "grupos", grupo: "B", data: "2026-10-01T21:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "B1" }, ladoB: { tipo: "perdedor", confrontoId: "B2" }, placarA: null, placarB: null },
    { id: "B5", chave: "grupos", grupo: "B", data: "2026-10-03T21:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "B4" }, ladoB: { tipo: "vencedor", confrontoId: "B3" }, placarA: null, placarB: null },

    // Grupo C
    { id: "C1", chave: "grupos", grupo: "C", data: "2026-09-26T18:00", status: "agendada", ladoA: { tipo: "time", timeId: "tyl" }, ladoB: { tipo: "time", timeId: "g2" }, placarA: null, placarB: null },
    { id: "C2", chave: "grupos", grupo: "C", data: "2026-09-26T21:00", status: "agendada", ladoA: { tipo: "time", timeId: "tl" }, ladoB: { tipo: "time", timeId: "prx" }, placarA: null, placarB: null },
    { id: "C4", chave: "grupos", grupo: "C", data: "2026-09-30T18:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "C1" }, ladoB: { tipo: "vencedor", confrontoId: "C2" }, placarA: null, placarB: null },
    { id: "C3", chave: "grupos", grupo: "C", data: "2026-10-02T18:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "C1" }, ladoB: { tipo: "perdedor", confrontoId: "C2" }, placarA: null, placarB: null },
    { id: "C5", chave: "grupos", grupo: "C", data: "2026-10-04T18:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "C4" }, ladoB: { tipo: "vencedor", confrontoId: "C3" }, placarA: null, placarB: null },

    // Grupo D
    { id: "D1", chave: "grupos", grupo: "D", data: "2026-09-27T18:00", status: "agendada", ladoA: { tipo: "time", timeId: "kc" }, ladoB: { tipo: "time", timeId: "xlg" }, placarA: null, placarB: null },
    { id: "D2", chave: "grupos", grupo: "D", data: "2026-09-27T21:00", status: "agendada", ladoA: { tipo: "time", timeId: "ns" }, ladoB: { tipo: "time", timeId: "nrg" }, placarA: null, placarB: null },
    { id: "D4", chave: "grupos", grupo: "D", data: "2026-09-30T21:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "D1" }, ladoB: { tipo: "vencedor", confrontoId: "D2" }, placarA: null, placarB: null },
    { id: "D3", chave: "grupos", grupo: "D", data: "2026-10-02T21:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "D1" }, ladoB: { tipo: "perdedor", confrontoId: "D2" }, placarA: null, placarB: null },
    { id: "D5", chave: "grupos", grupo: "D", data: "2026-10-04T21:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "D4" }, ladoB: { tipo: "vencedor", confrontoId: "D3" }, placarA: null, placarB: null },
  ],
};
