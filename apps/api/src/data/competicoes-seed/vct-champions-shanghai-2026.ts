import type { Competicao } from "@callout/shared";

// VCT Champions Shanghai 2026 — 16 times, 4 grupos de 4 (formato GSL: 2
// partidas de abertura, 1 eliminação, 1 decisão de grupo/upper final, 1
// decisiva — 5 confrontos por grupo, os 2 primeiros de cada grupo avançam
// pros playoffs) + playoffs em mata-mata depois.
//
// Nomes completos/cores dos times foram deduzidos a partir só da sigla
// (print da fase de grupos) — Bruna confirma/corrige depois.
//
// Datas/horas corrigidas em 21/09/2026 a partir do cronograma oficial (print
// da Bruna) -- o chute inicial errava tanto o dia quanto a hora. Rodada de
// abertura (24-27/09) é 100% confirmada pelos nomes de time no print. Rodada
// 2 e decisiva (29/09-04/10) vieram como "TBD" no print (sem rótulo de
// grupo), então a ordem de grupo por dia foi INFERIDA repetindo a mesma
// ordem da abertura (C, D, B, A) -- conferir com a Bruna quando os confrontos
// da rodada 2 tiverem time definido. Corrigir também exige rodar
// `npm run fix:vct-champions-dates` contra o banco (não só editar aqui) --
// seedCompeticoes.ts é idempotente e pula confronto já existente, ver
// scripts/fixVctChampionsDates.ts.
//
// Fase eliminatória (mata-mata, a partir de 07/10) e o evento separado "Game
// Changers Championship" (22-24/10, visto no mesmo print) ainda NÃO estão
// neste arquivo -- times de mata-mata só são sabidos depois que os 4 grupos
// terminarem, e o Game Changers Championship é uma competição própria,
// diferente do game-changers-brasil-etapa-final-2026.ts que já existe.
export const vctChampionsShanghai2026: Competicao = {
  id: "vct-champions-shanghai-2026",
  nome: "VCT Champions Shanghai 2026",
  formato: "Fase de grupos (GSL, 4 grupos) + playoffs · 16 times",
  categorias: ["mista"],
  fase: "Fase de grupos",
  status: "agendada",
  capaUrl: "/img/competicoes/vct-champions-shanghai-2026.png",
  linkTwitch: "https://www.twitch.tv/valorant_br",
  linkYoutube: "https://www.youtube.com/@valesportsbr",
  times: [
    // Grupo A
    { id: "100t", nome: "100 Thieves", sigla: "100T", cor: "#C0392B", logoUrl: "/img/competicoes/100t.png" },
    { id: "t1", nome: "T1", sigla: "T1", cor: "#FF1654", logoUrl: "/img/competicoes/t1.png" },
    { id: "jdg", nome: "JD Gaming", sigla: "JDG", cor: "#D4000C", logoUrl: "/img/competicoes/jdg.png" },
    { id: "fut", nome: "FUT Esports", sigla: "FUT", cor: "#F7A800", logoUrl: "/img/competicoes/fut.png" },
    // Grupo B
    { id: "ge", nome: "Global Esports", sigla: "GE", cor: "#00B2A9", logoUrl: "/img/competicoes/ge.png" },
    { id: "vit", nome: "Team Vitality", sigla: "VIT", cor: "#FFE500", logoUrl: "/img/competicoes/vit.png" },
    { id: "loud", nome: "LOUD", sigla: "LOUD", cor: "#6FCF44", logoUrl: "/img/competicoes/loud.png" },
    { id: "edg", nome: "EDward Gaming", sigla: "EDG", cor: "#1B4F9C", logoUrl: "/img/competicoes/edg.png" },
    // Grupo C
    { id: "tyl", nome: "TYLOO", sigla: "TYL", cor: "#4A4A4A", logoUrl: "/img/competicoes/tyl.png" },
    { id: "g2", nome: "G2 Esports", sigla: "G2", cor: "#8E8E93", logoUrl: "/img/competicoes/g2.png" },
    { id: "tl", nome: "Team Liquid", sigla: "TL", cor: "#00A8E1", logoUrl: "/img/competicoes/tl.png" },
    { id: "prx", nome: "Paper Rex", sigla: "PRX", cor: "#C13FCE", logoUrl: "/img/competicoes/prx.png" },
    // Grupo D
    { id: "kc", nome: "Karmine Corp", sigla: "KC", cor: "#1560BD", logoUrl: "/img/competicoes/kc.png" },
    { id: "xlg", nome: "Xi Lai Gaming", sigla: "XLG", cor: "#D42A2A", logoUrl: "/img/competicoes/xlg.png" },
    { id: "ns", nome: "Nongshim RedForce", sigla: "NS", cor: "#DA291C", logoUrl: "/img/competicoes/ns.png" },
    { id: "nrg", nome: "NRG", sigla: "NRG", cor: "#9B59B6", logoUrl: "/img/competicoes/nrg.png" },
  ],
  confrontos: [
    // Grupo A — abertura em 27/09 (era 24/09), corrigido em 21/09/2026 a
    // partir do cronograma oficial (print da Bruna). Rodada 2/decisiva
    // (29/09-04/10) seguem a MESMA ordem de grupo por dia da abertura
    // (C, D, B, A) -- INFERIDO, o print não rotula grupo nos jogos "TBD",
    // só confirma dia+hora. Confirmar com a Bruna antes de bater 100%.
    { id: "A1", chave: "grupos", grupo: "A", data: "2026-09-27T06:00", status: "agendada", ladoA: { tipo: "time", timeId: "100t" }, ladoB: { tipo: "time", timeId: "t1" }, placarA: null, placarB: null },
    { id: "A2", chave: "grupos", grupo: "A", data: "2026-09-27T09:00", status: "agendada", ladoA: { tipo: "time", timeId: "jdg" }, ladoB: { tipo: "time", timeId: "fut" }, placarA: null, placarB: null },
    { id: "A4", chave: "grupos", grupo: "A", data: "2026-10-02T06:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "A1" }, ladoB: { tipo: "vencedor", confrontoId: "A2" }, placarA: null, placarB: null },
    { id: "A3", chave: "grupos", grupo: "A", data: "2026-10-02T09:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "A1" }, ladoB: { tipo: "perdedor", confrontoId: "A2" }, placarA: null, placarB: null },
    { id: "A5", chave: "grupos", grupo: "A", data: "2026-10-04T09:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "A4" }, ladoB: { tipo: "vencedor", confrontoId: "A3" }, placarA: null, placarB: null },

    // Grupo B — abertura em 26/09 (era 25/09).
    { id: "B1", chave: "grupos", grupo: "B", data: "2026-09-26T06:00", status: "agendada", ladoA: { tipo: "time", timeId: "ge" }, ladoB: { tipo: "time", timeId: "vit" }, placarA: null, placarB: null },
    { id: "B2", chave: "grupos", grupo: "B", data: "2026-09-26T09:00", status: "agendada", ladoA: { tipo: "time", timeId: "loud" }, ladoB: { tipo: "time", timeId: "edg" }, placarA: null, placarB: null },
    { id: "B4", chave: "grupos", grupo: "B", data: "2026-10-01T06:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "B1" }, ladoB: { tipo: "vencedor", confrontoId: "B2" }, placarA: null, placarB: null },
    { id: "B3", chave: "grupos", grupo: "B", data: "2026-10-01T09:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "B1" }, ladoB: { tipo: "perdedor", confrontoId: "B2" }, placarA: null, placarB: null },
    { id: "B5", chave: "grupos", grupo: "B", data: "2026-10-04T06:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "B4" }, ladoB: { tipo: "vencedor", confrontoId: "B3" }, placarA: null, placarB: null },

    // Grupo C — abertura em 24/09 (era 26/09) — vira o 1º dia da fase de grupos.
    { id: "C1", chave: "grupos", grupo: "C", data: "2026-09-24T09:00", status: "agendada", ladoA: { tipo: "time", timeId: "tyl" }, ladoB: { tipo: "time", timeId: "g2" }, placarA: null, placarB: null },
    { id: "C2", chave: "grupos", grupo: "C", data: "2026-09-24T06:00", status: "agendada", ladoA: { tipo: "time", timeId: "tl" }, ladoB: { tipo: "time", timeId: "prx" }, placarA: null, placarB: null },
    { id: "C4", chave: "grupos", grupo: "C", data: "2026-09-29T06:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "C1" }, ladoB: { tipo: "vencedor", confrontoId: "C2" }, placarA: null, placarB: null },
    { id: "C3", chave: "grupos", grupo: "C", data: "2026-09-29T09:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "C1" }, ladoB: { tipo: "perdedor", confrontoId: "C2" }, placarA: null, placarB: null },
    { id: "C5", chave: "grupos", grupo: "C", data: "2026-10-03T06:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "C4" }, ladoB: { tipo: "vencedor", confrontoId: "C3" }, placarA: null, placarB: null },

    // Grupo D — abertura em 25/09 (era 27/09).
    { id: "D1", chave: "grupos", grupo: "D", data: "2026-09-25T09:00", status: "agendada", ladoA: { tipo: "time", timeId: "kc" }, ladoB: { tipo: "time", timeId: "xlg" }, placarA: null, placarB: null },
    { id: "D2", chave: "grupos", grupo: "D", data: "2026-09-25T06:00", status: "agendada", ladoA: { tipo: "time", timeId: "ns" }, ladoB: { tipo: "time", timeId: "nrg" }, placarA: null, placarB: null },
    { id: "D4", chave: "grupos", grupo: "D", data: "2026-09-30T06:00", status: "agendada", ladoA: { tipo: "vencedor", confrontoId: "D1" }, ladoB: { tipo: "vencedor", confrontoId: "D2" }, placarA: null, placarB: null },
    { id: "D3", chave: "grupos", grupo: "D", data: "2026-09-30T09:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "D1" }, ladoB: { tipo: "perdedor", confrontoId: "D2" }, placarA: null, placarB: null },
    { id: "D5", chave: "grupos", grupo: "D", data: "2026-10-03T09:00", status: "agendada", ladoA: { tipo: "perdedor", confrontoId: "D4" }, ladoB: { tipo: "vencedor", confrontoId: "D3" }, placarA: null, placarB: null },
  ],
};
