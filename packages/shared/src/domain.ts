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

export const THEME_MODES = ["dark", "light"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export interface ThemePreferences {
  accentColor: string; // cor principal — também colore valores positivos (vitória, deltas positivos)
  negativeColor: string; // só derrotas/valores negativos
  glow: number; // 0-100
  mode: ThemeMode;
}

// --- Sessão ---

export interface SessionUser {
  discordId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  riotId: { name: string; tag: string; puuid: string } | null;
  equipe: { id: string; name: string } | null;
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

// --- Equipe ---

export type Cargo = "jogador" | "treinador_principal" | "treinador_assistente";

export interface MainAgent {
  uuid: string;
  name: string;
}

export interface MembroEquipeCard {
  userId: string;
  // Nome de exibição — displayName custom (editável só pelo dono do
  // perfil) com fallback pro riotName/discordUsername. Ver
  // ConfiguracoesEquipe pro "Apelido" (Riot ID de verdade, não editável
  // aqui).
  name: string;
  avatarUrl: string | null; // avatarUrl custom (editável só pelo dono do perfil) com fallback pro discordAvatarUrl
  riotIdLabel: string | null; // "apelido" da tela de configurações — "nome#tag" quando vinculado, null senão
  rankLabel: string;
  roles: Funcao[]; // até MAX_FUNCOES — só editável por admin (ver PATCH /equipe/membros/:userId/configuracoes)
  cargo: Cargo; // só editável por admin
  isAdmin: boolean;
  isOwner: boolean; // dono da equipe — permanente, não removível nem rebaixável (ver LAUNCH.md/decisão de 01/09/2026)
  joinedAtLabel: string; // "data de entrada" — pra membros anteriores a 01/09/2026, é a data da migration, não a entrada real
  isSelf: boolean;
  kda: number;
  acs: number;
  hsPercent: number;
  winratePercent: number;
  note: string;
  mainAgents: MainAgent[]; // até MAX_MAIN_AGENTS
  hasRiotLinked: boolean; // Riot ID vinculado — só esses membros têm painel individual pra ver
}

export interface EquipeOverview {
  id: string;
  name: string;
  descricao: string;
  imagemUrl: string | null;
  donoId: string;
  // Código de convite (POST /equipes/entrar) — visível pra qualquer membro
  // da equipe, mesmo espírito de "recado social" ser editável por todo
  // mundo (README do handoff: bagunça de amigos, sem controle de permissão
  // fino nisso — função/cargo/admin já são mais sérios, ver PATCH
  // correspondentes).
  codigoConvite: string;
  memberCount: number;
  matchesTogether30d: number;
  groupWinratePercent: number;
  members: MembroEquipeCard[];
}

// Body do PATCH /equipe — só admin. Todos os campos opcionais (atualiza só
// o que vier).
export interface EquipePerfilInput {
  nome?: string;
  descricao?: string;
  imagemUrl?: string;
}

// Body do PATCH /equipe/membros/:userId/configuracoes — igual "nota",
// qualquer membro da equipe pode editar de qualquer outro (ver README do
// handoff).
export interface ConfiguracoesMembroInput {
  funcoes: Funcao[]; // até MAX_FUNCOES
  mainAgentUuids: string[]; // até MAX_MAIN_AGENTS
}
export const MAX_FUNCOES = 2;
export const MAX_MAIN_AGENTS = 3;

// --- Histórico de partidas da equipe (GET /equipe/partidas) ---
// Só entram partidas com pelo menos MIN_TEAM_MATCH_PLAYERS membros da
// equipe juntos — "meus números" vira uma lista, um item por membro que jogou.
export const MIN_TEAM_MATCH_PLAYERS = 5;

export interface ParticipanteEquipeMatch {
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

export interface PartidaEquipeSummary {
  id: string;
  map: string;
  score: string;
  playedAtLabel: string;
  participants: ParticipanteEquipeMatch[];
}

// --- Painel da equipe (GET /equipe/painel) ---
// Agregado sobre as mesmas partidas "da equipe" do histórico em grupo
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
  matchesPlayed: number;
}

export interface LineupComboMember {
  userId: string;
  name: string;
  agent: string; // agente mais jogado por esse jogador NESSA formação específica, não o favorito dele no geral
}

// Uma partida específica de uma formação — pro card de "Variações de
// time" expandir e listar quais partidas geraram aqueles números.
export interface LineupComboMatch {
  matchId: string;
  result: "V" | "D" | "E";
  score: string;
  map: string;
  playedAtLabel: string;
  agents: Array<{ userId: string; name: string; agent: string }>; // agente jogado por cada um NESSA partida (pode variar partida a partida, diferente do LineupComboMember.agent que é o mais frequente)
}

export interface LineupCombo {
  comboKey: string; // userIds ordenados e concatenados — chave estável
  members: LineupComboMember[];
  wins: number;
  losses: number;
  draws: number; // raro — Riot não expõe empate direto, só via RR ganho (ver matchResult)
  overtimeWins: number; // quantas das vitórias foram na overtime — mostrado ao lado de V, tipo "4 (2OT)"
  overtimeLosses: number; // idem, ao lado de D
  total: number;
  winratePercent: number;
  matches: LineupComboMatch[]; // mais recente primeiro
}

export interface EquipeAgentePick {
  agent: string;
  color: string;
  count: number;
}

// Ranking de agentes (não jogadores) — kills/assistências/first bloods são
// média por partida jogada com aquele agente (mesma base do "impacto", que
// é o ACS médio — misturar total com média deixaria agente pouco jogado
// injustamente baixo ou um agente muito jogado inflado só por volume).
export interface EquipeAgentePerformance {
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

export interface EquipePartidaDestaque {
  matchId: string;
  map: string;
  score: string;
  marginRounds: number;
  playedAtLabel: string;
}

export interface EquipePainelSummary {
  qualifyingMatchCount: number;
  wins: number;
  losses: number;
  winratePercent: number;
  currentStreak: { type: "V" | "D" | null; count: number };
  bestWinStreak: number;
  mapWinrates: MapWinrate[];
  lineupCombos: LineupCombo[];
  bestAgentComposition: BestAgentComposition | null;
  bestAgents: EquipeAgentePerformance[];
  acsRanking: MemberStatRow[];
  assistRanking: MemberStatRow[];
  mvpRanking: MemberStatRow[];
  clutchRanking: MemberClutchRow[];
  firstBloodRanking: MemberStatRow[];
  firstDeathRanking: MemberStatRow[];
  mostPickedAgents: EquipeAgentePick[];
  biggestWin: EquipePartidaDestaque | null;
  worstLoss: EquipePartidaDestaque | null;
  closestMatch: EquipePartidaDestaque | null;
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
  equipeId: string;
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

