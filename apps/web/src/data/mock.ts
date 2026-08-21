// Dados mockados — mesmos valores do protótipo de design (callout.dc.html).
// Substituir por dados reais vindos da API quando o backend existir.

export const ACC = '#EF4958';
export const POS = '#18AAB7';
export const DIM = 'rgba(255,255,255,.15)';

export const currentUser = {
  handle: 'thiago#BR1',
  rank: 'Ascendente 1',
};

export const team = {
  name: 'Os boys',
  memberCount: 7,
};

export const rankHistory = ['V', 'V', 'D', 'V', 'D', 'D', 'V', 'V', 'V', 'D', 'V', 'D', 'V', 'V'] as const;

export const stats = [
  { label: 'KDA', value: '1,34', delta: '+0,11 vs. 30d', positive: true },
  { label: 'ACS', value: '218', delta: '+9', positive: true },
  { label: 'ADR', value: '141', delta: '−4', positive: false },
  { label: 'HS%', value: '24,6%', delta: '+2,1', positive: true },
  { label: 'WINRATE', value: '57%', delta: '17V · 13D', positive: false },
];

export const byMap = [
  { name: 'Bind', wr: 71 },
  { name: 'Ascent', wr: 62 },
  { name: 'Lotus', wr: 55 },
  { name: 'Haven', wr: 48 },
  { name: 'Split', wr: 40 },
  { name: 'Sunset', wr: 29 },
];

export const byAgent = [
  { name: 'Viper', wr: 68, color: '#18AAB7' },
  { name: 'Raze', wr: 61, color: '#EF4958' },
  { name: 'Skye', wr: 54, color: '#4C5BC4' },
  { name: 'Brimstone', wr: 47, color: '#7B3FA8' },
  { name: 'Jett', wr: 42, color: '#7FD3DB' },
  { name: 'Omen', wr: 33, color: '#4F5258' },
];

export interface RecentMatch {
  id: string;
  res: 'V' | 'D';
  map: string;
  agent: string;
  score: string;
  kda: string;
  when: string;
}

export const recentMatches: RecentMatch[] = [
  { id: '1', res: 'V', map: 'Bind', agent: 'Viper', score: '13—11', kda: '19/12/7', when: 'ontem 23:14' },
  { id: '2', res: 'V', map: 'Ascent', agent: 'Raze', score: '13—8', kda: '24/14/4', when: 'ontem 22:31' },
  { id: '3', res: 'D', map: 'Split', agent: 'Jett', score: '9—13', kda: '15/18/2', when: 'ontem 21:48' },
  { id: '4', res: 'V', map: 'Lotus', agent: 'Viper', score: '13—10', kda: '17/13/9', when: 'sáb 01:12' },
  { id: '5', res: 'D', map: 'Haven', agent: 'Skye', score: '11—13', kda: '13/16/11', when: 'sáb 00:22' },
  { id: '6', res: 'V', map: 'Bind', agent: 'Viper', score: '13—6', kda: '21/9/6', when: 'sex 23:40' },
  { id: '7', res: 'D', map: 'Sunset', agent: 'Omen', score: '5—13', kda: '9/17/4', when: 'sex 22:55' },
];

export const roundResults = [
  1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1,
] as const;

export interface ScoreboardEntry {
  name: string;
  tag: string;
  agent: string;
  acs: number;
  k: number;
  d: number;
  a: number;
  hs: string;
  ours: boolean;
}

export const scoreboard: ScoreboardEntry[] = [
  { name: 'thiago', tag: '#BR1', agent: 'Viper', acs: 268, k: 19, d: 12, a: 7, hs: '27%', ours: true },
  { name: 'lucas', tag: '#5UP', agent: 'Raze', acs: 241, k: 17, d: 14, a: 3, hs: '22%', ours: true },
  { name: 'bento', tag: '#KOR', agent: 'Skye', acs: 198, k: 12, d: 13, a: 11, hs: '19%', ours: true },
  { name: 'nando', tag: '#BR2', agent: 'Brimstone', acs: 176, k: 11, d: 15, a: 8, hs: '17%', ours: true },
  { name: 'pipoca', tag: '#333', agent: 'Jett', acs: 154, k: 10, d: 16, a: 2, hs: '31%', ours: true },
  { name: 'Vermelho1', tag: '', agent: 'Omen', acs: 254, k: 18, d: 13, a: 6, hs: '25%', ours: false },
  { name: 'Vermelho2', tag: '', agent: 'Chamber', acs: 230, k: 16, d: 14, a: 2, hs: '29%', ours: false },
  { name: 'Vermelho3', tag: '', agent: 'Sova', acs: 201, k: 14, d: 15, a: 9, hs: '20%', ours: false },
  { name: 'Vermelho4', tag: '', agent: 'Fade', acs: 188, k: 13, d: 16, a: 7, hs: '18%', ours: false },
  { name: 'Vermelho5', tag: '', agent: 'KAY/O', acs: 143, k: 9, d: 17, a: 4, hs: '15%', ours: false },
];

