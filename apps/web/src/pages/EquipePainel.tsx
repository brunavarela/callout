import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, History, Swords } from 'lucide-react';
import type { MatchCountFilter, RecentFormInsights, RrHistoryPoint, RrHistoryResponse, SeasonMatchesPage, SeasonOverview } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonOverviewSection } from '../components/SeasonOverviewSection';
import { MatchCountFilterSelect, SeasonMapFilterSelect, SeasonAgentFilterSelect, SeasonModoFilterSelect } from '../components/SeasonFilters';
import { Select } from '../components/Select';
import { cardStyle, plural } from '../components/statsPrimitives';
import { formatPlaytime } from '../lib/seasonFormat';
import { apiFetch } from '../lib/api';
import { SimularEquipeModal } from '../components/SimularEquipeModal';

const FILTER_STYLE: React.CSSProperties = { width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 };

// Mesmo filtro de membro do painel individual (MemberFilterSelect em
// SeasonFilters.tsx), mas o padrão aqui é "Todos" (média da equipe
// inteira), não "Você" -- e a própria pessoa aparece na lista junto com o
// resto do time, já que "sem filtro" não é mais "meus dados", é "todo
// mundo". Por isso um componente à parte em vez de reusar aquele.
function TeamMemberFilterSelect({
  equipe,
  selectedMemberId,
  setSelectedMemberId,
}: {
  equipe: OutletContext['equipe'];
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
}) {
  const options = (equipe?.members ?? []).filter((m) => m.hasRiotLinked);
  if (options.length === 0) return null;

  return (
    <Select
      value={selectedMemberId ?? 'all'}
      onChange={(v) => setSelectedMemberId(v === 'all' ? null : v)}
      options={[{ value: 'all', label: 'Todos' }, ...options.map((m) => ({ value: m.userId, label: m.isSelf ? 'Você' : m.name }))]}
      title="Ver a equipe inteira ou um membro específico"
      style={FILTER_STYLE}
    />
  );
}

