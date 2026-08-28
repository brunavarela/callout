/**
 * Entidades de domínio e DTOs compartilhados entre `apps/api` e `apps/web`.
 *
 * Duas famílias de tipo aqui:
 *  - Entidades (User, MapAsset, AgentAsset...) — espelham o schema do
 *    Postgres em context.md §7. A fonte de verdade do schema é
 *    `apps/api/prisma/schema.prisma`; isto é a projeção pública dele.
 *  - DTOs (DashboardSummary, MatchDetail...) — o formato que a API
 *    devolve pros endpoints que o front consome. Modelados a partir dos
 *    dados que o handoff de design pede em cada tela.
 */

export type Funcao = "controlador" | "duelista" | "iniciador" | "sentinela" | "flex";

export type Lado = "ATK" | "DEF";

// --- Entidades ---

export interface User {
  id: string;
  discordId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  riotPuuid: string | null;
  riotName: string | null;
  riotTag: string | null;
  funcaoPreferida: Funcao | null;
  createdAt: string;
}

export interface MapAsset {
  id: string;
  uuid: string;
  nome: string;
  displayIcon: string | null;
  xMultiplier: number;
  yMultiplier: number;
  xScalar: number;
  yScalar: number;
  callouts: Array<{ regionName: string; superRegionName: string; x: number; y: number }>;
}

export interface AgentAsset {
  id: string;
  uuid: string;
  nome: string;
  funcao: string;
  displayIcon: string | null;
  cor: string;
}

// --- Tema (v2 — customização em runtime, ver design_handoff_callout v2) ---

// Paleta fechada — fonte única pro front (seletor de cor) e pro back
// (validação do PATCH /me/theme). Duplicar isso nos dois lados foi o que
// causou o bug de "cor nova no seletor mas o back rejeita".
export const THEME_PALETTE = ["#EF4958", "#18AAB7", "#192573", "#421662", "#2FB170", "#F2994A"] as const;

export interface ThemePreferences {
  accentColor: string; // cor principal — também colore valores positivos (vitória, deltas positivos)
  negativeColor: string; // só derrotas/valores negativos
  glow: number; // 0-100
  tintedCards: boolean;
}

// --- Sessão ---

export interface SessionUser {
  discordId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  riotId: { name: string; tag: string; puuid: string } | null;
  theme: ThemePreferences;
  isAdmin: boolean;
}

// --- Progressão de RR ---

export interface RrHistoryPoint {
  matchId: string;
  label: string; // data curta da partida, ex.: "12/08"
  delta: number; // RR ganho/perdido especificamente nessa partida
  map: string;
  agent: string;
  result: "V" | "D" | "E";
}

// --- Lados (ataque/defesa/overtime) ---

export interface SidesBreakdown {
  attack: { winratePercent: number; wins: number; total: number };
  defense: { winratePercent: number; wins: number; total: number };
  overtime: { wins: number; total: number };
}

// --- Sincronização ---

export type SyncState = "idle" | "syncing" | "stale" | "failed";

export interface SyncStatus {
  state: SyncState;
  progress?: { done: number; total: number };
  lastSuccessAt?: string;
  reason?: string;
}

// --- Dashboard individual ---

// Valores batem com `Match.modo` (ver apps/api/src/lib/sync.ts), que vem do
// `queue.name` da HenrikDev — "Competitive" e "Unrated" são os dois modos
// com partida ranqueada/não ranqueada que fazem sentido filtrar por aqui.
export type MatchModeFilter = "all" | "Competitive" | "Unrated";

// Janela de partidas usada pelo gráfico de RR e pelos tópicos de análise
// (mapa/agente mais jogado, KDA negativo, MVP) — os dois precisam usar a
// mesma janela pra os números baterem entre si.
export type MatchCountFilter = 7 | 20;

export interface KpiValue {
  value: number;
  delta: number;
  spark: number[]; // últimas partidas, mais antiga primeiro — alimenta o sparkline do card
}

export interface DashboardKpis {
  kda: KpiValue;
  acs: KpiValue;
  adr: KpiValue;
  hsPercent: KpiValue;
  winrate: { value: number; wins: number; losses: number; delta: number; spark: number[] };
}

export interface MapWinrate {
  map: string;
  mapId: string | null; // pro filtro de mapa do painel — null se essa partida nunca casou com um MapAsset
  winratePercent: number;
  wins: number;
  total: number;
}

