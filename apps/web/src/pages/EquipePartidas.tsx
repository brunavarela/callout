import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import type { SeasonMatchesPage, SeasonOverview } from '@callout/shared';
import { MIN_TEAM_MATCH_PLAYERS } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonMatchesList } from '../components/SeasonMatchesList';
import { SeasonMapFilterSelect } from '../components/SeasonFilters';
import { useCardStyle, plural } from '../components/statsPrimitives';
import { PageHeaderCard, HeaderSubtitle } from '../components/PageHeaderCard';
import { apiFetch } from '../lib/api';

// Histórico completo de partidas da equipe (5+ membros juntos na mesma
// partida) -- mesmo design/componente da página de Partidas individual
// (SeasonMatchesList), sem filtro de ato (sempre o histórico mais recente,
// igual à individual). Ao vir do painel da equipe com "?expand=<id>", essa
// partida já abre expandida no lugar em vez de precisar clicar de novo.
export function EquipePartidas() {
  const navigate = useNavigate();
  const cardStyle = useCardStyle();
  useOutletContext<OutletContext>();
  const [searchParams] = useSearchParams();
  const expandMatchId = searchParams.get('expand');

  const [matchesPage, setMatchesPage] = useState<SeasonMatchesPage | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [mapFilter, setMapFilterState] = useState<string | null>(null);

  function setMapFilter(mapId: string | null) {
    setMapFilterState(mapId);
    setPage(1);
  }

  // Pra mapIcons/agentIcons (mesmas listas que a Visão do ato já resolve) e
  // pro seletor de mapa (topMaps) -- o painel da equipe já tem isso em
  // cache, mas essa página pode abrir direto (link/refresh) sem passar por lá.
  const [overview, setOverview] = useState<SeasonOverview | null>(null);

  const loadMatches = useCallback(async (p: number, mapId: string | null) => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (mapId) params.set('mapId', mapId);
      setMatchesPage(await apiFetch<SeasonMatchesPage>(`/equipe/painel/season/matches?${params}`));
    } catch {
      setMatchesError('Falha ao carregar o histórico de partidas da equipe.');
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches(page, mapFilter);
  }, [loadMatches, page, mapFilter]);

  useEffect(() => {
    apiFetch<SeasonOverview>('/equipe/painel/season')
      .then(setOverview)
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeaderCard
        backTo="/equipe"
        backLabel="Voltar pra equipe"
        title="Partidas da equipe"
        subtitle={<HeaderSubtitle>Partidas com pelo menos {MIN_TEAM_MATCH_PLAYERS} membros da equipe juntos — clique numa pra ver os detalhes</HeaderSubtitle>}
        actions={
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', fontSize: 12.5 }} onClick={() => navigate('/equipe/painel')}>
            <BarChart3 size={14} strokeWidth={1.75} />
            Painel
          </button>
        }
        filters={overview && <SeasonMapFilterSelect topMaps={overview.topMaps} mapFilter={mapFilter} setMapFilter={setMapFilter} />}
        resultCount={matchesPage && plural(matchesPage.total, 'resultado')}
      />

      {matchesLoading && !matchesPage ? (
        <LoadingFill />
      ) : matchesError && !matchesPage ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{matchesError}</div>
        </div>
      ) : (
        <SeasonMatchesList
          matchesPage={matchesPage}
          loading={matchesLoading}
          error={matchesError}
          mapIcons={overview?.mapIcons ?? {}}
          agentIcons={overview?.agentIcons ?? {}}
          setPage={setPage}
          expandable
          autoExpandMatchId={expandMatchId}
          basePath="/equipe/partidas"
        />
      )}
    </div>
  );
}
