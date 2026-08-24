import type { Competicao } from './types';

// Chaveamento oficial do VCT Americas Playoffs 2026 — dupla eliminação, 8
// times. Datas/horários e confrontos conferidos com o bracket oficial em
// 2026-08-24; nenhuma partida rolou ainda. Atualize placarA/placarB e status
// aqui conforme os jogos forem acontecendo — os confrontos que dependem de
// "vencedor"/"perdedor" de outro (ver types.ts) resolvem sozinhos.
export const vctAmericasPlayoffs2026: Competicao = {
  id: 'vct-americas-playoffs-2026',
  nome: 'VCT Americas · Playoffs',
  formato: 'Dupla eliminação · 8 times',
  categorias: ['mista'],
  fase: 'Primeira rodada',
  status: 'agendada',
  times: [
    { id: 'loud', nome: 'LOUD', sigla: 'LOUD', cor: '#6FCF44' },
    { id: 'fur', nome: 'FURIA', sigla: 'FUR', cor: '#B9B9BD' },
    { id: 'lev', nome: 'Leviatán', sigla: 'LEV', cor: '#3B82F6' },
    { id: 'mibr', nome: 'MIBR', sigla: 'MIBR', cor: '#F2C94C' },
    { id: 'nrg', nome: 'NRG', sigla: 'NRG', cor: '#9B59B6' },
    { id: '100t', nome: '100 Thieves', sigla: '100T', cor: '#C0392B' },
    { id: 'g2', nome: 'G2 Esports', sigla: 'G2', cor: '#8E8E93' },
    { id: 'eg', nome: 'Evil Geniuses', sigla: 'EG', cor: '#17A398' },
  ],
  confrontos: [
    // Chave superior — rodada 1
    { id: 'P1', chave: 'superior', data: '2026-08-27T18:00', status: 'agendada', ladoA: { tipo: 'time', timeId: 'loud' }, ladoB: { tipo: 'time', timeId: 'fur' }, placarA: null, placarB: null },
    { id: 'P2', chave: 'superior', data: '2026-08-27T21:00', status: 'agendada', ladoA: { tipo: 'time', timeId: 'lev' }, ladoB: { tipo: 'time', timeId: 'mibr' }, placarA: null, placarB: null },

    // Chave superior — rodada 2
    { id: 'P3', chave: 'superior', data: '2026-08-28T18:00', status: 'agendada', ladoA: { tipo: 'time', timeId: 'nrg' }, ladoB: { tipo: 'vencedor', confrontoId: 'P1' }, placarA: null, placarB: null },
    { id: 'P4', chave: 'superior', data: '2026-08-28T21:00', status: 'agendada', ladoA: { tipo: 'time', timeId: '100t' }, ladoB: { tipo: 'vencedor', confrontoId: 'P2' }, placarA: null, placarB: null },

    // Chave inferior — rodada 1
    { id: 'P5', chave: 'inferior', data: '2026-08-29T18:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'P1' }, ladoB: { tipo: 'time', timeId: 'g2' }, placarA: null, placarB: null },
    { id: 'P6', chave: 'inferior', data: '2026-08-29T21:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'P2' }, ladoB: { tipo: 'time', timeId: 'eg' }, placarA: null, placarB: null },

    // Chave inferior — rodada 2
    { id: 'P7', chave: 'inferior', data: '2026-08-30T18:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'P4' }, ladoB: { tipo: 'vencedor', confrontoId: 'P5' }, placarA: null, placarB: null },
    { id: 'P8', chave: 'inferior', data: '2026-08-30T21:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'P3' }, ladoB: { tipo: 'vencedor', confrontoId: 'P6' }, placarA: null, placarB: null },

    // Semifinais das chaves
    { id: 'P9', chave: 'superior', data: '2026-09-04T14:00', status: 'agendada', ladoA: { tipo: 'vencedor', confrontoId: 'P3' }, ladoB: { tipo: 'vencedor', confrontoId: 'P4' }, placarA: null, placarB: null },
    { id: 'P10', chave: 'inferior', data: '2026-09-04T17:00', status: 'agendada', ladoA: { tipo: 'vencedor', confrontoId: 'P7' }, ladoB: { tipo: 'vencedor', confrontoId: 'P8' }, placarA: null, placarB: null },
    { id: 'P11', chave: 'inferior', data: '2026-09-05T14:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'P9' }, ladoB: { tipo: 'vencedor', confrontoId: 'P10' }, placarA: null, placarB: null },

    // Grande final
    { id: 'FINAL', chave: 'final', data: '2026-09-06T14:00', status: 'agendada', ladoA: { tipo: 'vencedor', confrontoId: 'P9' }, ladoB: { tipo: 'vencedor', confrontoId: 'P11' }, placarA: null, placarB: null },
  ],
};