export interface AgentWinrate {
  agent: string;
  winratePercent: number;
  color: string;
  wins: number;
  total: number;
}

export interface RecentMatchSummary {
  id: string;
  result: "V" | "D" | "E";
  map: string;
  agent: string;
  score: string;
  kda: string;
  hsPercent: number;
  mvp: boolean;
  ace: boolean;
  rr: number | null;
  playedAtLabel: string;
}

export interface RecentFormInsights {
  matchesAnalyzed: number;
  topMap: { map: string; total: number; wins: number } | null;
  topAgent: { agent: string; total: number; wins: number } | null;
  negativeKdaMatches: number;
  mvpMatches: number;
}

export interface DashboardSummary {
  rank: { current: string; rr: number; rrDelta7d: number; iconUrl: string | null };
  last14Results: Array<"V" | "D" | "E">;
  kpis: DashboardKpis;
  hasComparison: boolean; // false quando não há partida nenhuma nos 30-60 dias anteriores — os deltas dos KPIs vêm forçados a 0 e não devem ser mostrados como "sem variação"
  mapWinrates: MapWinrate[];
  agentWinrates: AgentWinrate[];
  recentMatches: RecentMatchSummary[];
  sync: SyncStatus;
  dataAgeLabel?: string;
}

// Resposta de GET /dashboard/rr-history — RR e os 4 tópicos de análise
// vivem no mesmo card na tela e usam o mesmo filtro de partidas (7/20),
// então saem juntos numa fetch só, independente do resto do /dashboard.
export interface RrHistoryResponse {
  points: RrHistoryPoint[];
  formInsights: RecentFormInsights;
}

// --- Detalhe de partida ---

export interface RoundResult {
  number: number;
  wonBySelf: boolean;
}

export interface MatchPlayerRow {
  puuid: string;
  name: string;
  tag: string;
  side: "own" | "opponent";
  isSelf: boolean;
  agent: string;
  agentColor: string;
  acs: number;
  kills: number;
  deaths: number;
  assists: number;
  hsPercent: number;
}

export interface CommentDTO {
  id: string;
  entidadeTipo: "match" | "strategy" | "spot";
  entidadeId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAtLabel: string;
  text: string;
}

export interface MatchDetail {
  id: string;
  mode: string;
  map: string;
  playedAtLabel: string;
  durationLabel: string;
  score: { own: number; opponent: number };
  rounds: RoundResult[];
  players: MatchPlayerRow[];
  myStats: {
    acs: number;
    kda: number;
    adr: number;
    firstBloods: number;
    clutchesWon: number;
    clutchesPlayed: number;
    plants: number;
  };
}

// --- Time ---

export interface MainAgent {
  uuid: string;
  name: string;
}

export interface TeamMemberCard {
  userId: string;
  name: string;
  rankLabel: string;
  roles: Funcao[]; // até MAX_FUNCOES
  isSelf: boolean;
  kda: number;
  acs: number;
  winratePercent: number;
  note: string;
  mainAgents: MainAgent[]; // até MAX_MAIN_AGENTS
  hasRiotLinked: boolean; // Riot ID vinculado — só esses membros têm painel individual pra ver
}

export interface TeamOverview {
  id: string;
  name: string;
  memberCount: number;
  matchesTogether30d: number;
  groupWinratePercent: number;
  members: TeamMemberCard[];
}

// Body do PATCH /team/members/:userId/settings — igual "nota", qualquer
// membro do time pode editar de qualquer outro (ver README do handoff).
export interface TeamMemberSettingsInput {
  funcoes: Funcao[]; // até MAX_FUNCOES
  mainAgentUuids: string[]; // até MAX_MAIN_AGENTS
}
export const MAX_FUNCOES = 2;
export const MAX_MAIN_AGENTS = 3;

// --- Histórico de partidas do time (GET /team/matches) ---
// Só entram partidas com pelo menos MIN_TEAM_MATCH_PLAYERS membros do time
// juntos — "meus números" vira uma lista, um item por membro que jogou.
export const MIN_TEAM_MATCH_PLAYERS = 5;

export interface TeamMatchParticipant {
  userId: string;
  name: string;
  agent: string;
  kda: string;
  acs: number;
  hsPercent: number;
  mvp: boolean;
  ace: boolean;
  rr: number | null;
  result: "V" | "D" | "E";
}

