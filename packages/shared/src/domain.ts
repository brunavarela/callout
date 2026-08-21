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

export type Funcao = "controlador" | "duelista" | "iniciador" | "sentinela";

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

export interface ThemePreferences {
  accentColor: string;
  positiveColor: string;
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
}

// --- Progressão de RR ---

export interface RrHistoryPoint {
  label: string; // dia formatado, ex.: "seg", "12/08"
  delta: number; // soma de RR ganho/perdido naquele dia
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
  winrate: { value: number; wins: number; losses: number };
}

export interface MapWinrate {
  map: string;
  winratePercent: number;
}

export interface AgentWinrate {
  agent: string;
  winratePercent: number;
  color: string;
}

export interface RecentMatchSummary {
  id: string;
  result: "V" | "D";
  map: string;
  agent: string;
  score: string;
  kda: string;
  playedAtLabel: string;
}

export interface DashboardSummary {
  rank: { current: string; rr: number; rrDelta7d: number };
  last14Results: Array<"V" | "D">;
  kpis: DashboardKpis;
  mapWinrates: MapWinrate[];
  agentWinrates: AgentWinrate[];
  recentMatches: RecentMatchSummary[];
  sync: SyncStatus;
  dataAgeLabel?: string;
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
  comments: CommentDTO[];
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

export interface TeamMemberCard {
  userId: string;
  name: string;
  rankLabel: string;
  role: Funcao;
  isSelf: boolean;
  kda: number;
  acs: number;
  winratePercent: number;
  note: string;
}

export interface TeamOverview {
  id: string;
  name: string;
  memberCount: number;
  matchesTogether30d: number;
  groupWinratePercent: number;
  members: TeamMemberCard[];
}

// --- Board de estratégia ---

export type StratItemKind = "agent" | "smoke" | "flash" | "molly" | "arrow" | "line";

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
  mapName: string;
  agent: string;
  agentColor: string;
  habilidade: string;
  origin: { x: number; y: number };
  target: { x: number; y: number };
  mediaUrl: string | null;
  notas: string | null;
  author: string;
  side: Lado;
}