// Painel da equipe -- praticamente idêntico ao painel individual (mesmos
// cards/filtros/design, ver SeasonOverviewSection). Sem filtro de membro,
// cada número é a média de todos os jogadores da equipe nas partidas que
// jogaram juntos (>=5 membros do mesmo lado -- ver equipeSeasonOverview.ts
// no back). Escolhendo um membro específico (mesmo MemberFilterSelect do
// painel individual), a tela troca pra reusar a rota individual de "ver
// painel de outro membro" (/dashboard/season?userId=) que já existe --
// vira o painel de UMA pessoa só, com título "Painel da equipe (Fulano)" e
// RR de volta (RR é individual, só faz sentido nesse modo).
//
// Estado local (não no appData.ts compartilhado, de propósito) -- só essa
// página usa esses dados, e assim não infla o contexto global com mais um
// conjunto inteiro de filtros/fetches que o resto do app não precisa.
//
// Os cards antigos de ranking (ACS/MVP/assistências/clutches/etc.),
// variações de equipe e melhor composição de agentes saíram da tela, mas
// o back que já calculava esses dados (buildEquipePainel) continua intacto
// -- só não tá sendo chamado por essa página agora.
export function EquipePainel() {
  const navigate = useNavigate();
  const { equipe } = useOutletContext<OutletContext>();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [simularOpen, setSimularOpen] = useState(false);
  const [matchCountFilter, setMatchCountFilter] = useState<MatchCountFilter>(20);
  const [mapFilter, setMapFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [modoFilter, setModoFilterState] = useState<string | null>(null);
  const [matchesPageNumber, setMatchesPageNumber] = useState(1);

  // Trocar o modo também volta a janela de partidas (Todas/20/7) pro padrão
  // (20) -- combinar "Todas" (até 150) com um modo filtrado (ex.: Premier,
  // bem mais raro) não tem necessidade nenhuma na prática e só deixa a
  // query mais pesada à toa.
  const setModoFilter = useCallback((modo: string | null) => {
    setModoFilterState(modo);
    setMatchCountFilter(20);
  }, []);

  const [overview, setOverview] = useState<SeasonOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [matchesPage, setMatchesPage] = useState<SeasonMatchesPage | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [rr, setRr] = useState<RrHistoryResponse | null>(null);
  const [rrLoading, setRrLoading] = useState(false);

  const selectedMember = selectedMemberId ? (equipe?.members.find((m) => m.userId === selectedMemberId) ?? null) : null;

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const params = new URLSearchParams({ matches: String(matchCountFilter) });
      if (mapFilter) params.set('mapId', mapFilter);
      if (agentFilter) params.set('agent', agentFilter);
      if (modoFilter) params.set('modo', modoFilter);
      if (selectedMemberId) params.set('userId', selectedMemberId);
      const path = selectedMemberId ? '/dashboard/season' : '/equipe/painel/season';
      setOverview(await apiFetch<SeasonOverview>(`${path}?${params}`));
    } catch {
      setOverviewError('Não deu pra carregar o painel. Tenta recarregar a página.');
    } finally {
      setOverviewLoading(false);
    }
  }, [matchCountFilter, mapFilter, agentFilter, modoFilter, selectedMemberId]);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const params = new URLSearchParams({ page: String(matchesPageNumber) });
      if (mapFilter) params.set('mapId', mapFilter);
      if (agentFilter) params.set('agent', agentFilter);
      if (modoFilter) params.set('modo', modoFilter);
      if (selectedMemberId) params.set('userId', selectedMemberId);
      const path = selectedMemberId ? '/dashboard/season/matches' : '/equipe/painel/season/matches';
      setMatchesPage(await apiFetch<SeasonMatchesPage>(`${path}?${params}`));
    } catch {
      setMatchesError('Não deu pra carregar as partidas.');
    } finally {
      setMatchesLoading(false);
    }
  }, [matchesPageNumber, mapFilter, agentFilter, modoFilter, selectedMemberId]);

  // RR só existe pra uma pessoa (não pra "a equipe") -- só busca quando um
  // membro específico tá selecionado, e limpa quando volta pra visão geral.
  const loadRr = useCallback(async () => {
    if (!selectedMemberId) {
      setRr(null);
      return;
    }
    setRrLoading(true);
    try {
      const params = new URLSearchParams({ matches: String(matchCountFilter), userId: selectedMemberId });
      if (mapFilter) params.set('mapId', mapFilter);
      if (modoFilter) params.set('modo', modoFilter);
      setRr(await apiFetch<RrHistoryResponse>(`/dashboard/rr-history?${params}`));
    } catch {
      setRr(null);
    } finally {
      setRrLoading(false);
    }
  }, [selectedMemberId, matchCountFilter, mapFilter, modoFilter]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    loadRr();
  }, [loadRr]);

  // Filtro novo (mapa/agente/modo/membro) reseta a paginação da lista de
  // partidas -- mesmo comportamento do painel individual (appData.ts).
  useEffect(() => {
    setMatchesPageNumber(1);
  }, [mapFilter, agentFilter, modoFilter, selectedMemberId]);

  const rrHistory: RrHistoryPoint[] = rr?.points ?? [];
  const rrFormInsights: RecentFormInsights | null = rr?.formInsights ?? null;

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <button
            onClick={() => navigate('/equipe')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 10 }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Voltar pra equipe
          </button>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-.025em', margin: 0 }}>
            Painel da equipe{selectedMember ? ` (${selectedMember.name})` : ''}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            {overview
              ? selectedMember
                ? `${plural(overview.matchesCount, 'partida')} · ${formatPlaytime(overview.playtimeMs)} jogadas · ${overview.wins}V–${overview.losses}D`
                : `${plural(overview.matchesCount, 'partida')} juntos · ${overview.wins}V–${overview.losses}D · ${overview.winratePercent}%`
              : `${equipe ? equipe.name : ''} · partidas com pelo menos 5 membros da equipe juntos`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => setSimularOpen(true)}>
            <Swords size={15} strokeWidth={1.75} />
            Simular equipe
          </button>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/equipe/partidas')}>
            <History size={15} strokeWidth={1.75} />
            Histórico de partidas
          </button>
        </div>
      </div>

      <div className="dashboard-header-actions" style={{ marginLeft: 0, marginTop: -6, justifyContent: 'flex-end' }}>
        <TeamMemberFilterSelect equipe={equipe} selectedMemberId={selectedMemberId} setSelectedMemberId={setSelectedMemberId} />
        {overview && (
          <>
            <SeasonAgentFilterSelect topAgents={overview.topAgents} agentFilter={agentFilter} setAgentFilter={setAgentFilter} />
            <SeasonMapFilterSelect topMaps={overview.topMaps} mapFilter={mapFilter} setMapFilter={setMapFilter} />
            <SeasonModoFilterSelect availableModos={overview.availableModos} modoFilter={modoFilter} setModoFilter={setModoFilter} />
          </>
        )}
        <MatchCountFilterSelect matchCountFilter={matchCountFilter} setMatchCountFilter={setMatchCountFilter} />
      </div>

      {overviewLoading ? (
        <LoadingFill />
      ) : overviewError && !overview ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{overviewError}</div>
        </div>
      ) : (
        <SeasonOverviewSection
          data={overview}
          loading={false}
          error={overviewError}
          matchesPage={matchesPage}
          matchesLoading={matchesLoading}
          matchesError={matchesError}
          setMatchesPageNumber={setMatchesPageNumber}
          rrHistory={rrHistory}
          rrHistoryLoading={rrLoading}
          rrFormInsights={rrFormInsights}
          modoFilter="all"
          subject={selectedMember?.name ?? 'a equipe'}
          showRr={!!selectedMember}
          matchesBasePath="/equipe/partidas"
        />
      )}

      {simularOpen && <SimularEquipeModal equipe={equipe} topMaps={overview?.topMaps ?? []} onClose={() => setSimularOpen(false)} />}
    </div>
  );
}
