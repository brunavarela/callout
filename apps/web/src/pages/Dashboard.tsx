import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SessionUser, EquipeOverview } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { Select } from '../components/Select';
import { SeasonOverviewSection, formatSeasonShort, formatPlaytime } from '../components/SeasonOverviewSection';
import { cardStyle, plural } from '../components/statsPrimitives';
import { useSession } from '../lib/session';

function firstName(user: SessionUser | null): string {
  return user?.riotId?.name ?? user?.nome ?? '';
}

// Filtro "ver painel de outro membro" — só entram membros da equipe com
// Riot ID vinculado (m.hasRiotLinked), já que sem isso não tem partida
// sincronizada pra montar painel nenhum. Não aparece quando ninguém além
// de você mesmo está nessa condição.
function MemberFilterSelect({
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
      style={{ width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
    />
  );
}

// Seletor de ato — mostra o ato atual por padrão; trocar aqui reescopa o
// painel inteiro (KPIs, partidas, cards) pro ato escolhido.
function SeasonFilterSelect({
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
      style={{ width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
    />
  );
}

// Filtro de mapa da Visão do ato — opções vêm de topMaps (os mapas que a
// pessoa selecionada jogou nesse ato), não do catálogo geral.
function SeasonMapFilterSelect({
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
      title="Filtrar o painel por mapa"
      style={{ width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
    />
  );
}

// Filtro de agente da Visão do ato — opções vêm de topAgents (os agentes
// que a pessoa selecionada jogou nesse ato).
function SeasonAgentFilterSelect({
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
      title="Filtrar o painel por agente"
      style={{ width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
    />
  );
}

// Rótulos em português pra Match.modo (valor bruto do queue.name da
// HenrikDev) — cai no valor bruto pra qualquer modo novo/raro sem label
// mapeado ainda, em vez de esconder a opção.
const MODO_LABELS: Record<string, string> = {
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

// Filtro de modo de jogo da Visão do ato — sem filtro (padrão), mistura só
// os modos com estatística de verdade (Competitivo/Sem classificação/
// Premier); escolher um modo específico mostra só esse, mesmo que
// normalmente não conte pra estatística (ex.: Deathmatch).
function SeasonModoFilterSelect({
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
      title="Filtrar o painel por modo de jogo"
      style={{ width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
    />
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const {
    seasonOverview,
    seasonOverviewLoading,
    seasonOverviewError,
    setSelectedSeasonId,
    seasonMapFilter,
    setSeasonMapFilter,
    seasonAgentFilter,
    setSeasonAgentFilter,
    seasonModoFilter,
    setSeasonModoFilter,
    equipe,
    selectedMemberId,
    setSelectedMemberId,
  } = useOutletContext<OutletContext>();
  const { user } = useSession();

  const selectedMember = selectedMemberId ? (equipe?.members.find((m) => m.userId === selectedMemberId) ?? null) : null;
  const isSelf = !selectedMemberId;
  const subject = selectedMember?.name ?? 'você';

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-.025em', margin: 0 }}>
            {isSelf ? `E aí, ${firstName(user)}` : `Espiando ${subject}`}
          </h1>
          {seasonOverview && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
              {plural(seasonOverview.matchesCount, 'partida')} ·{' '}
              {seasonOverview.seasonShort ? formatSeasonShort(seasonOverview.seasonShort) : 'ato atual'} · {formatPlaytime(seasonOverview.playtimeMs)} jogadas · {seasonOverview.wins}V–{seasonOverview.losses}D
            </div>
          )}
        </div>
        <div className="dashboard-header-actions">
          <MemberFilterSelect equipe={equipe} selectedMemberId={selectedMemberId} setSelectedMemberId={setSelectedMemberId} />
          {seasonOverview && (
            <>
              <SeasonFilterSelect availableSeasons={seasonOverview.availableSeasons} seasonId={seasonOverview.seasonId} setSelectedSeasonId={setSelectedSeasonId} />
              <SeasonMapFilterSelect topMaps={seasonOverview.topMaps} mapFilter={seasonMapFilter} setMapFilter={setSeasonMapFilter} />
              <SeasonAgentFilterSelect topAgents={seasonOverview.topAgents} agentFilter={seasonAgentFilter} setAgentFilter={setSeasonAgentFilter} />
              <SeasonModoFilterSelect availableModos={seasonOverview.availableModos} modoFilter={seasonModoFilter} setModoFilter={setSeasonModoFilter} />
            </>
          )}
          <div className="dashboard-action-buttons">
            <button className="btn-secondary" style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 17px' }} onClick={() => navigate('/board')}>
              Abrir estratégia
            </button>
          </div>
        </div>
      </div>

      {seasonOverviewLoading ? (
        <LoadingFill />
      ) : seasonOverviewError && !seasonOverview ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{seasonOverviewError}</div>
        </div>
      ) : (
        <SeasonOverviewSection data={seasonOverview} loading={false} error={seasonOverviewError} />
      )}
    </div>
  );
}
