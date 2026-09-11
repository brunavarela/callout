import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonOverviewSection } from '../components/SeasonOverviewSection';
import { MemberFilterSelect, SeasonFilterSelect, SeasonMapFilterSelect, SeasonAgentFilterSelect, SeasonModoFilterSelect } from '../components/SeasonFilters';
import { formatSeasonShort, formatPlaytime } from '../lib/seasonFormat';
import { cardStyle, plural } from '../components/statsPrimitives';
import { useSession } from '../lib/session';

function firstName(user: SessionUser | null): string {
  return user?.riotId?.name ?? user?.nome ?? '';
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
    seasonMatchesPage,
    seasonMatchesLoading,
    seasonMatchesError,
    setSeasonMatchesPageNumber,
    rrHistory,
    rrHistoryLoading,
    formInsights,
    matchCountFilter,
    setMatchCountFilter,
    modoFilter,
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
              <SeasonAgentFilterSelect topAgents={seasonOverview.topAgents} agentFilter={seasonAgentFilter} setAgentFilter={setSeasonAgentFilter} />
              <SeasonMapFilterSelect topMaps={seasonOverview.topMaps} mapFilter={seasonMapFilter} setMapFilter={setSeasonMapFilter} />
              <SeasonModoFilterSelect availableModos={seasonOverview.availableModos} modoFilter={seasonModoFilter} setModoFilter={setSeasonModoFilter} />
              <SeasonFilterSelect availableSeasons={seasonOverview.availableSeasons} seasonId={seasonOverview.seasonId} setSelectedSeasonId={setSelectedSeasonId} />
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
        <SeasonOverviewSection
          data={seasonOverview}
          loading={false}
          error={seasonOverviewError}
          matchesPage={seasonMatchesPage}
          matchesLoading={seasonMatchesLoading}
          matchesError={seasonMatchesError}
          setMatchesPageNumber={setSeasonMatchesPageNumber}
          rrHistory={rrHistory}
          rrHistoryLoading={rrHistoryLoading}
          rrFormInsights={formInsights}
          matchCountFilter={matchCountFilter}
          setMatchCountFilter={setMatchCountFilter}
          modoFilter={modoFilter}
          subject={subject}
        />
      )}
    </div>
  );
}
