import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonMatchesList } from '../components/SeasonMatchesList';
import { RiotIdSearchFilter, SeasonMapFilterSelect, SeasonAgentFilterSelect, SeasonModoFilterSelect } from '../components/SeasonFilters';
import { useCardStyle } from '../components/statsPrimitives';
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
    searchedTarget,
    searchError,
    searchLoading,
    searchRiotId,
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

  // Mesma lógica de "de quem é esse painel" do Dashboard.tsx -- membro da
  // equipe (aparece em equipe.members) ou jogador pesquisado por RiotID
  // (searchedTarget) no painel individual.
  const selectedMember = selectedMemberId ? (equipe?.members.find((m) => m.userId === selectedMemberId) ?? null) : null;
  const isSelf = !selectedMemberId;
  const subject = selectedMember?.name ?? (searchedTarget ? `${searchedTarget.riotName}#${searchedTarget.riotTag}` : 'você');

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeaderCard
        title="Partidas"
        subtitle={<HeaderSubtitle>{isSelf ? 'Suas partidas do ato' : `Partidas de ${subject}`} — clique numa pra ver os detalhes</HeaderSubtitle>}
        centerContent={
          seasonOverview && (
            <>
              <SeasonAgentFilterSelect topAgents={seasonOverview.topAgents} agentFilter={seasonAgentFilter} setAgentFilter={setSeasonAgentFilter} />
              <SeasonMapFilterSelect topMaps={seasonOverview.topMaps} mapFilter={seasonMapFilter} setMapFilter={setSeasonMapFilter} />
              <SeasonModoFilterSelect availableModos={seasonOverview.availableModos} modoFilter={seasonModoFilter} setModoFilter={setSeasonModoFilter} />
            </>
          )
        }
        actions={
          <RiotIdSearchFilter
            activeLabel={isSelf ? null : subject}
            searchLoading={searchLoading}
            searchError={searchError}
            onSearch={searchRiotId}
            onClear={() => setSelectedMemberId(null)}
          />
        }
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
          viewUserId={selectedMemberId}
        />
      )}
    </div>
  );
}
