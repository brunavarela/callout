import type { EquipeOverview, MatchCountFilter } from '@callout/shared';
import { Select } from './Select';
import { formatSeasonShort } from '../lib/seasonFormat';

// Só a largura -- o resto (sem caixa, sublinha no hover) vem da classe
// "filter-select" (ver .select-trigger.filter-select no index.css).
const FILTER_STYLE: React.CSSProperties = { width: 'auto' };

// Filtro "ver painel de outro membro" — só entram membros da equipe com
// Riot ID vinculado (m.hasRiotLinked), já que sem isso não tem partida
// sincronizada pra montar painel nenhum. Não aparece quando ninguém além
// de você mesmo está nessa condição.
export function MemberFilterSelect({
  equipe,
  selectedMemberId,
  setSelectedMemberId,
}: {
  equipe: EquipeOverview | null;
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
}) {
  const options = (equipe?.members ?? []).filter((m) => m.hasRiotLinked && !m.isSelf);
  if (options.length === 0) return null;

  return (
    <Select
      value={selectedMemberId ?? 'self'}
      onChange={(v) => setSelectedMemberId(v === 'self' ? null : v)}
      options={[{ value: 'self', label: 'Você' }, ...options.map((m) => ({ value: m.userId, label: m.name }))]}
      title="Ver painel de outro membro do time"
      style={FILTER_STYLE}
      className="filter-select"
    />
  );
}

// Seletor de ato — usado só pelo histórico da equipe (EquipePartidas.tsx),
// que continua escopado por ato; a Visão do ato individual trocou esse
// seletor pelo MatchCountFilterSelect abaixo (ver conversa de 14/09/2026).
export function SeasonFilterSelect({
  availableSeasons,
  seasonId,
  setSelectedSeasonId,
}: {
  availableSeasons: Array<{ seasonId: string; seasonShort: string }>;
  seasonId: string | null;
  setSelectedSeasonId: (id: string | null) => void;
}) {
  if (availableSeasons.length <= 1) return null;
  return (
    <Select
      value={seasonId ?? availableSeasons[0]!.seasonId}
      onChange={setSelectedSeasonId}
      options={availableSeasons.map((s) => ({ value: s.seasonId, label: formatSeasonShort(s.seasonShort) }))}
      title="Escolher o ato"
      style={FILTER_STYLE}
      className="filter-select"
    />
  );
}

// Rótulos do filtro de contagem de partidas — o filtro que escopa a Visão
// do ato inteira (KPIs, Agentes, Mapa, Precisão, Ataque-defesa, Armas,
// Funções e o gráfico de RR/tópicos de análise). A lista de Partidas, de
// propósito, não respeita esse filtro (ver SeasonMatchesList).
const MATCH_COUNT_LABELS: Record<MatchCountFilter, string> = {
  all: 'Todas as partidas',
  20: 'Últimas 20 partidas',
  7: 'Últimas 7 partidas',
};

export function MatchCountFilterSelect({
  matchCountFilter,
  setMatchCountFilter,
}: {
  matchCountFilter: MatchCountFilter;
  setMatchCountFilter: (n: MatchCountFilter) => void;
}) {
  return (
    <Select
      value={String(matchCountFilter)}
      onChange={(v) => setMatchCountFilter(v === 'all' ? 'all' : v === '7' ? 7 : 20)}
      options={(['all', 20, 7] as const).map((n) => ({ value: String(n), label: MATCH_COUNT_LABELS[n] }))}
      title="Quantas partidas considerar"
      style={FILTER_STYLE}
      className="filter-select"
    />
  );
}

// Filtro de mapa — opções vêm dos mapas que a pessoa selecionada jogou
// nesse ato, não do catálogo geral.
export function SeasonMapFilterSelect({
  topMaps,
  mapFilter,
  setMapFilter,
}: {
  topMaps: Array<{ map: string; mapId: string | null }>;
  mapFilter: string | null;
  setMapFilter: (id: string | null) => void;
}) {
  const options = topMaps.filter((m): m is { map: string; mapId: string } => m.mapId !== null);
  if (options.length === 0) return null;

  return (
    <Select
      value={mapFilter ?? 'all'}
      onChange={(v) => setMapFilter(v === 'all' ? null : v)}
      options={[{ value: 'all', label: 'Todos os mapas' }, ...options.map((m) => ({ value: m.mapId, label: m.map }))]}
      title="Filtrar por mapa"
      style={FILTER_STYLE}
      className="filter-select"
    />
  );
}

// Filtro de agente — opções vêm dos agentes que a pessoa selecionada jogou
// nesse ato.
export function SeasonAgentFilterSelect({
  topAgents,
  agentFilter,
  setAgentFilter,
}: {
  topAgents: Array<{ agent: string }>;
  agentFilter: string | null;
  setAgentFilter: (agent: string | null) => void;
}) {
  if (topAgents.length === 0) return null;

  return (
    <Select
      value={agentFilter ?? 'all'}
      onChange={(v) => setAgentFilter(v === 'all' ? null : v)}
      options={[{ value: 'all', label: 'Todos os agentes' }, ...topAgents.map((a) => ({ value: a.agent, label: a.agent }))]}
      title="Filtrar por agente"
      style={FILTER_STYLE}
      className="filter-select"
    />
  );
}

// Rótulos em português pra Match.modo (valor bruto do queue.name da
// HenrikDev) — cai no valor bruto pra qualquer modo novo/raro sem label
// mapeado ainda, em vez de esconder a opção.
export const MODO_LABELS: Record<string, string> = {
  Competitive: 'Competitivo',
  Unrated: 'Não-classificatória',
  Premier: 'Premier',
  Deathmatch: 'Deathmatch',
  'Team Deathmatch': 'Deathmatch em equipe',
  'Spike Rush': 'Spike Rush',
  Escalation: 'Escalation',
  Swiftplay: 'Swiftplay',
  'Custom Game': 'Partida personalizada',
};

// Filtro de modo de jogo — sem filtro (padrão), mistura só os modos com
// estatística de verdade (Competitivo/Sem classificação/Premier); escolher
// um modo específico mostra só esse, mesmo que normalmente não conte pra
// estatística (ex.: Deathmatch).
export function SeasonModoFilterSelect({
  availableModos,
  modoFilter,
  setModoFilter,
}: {
  availableModos: string[];
  modoFilter: string | null;
  setModoFilter: (modo: string | null) => void;
}) {
  if (availableModos.length <= 1) return null;

  return (
    <Select
      value={modoFilter ?? 'all'}
      onChange={(v) => setModoFilter(v === 'all' ? null : v)}
      options={[{ value: 'all', label: 'Todos os modos' }, ...availableModos.map((m) => ({ value: m, label: MODO_LABELS[m] ?? m }))]}
      title="Filtrar por modo de jogo"
      style={FILTER_STYLE}
      className="filter-select"
    />
  );
}

// Controles de paginação — "Página X de Y" + Anterior/Próxima. Usado tanto
// na lista de partidas do painel quanto no histórico da equipe — cada um
// com seu próprio tamanho de página (`pageSize` vem do back).
export function PageControls({ page, pageSize, total, setPage }: { page: number; pageSize: number; total: number; setPage: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '12px 0 4px' }}>
      <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 14px', fontSize: 12.5, opacity: page <= 1 ? 0.5 : 1 }}>
        Anterior
      </button>
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
        Página {page} de {totalPages}
      </span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 14px', fontSize: 12.5, opacity: page >= totalPages ? 0.5 : 1 }}>
        Próxima
      </button>
    </div>
  );
}
