import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonMatchesList } from '../components/SeasonMatchesList';
import { MemberFilterSelect, SeasonMapFilterSelect, SeasonAgentFilterSelect, SeasonModoFilterSelect } from '../components/SeasonFilters';
import { useCardStyle, plural } from '../components/statsPrimitives';
import { PageHeaderCard, HeaderSubtitle } from '../components/PageHeaderCard';

// Histórico completo de partidas do ato (mesma fonte de dados da Visão do
// ato, com paginação de 12 em 12) -- ao vir de lá com "?expand=<id>", essa
// partida já abre expandida no lugar em vez de precisar clicar de novo.
// Filtros (membro/mapa/agente/modo) são o mesmo estado global da Visão do
// ato (appData.ts) -- por isso essa página já recebia dados filtrados sem
// ter os seletores; só faltava a UI pra mudar o filtro sem voltar lá.
export function Matches() {
  const {
    seasonOverview,
    seasonOverviewLoading,
    seasonOverviewError,
    seasonMatchesPage,
    seasonMatchesLoading,
    seasonMatchesError,
    setSeasonMatchesPageNumber,
    equipe,
    selectedMemberId,
    setSelectedMemberId,
    seasonMapFilter,
    setSeasonMapFilter,
    seasonAgentFilter,
    setSeasonAgentFilter,
    seasonModoFilter,
    setSeasonModoFilter,
  } = useOutletContext<OutletContext>();
  const cardStyle = useCardStyle();
  const [searchParams] = useSearchParams();
  const expandMatchId = searchParams.get('expand');

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeaderCard
        title="Partidas"
        subtitle={<HeaderSubtitle>Suas partidas do ato — clique numa pra ver os detalhes</HeaderSubtitle>}
        filters={
          <>
            <MemberFilterSelect equipe={equipe} selectedMemberId={selectedMemberId} setSelectedMemberId={setSelectedMemberId} />
            {seasonOverview && (
              <>
                <SeasonAgentFilterSelect topAgents={seasonOverview.topAgents} agentFilter={seasonAgentFilter} setAgentFilter={setSeasonAgentFilter} />
                <SeasonMapFilterSelect topMaps={seasonOverview.topMaps} mapFilter={seasonMapFilter} setMapFilter={setSeasonMapFilter} />
                <SeasonModoFilterSelect availableModos={seasonOverview.availableModos} modoFilter={seasonModoFilter} setModoFilter={setSeasonModoFilter} />
              </>
            )}
          </>
        }
        resultCount={seasonMatchesPage && plural(seasonMatchesPage.total, 'resultado')}
      />

      {seasonOverviewLoading ? (
        <LoadingFill />
      ) : seasonOverviewError && !seasonOverview ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{seasonOverviewError}</div>
        </div>
      ) : (
        <SeasonMatchesList
          matchesPage={seasonMatchesPage}
          loading={seasonMatchesLoading}
          error={seasonMatchesError}
          mapIcons={seasonOverview?.mapIcons ?? {}}
          agentIcons={seasonOverview?.agentIcons ?? {}}
          setPage={setSeasonMatchesPageNumber}
          expandable
          autoExpandMatchId={expandMatchId}
        />
      )}
    </div>
  );
}
