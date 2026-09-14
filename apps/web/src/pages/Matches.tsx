import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonMatchesList } from '../components/SeasonMatchesList';
import { cardStyle } from '../components/statsPrimitives';

// Histórico completo de partidas do ato (mesma fonte de dados da Visão do
// ato, com paginação de 12 em 12) -- ao vir de lá com "?expand=<id>", essa
// partida já abre expandida no lugar em vez de precisar clicar de novo.
export function Matches() {
  const { seasonOverview, seasonOverviewLoading, seasonOverviewError, seasonMatchesPage, seasonMatchesLoading, seasonMatchesError, setSeasonMatchesPageNumber } =
    useOutletContext<OutletContext>();
  const [searchParams] = useSearchParams();
  const expandMatchId = searchParams.get('expand');

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Partidas</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>Suas partidas do ato — clique numa pra ver os detalhes</div>
      </div>

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