export interface TeamMatchSummary {
  id: string;
  map: string;
  score: string;
  playedAtLabel: string;
  participants: TeamMatchParticipant[];
}

// --- Painel do time (GET /team/dashboard) ---
// Agregado sobre as mesmas partidas "do time" do histórico em grupo
// (>=MIN_TEAM_MATCH_PLAYERS membros rastreados juntos, do mesmo lado).

// Forma genérica pra qualquer ranking "nome + valor" — ACS médio,
// assistências, MVPs, first bloods, agentes mais pickados etc. Uma forma só
// em vez de uma interface quase idêntica pra cada métrica.
export interface MemberStatRow {
  userId: string;
  name: string;
  value: number;
  matchesPlayed: number;
}

export interface MemberClutchRow {
  userId: string;
  name: string;
  clutchesWon: number;
  clutchesPlayed: number;
}

export interface LineupComboMember {
  userId: string;
  name: string;
  agent: string; // agente mais jogado por esse jogador NESSA formação específica, não o favorito dele no geral
}

export interface LineupCombo {
  comboKey: string; // userIds ordenados e concatenados — chave estável
  members: LineupComboMember[];
  wins: number;
  losses: number;
  overtimeCount: number;
  total: number;
  winratePercent: number;
}

export interface TeamAgentPick {
  agent: string;
  color: string;
  count: number;
}

// Ranking de agentes (não jogadores) — kills/assistências/first bloods são
// média por partida jogada com aquele agente (mesma base do "impacto", que
// é o ACS médio — misturar total com média deixaria agente pouco jogado
// injustamente baixo ou um agente muito jogado inflado só por volume).
export interface TeamAgentPerformance {
  agent: string;
  color: string;
  picks: number;
  kills: number;
  assists: number;
  firstBloods: number;
  impact: number;
}

// A composição de 5 agentes (não jogadores — a mesma composição pode ter
// sido jogada por formações de pessoas diferentes) com mais vitórias.
// `isFallback` = não teve nenhuma composição repetida com mais de 1
// vitória, então isso é só a composição da vitória mais recente do time.
export interface BestAgentComposition {
  agents: string[];
  wins: number;
  total: number;
  isFallback: boolean;
  playedAtLabel: string | null;
}

export interface TeamStandoutMatch {
  matchId: string;
  map: string;
  score: string;
  marginRounds: number;
  playedAtLabel: string;
}

export interface TeamDashboardSummary {
  qualifyingMatchCount: number;
  wins: number;
  losses: number;
  winratePercent: number;
  currentStreak: { type: "V" | "D" | null; count: number };
  bestWinStreak: number;
  mapWinrates: MapWinrate[];
  lineupCombos: LineupCombo[];
  bestAgentComposition: BestAgentComposition | null;
  bestAgents: TeamAgentPerformance[];
  acsRanking: MemberStatRow[];
  assistRanking: MemberStatRow[];
  mvpRanking: MemberStatRow[];
  clutchRanking: MemberClutchRow[];
  firstBloodRanking: MemberStatRow[];
  firstDeathRanking: MemberStatRow[];
  mostPickedAgents: TeamAgentPick[];
  biggestWin: TeamStandoutMatch | null;
  closestMatch: TeamStandoutMatch | null;
}

// --- Board de estratégia ---

export type StratItemKind = "agent" | "smoke" | "flash" | "molly" | "spike" | "arrow" | "line";

export interface StratItem {
  id: string;
  kind: StratItemKind;
  label: string;
  x: number;
  y: number;
  color: string;
  agentId?: string;
  points?: Array<{ x: number; y: number }>;
}

export interface Strategy {
  id: string;
  teamId: string;
  mapId: string;
  mapName: string;
  mapDisplayIcon: string | null;
  side: Lado;
  title: string;
  description: string;
  createdBy: string;
  updatedAtLabel: string;
  usageCount: number;
  winratePercent: number;
  items: StratItem[];
  comments: CommentDTO[];
}

// --- Spots / lineups ---

export interface Spot {
  id: string;
  mapId: string;
  mapName: string;
  agentId: string;
  agent: string;
  agentColor: string;
  descricao: string;
  imagens: string[]; // até 3, data URLs
  link: string | null; // YouTube ou Instagram
  author: string;
  side: Lado;
}

