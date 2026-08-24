import type { Competicao } from './types';

// Chaveamento oficial do VALORANT Game Changers Brazil — Etapa Final, dupla
// eliminação, 8 times. Conferido com o bracket oficial em 2026-08-24;
// chave superior praticamente decidida, chave inferior chegando em B3/B4.
// Atualize placarA/placarB e status aqui conforme os jogos rolarem — ver
// vct-americas-playoffs-2026.ts pro mesmo padrão.
export const gameChangersBrasilEtapaFinal2026: Competicao = {
  id: 'game-changers-brasil-etapa-final-2026',
  nome: 'VALORANT Game Changers Brasil · Etapa Final',
  formato: 'Dupla eliminação · 8 times',
  categorias: ['inclusiva'],
  fase: 'Chave inferior',
  status: 'em_andamento',
  linkTwitch: 'https://www.twitch.tv/valorant_br',
  linkYoutube: 'https://www.youtube.com/@valesportsbr',
  times: [
    { id: 'mibr', nome: 'MIBR', sigla: 'MIBR', cor: '#F2C94C' },
    { id: 'gato', nome: 'GATO', sigla: 'GATO', cor: '#D98E4A' },
    { id: 'ushi', nome: 'USHI', sigla: 'USHI', cor: '#4C9F70' },
    { id: 'aog', nome: 'AOG', sigla: 'AOG', cor: '#6C7A89' },
    { id: 'tlv', nome: 'TLV', sigla: 'TLV', cor: '#2F80ED' },
    { id: 'evil', nome: 'EVIL', sigla: 'EVIL', cor: '#7B3FA8' },
    { id: 'eg', nome: 'EG', sigla: 'EG', cor: '#17A398' },
    { id: 'ars', nome: 'ARS', sigla: 'ARS', cor: '#C0392B' },
  ],
  confrontos: [
    // Chave superior — rodada 1
    { id: 'A1', chave: 'superior', data: '2026-08-10T17:00', status: 'encerrada', ladoA: { tipo: 'time', timeId: 'mibr' }, ladoB: { tipo: 'time', timeId: 'gato' }, placarA: 2, placarB: 0 },
    { id: 'A2', chave: 'superior', data: '2026-08-10T20:00', status: 'encerrada', ladoA: { tipo: 'time', timeId: 'ushi' }, ladoB: { tipo: 'time', timeId: 'aog' }, placarA: 2, placarB: 0 },
    { id: 'A3', chave: 'superior', data: '2026-08-11T17:00', status: 'encerrada', ladoA: { tipo: 'time', timeId: 'tlv' }, ladoB: { tipo: 'time', timeId: 'evil' }, placarA: 2, placarB: 0 },
    { id: 'A4', chave: 'superior', data: '2026-08-11T20:00', status: 'encerrada', ladoA: { tipo: 'time', timeId: 'eg' }, ladoB: { tipo: 'time', timeId: 'ars' }, placarA: 2, placarB: 0 },

    // Chave superior — rodada 2
    { id: 'A5', chave: 'superior', data: '2026-08-18T17:00', status: 'encerrada', ladoA: { tipo: 'vencedor', confrontoId: 'A1' }, ladoB: { tipo: 'vencedor', confrontoId: 'A2' }, placarA: 2, placarB: 0 },
    { id: 'A6', chave: 'superior', data: '2026-08-18T20:00', status: 'encerrada', ladoA: { tipo: 'vencedor', confrontoId: 'A3' }, ladoB: { tipo: 'vencedor', confrontoId: 'A4' }, placarA: 2, placarB: 0 },

    // Chave inferior — rodada 1
    { id: 'B1', chave: 'inferior', data: '2026-08-17T17:00', status: 'encerrada', ladoA: { tipo: 'perdedor', confrontoId: 'A2' }, ladoB: { tipo: 'perdedor', confrontoId: 'A1' }, placarA: 2, placarB: 0 },
    { id: 'B2', chave: 'inferior', data: '2026-08-17T20:00', status: 'encerrada', ladoA: { tipo: 'perdedor', confrontoId: 'A4' }, ladoB: { tipo: 'perdedor', confrontoId: 'A3' }, placarA: 2, placarB: 0 },

    // Chave inferior — rodada 2
    { id: 'B3', chave: 'inferior', data: '2026-08-24T17:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'A6' }, ladoB: { tipo: 'vencedor', confrontoId: 'B1' }, placarA: null, placarB: null },
    { id: 'B4', chave: 'inferior', data: '2026-08-24T20:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'A5' }, ladoB: { tipo: 'vencedor', confrontoId: 'B2' }, placarA: null, placarB: null },

    // Semifinal da chave superior
    { id: 'A7', chave: 'superior', data: '2026-09-09T20:00', status: 'agendada', ladoA: { tipo: 'vencedor', confrontoId: 'A5' }, ladoB: { tipo: 'vencedor', confrontoId: 'A6' }, placarA: null, placarB: null },

    // Chave inferior — rodadas finais
    { id: 'B5', chave: 'inferior', data: '2026-09-09T17:00', status: 'agendada', ladoA: { tipo: 'vencedor', confrontoId: 'B3' }, ladoB: { tipo: 'vencedor', confrontoId: 'B4' }, placarA: null, placarB: null },
    { id: 'B6', chave: 'inferior', data: '2026-09-10T17:00', status: 'agendada', ladoA: { tipo: 'perdedor', confrontoId: 'A7' }, ladoB: { tipo: 'vencedor', confrontoId: 'B5' }, placarA: null, placarB: null },

    // Grande final
    { id: 'FINAL', chave: 'final', data: '2026-09-11T18:00', status: 'agendada', ladoA: { tipo: 'vencedor', confrontoId: 'A7' }, ladoB: { tipo: 'vencedor', confrontoId: 'B6' }, placarA: null, placarB: null },
  ],
};
