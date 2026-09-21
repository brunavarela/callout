import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonOverviewSection } from '../components/SeasonOverviewSection';
import { RiotIdSearchFilter, MatchCountFilterSelect, SeasonMapFilterSelect, SeasonAgentFilterSelect, SeasonModoFilterSelect } from '../components/SeasonFilters';
import { formatPlaytime } from '../lib/seasonFormat';
import { useCardStyle, plural } from '../components/statsPrimitives';
import { PageHeaderCard, StatsPill } from '../components/PageHeaderCard';
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
    searchedTarget,
    searchError,
    searchLoading,
    searchRiotId,
  } = useOutletContext<OutletContext>();
  const { user } = useSession();

  const cardStyle = useCardStyle();
  // Alvo pesquisado pode ser membro da equipe (aparece em equipe.members,
  // com nome de exibição próprio) ou qualquer outro jogador pesquisado por
  // RiotID (searchedTarget, ver RiotIdSearchFilter) — nesse caso o nome vem
  // do próprio RiotID pesquisado.
  const selectedMember = selectedMemberId ? (equipe?.members.find((m) => m.userId === selectedMemberId) ?? null) : null;
  const isSelf = !selectedMemberId;
  const subject = selectedMember?.name ?? (searchedTarget ? `${searchedTarget.riotName}#${searchedTarget.riotTag}` : 'você');

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeaderCard
        title={isSelf ? `E aí, ${firstName(user)}` : `Espiando ${subject}`}
        titleAdornment={
          seasonOverview && (
            <StatsPill>
              <span style={{ color: 'var(--text-muted)' }}>{plural(seasonOverview.matchesCount, 'partida')}</span>
              <span style={{ color: 'var(--text-muted)' }}>{formatPlaytime(seasonOverview.playtimeMs)} jogadas</span>
              <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                {seasonOverview.wins}V–{seasonOverview.losses}D
              </span>
            </StatsPill>
          )
        }
        actions={
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', fontSize: 12.5 }} onClick={() => navigate('/board')}>
            Abrir estratégia
          </button>
        }
        filters={
          <>
            <RiotIdSearchFilter
              activeLabel={isSelf ? null : subject}
              searchLoading={searchLoading}
              searchError={searchError}
              onSearch={searchRiotId}
              onClear={() => setSelectedMemberId(null)}
            />
            {seasonOverview && (
              <>
                <SeasonAgentFilterSelect topAgents={seasonOverview.topAgents} agentFilter={seasonAgentFilter} setAgentFilter={setSeasonAgentFilter} />
                <SeasonMapFilterSelect topMaps={seasonOverview.topMaps} mapFilter={seasonMapFilter} setMapFilter={setSeasonMapFilter} />
                <SeasonModoFilterSelect availableModos={seasonOverview.availableModos} modoFilter={seasonModoFilter} setModoFilter={setSeasonModoFilter} />
              </>
            )}
            <MatchCountFilterSelect matchCountFilter={matchCountFilter} setMatchCountFilter={setMatchCountFilter} />
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
          modoFilter={modoFilter}
          subject={subject}
        />
      )}
    </div>
  );
}