export const matchComments = [
  { who: '@lucas', when: 'há 2 h', text: 'O retake de B tá péssimo. A gente entra em fila indiana toda vez.' },
  { who: '@bento', when: 'há 1 h', text: 'Round 14 foi clutch puro do thiago, mas o resto do half foi sorte.' },
  { who: '@thiago', when: 'há 40 min', text: 'Vou montar um board pro retake antes de sexta.' },
];

export const myMatchStats = [
  { label: 'ACS', value: '268' },
  { label: 'KDA', value: '2,17' },
  { label: 'ADR', value: '162' },
  { label: 'First bloods', value: '4' },
  { label: 'Clutches', value: '2 de 3' },
  { label: 'Plants', value: '5' },
];

export interface TeamMember {
  name: string;
  role: 'CONTROLADOR' | 'DUELISTA' | 'INICIADOR' | 'SENTINELA';
  rank: string;
  note: string;
  kda: string;
  kdaW: number;
  acs: string;
  acsW: number;
  wr: string;
  wrW: number;
  highlight: boolean;
}

export const teamMembers: TeamMember[] = [
  { name: 'thiago', role: 'CONTROLADOR', rank: 'Ascendente 1', note: 'Segura o mapa inteiro sozinho e reclama depois.', kda: '1,40', kdaW: 58, acs: '248', acsW: 66, wr: '61%', wrW: 61, highlight: true },
  { name: 'lucas', role: 'DUELISTA', rank: 'Ascendente 2', note: 'Entry mais agressivo do grupo. 61% de first blood.', kda: '1,31', kdaW: 53, acs: '234', acsW: 60, wr: '58%', wrW: 58, highlight: false },
  { name: 'bento', role: 'INICIADOR', rank: 'Platina 3', note: 'Flashes limpas, mas morre no reposicionamento.', kda: '1,22', kdaW: 48, acs: '220', acsW: 54, wr: '55%', wrW: 55, highlight: false },
  { name: 'nando', role: 'CONTROLADOR', rank: 'Platina 2', note: 'Smoke no tempo certo. Mira em construção.', kda: '1,13', kdaW: 43, acs: '206', acsW: 48, wr: '52%', wrW: 52, highlight: false },
  { name: 'pipoca', role: 'DUELISTA', rank: 'Ouro 3', note: 'Alta variância. Ou carrega ou desaparece.', kda: '1,04', kdaW: 38, acs: '192', acsW: 42, wr: '49%', wrW: 49, highlight: false },
  { name: 'dedé', role: 'SENTINELA', rank: 'Platina 1', note: 'Melhor winrate defensivo do time.', kda: '0,95', kdaW: 33, acs: '178', acsW: 36, wr: '46%', wrW: 46, highlight: false },
  { name: 'jow', role: 'INICIADOR', rank: 'Ouro 2', note: 'Voltou depois de 6 meses fora.', kda: '0,86', kdaW: 28, acs: '164', acsW: 30, wr: '43%', wrW: 43, highlight: false },
];

export const boardCallouts = [
  { label: 'A SITE', x: '14%', y: '10%' },
  { label: 'HOOKAH', x: '44%', y: '40%' },
  { label: 'MEIO', x: '40%', y: '66%' },
  { label: 'B SITE', x: '76%', y: '20%' },
  { label: 'B LONG', x: '80%', y: '56%' },
  { label: 'SPAWN ATK', x: '28%', y: '90%' },
];

export type PieceKind = 'agent' | 'smoke' | 'flash' | 'molly';

export interface BoardPiece {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: PieceKind;
  color: string;
}

export const initialPieces: BoardPiece[] = [
  { id: 'p1', label: 'VIP', x: 34, y: 46, kind: 'agent', color: '#18AAB7' },
  { id: 'p2', label: 'RAZ', x: 18, y: 76, kind: 'agent', color: '#EF4958' },
  { id: 'p3', label: 'SKY', x: 26, y: 62, kind: 'agent', color: '#4C5BC4' },
  { id: 'p4', label: 'BRI', x: 72, y: 70, kind: 'agent', color: '#7B3FA8' },
  { id: 'p5', label: 'JET', x: 52, y: 34, kind: 'agent', color: '#7FD3DB' },
  { id: 'm1', label: 'S', x: 46, y: 40, kind: 'smoke', color: '#18AAB7' },
  { id: 'm2', label: 'F', x: 60, y: 52, kind: 'flash', color: '#FCFCFC' },
  { id: 'm3', label: 'M', x: 30, y: 72, kind: 'molly', color: '#EF4958' },
];

export const boardArrows = [
  { x1: '18%', y1: '76%', x2: '34%', y2: '46%' },
  { x1: '34%', y1: '46%', x2: '52%', y2: '34%' },
  { x1: '72%', y1: '70%', x2: '60%', y2: '52%' },
];

export interface Strategy {
  id: string;
  name: string;
  side: 'ATK' | 'DEF';
  meta: string;
  description: string;
  savedBy: string;
  editedAt: string;
}

export const strategies: Strategy[] = [
  {
    id: '1',
    name: 'Rush B com molly dupla',
    side: 'ATK',
    meta: 'Bind · 4 usos · 75% WR',
    description:
      'Viper fecha Hookah antes do 0:50. Raze entra por Short com blast, Skye flasha de trás. Se o smoke sair, todo mundo recua pro Meio e joga o default.',
    savedBy: '@lucas',
    editedAt: 'EDITADA HOJE',
  },
  { id: '2', name: 'Default A com fake Hookah', side: 'ATK', meta: 'Bind · 7 usos · 57% WR', description: '', savedBy: '', editedAt: '' },
  { id: '3', name: 'Retake B pela Caverna', side: 'DEF', meta: 'Bind · 3 usos · 33% WR', description: '', savedBy: '', editedAt: '' },
  { id: '4', name: 'Stack Meio agressivo', side: 'DEF', meta: 'Bind · 5 usos · 60% WR', description: '', savedBy: '', editedAt: '' },
  { id: '5', name: 'Split A pelos teleportes', side: 'ATK', meta: 'Bind · 2 usos · 50% WR', description: '', savedBy: '', editedAt: '' },
  { id: '6', name: 'Eco rush Short', side: 'ATK', meta: 'Bind · 6 usos · 66% WR', description: '', savedBy: '', editedAt: '' },
];

export const spotFilters = ['Todos', 'Bind', 'Ascent', 'Lotus', 'Viper', 'Sova', 'Brimstone', 'Ataque'];

export interface Spot {
  agent: string;
  ability: string;
  from: string;
  to: string;
  map: string;
  side: 'ATK' | 'DEF';
  author: string;
  color: string;
}

export const spots: Spot[] = [
  { agent: 'Viper', ability: 'Snake Bite', from: 'B Long', to: 'B Site', map: 'Bind', side: 'ATK', author: '@lucas', color: '#18AAB7' },
  { agent: 'Sova', ability: 'Recon Bolt', from: 'A Short', to: 'A Site', map: 'Bind', side: 'ATK', author: '@thiago', color: '#4C5BC4' },
  { agent: 'Brimstone', ability: 'Incendiary', from: 'Spawn ATK', to: 'Hookah', map: 'Bind', side: 'ATK', author: '@nando', color: '#7B3FA8' },
  { agent: 'Viper', ability: 'Poison Cloud', from: 'Meio', to: 'A Site', map: 'Bind', side: 'ATK', author: '@thiago', color: '#18AAB7' },
  { agent: 'Sova', ability: 'Shock Dart', from: 'B Long', to: 'Plant padrão', map: 'Bind', side: 'ATK', author: '@bento', color: '#4C5BC4' },
  { agent: 'Raze', ability: 'Paint Shells', from: 'Caverna', to: 'B Site', map: 'Bind', side: 'ATK', author: '@lucas', color: '#EF4958' },
  { agent: 'Brimstone', ability: 'Sky Smoke', from: 'Fountain', to: 'A Truck', map: 'Bind', side: 'DEF', author: '@dedé', color: '#7B3FA8' },
  { agent: 'Sova', ability: 'Recon Bolt', from: 'B Site', to: 'Hookah', map: 'Bind', side: 'DEF', author: '@jow', color: '#4C5BC4' },
];
