import { useOutletContext } from 'react-router-dom';
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
          <>
            {/* Centralizado no eixo X do headerpage inteiro (não só do
                espaço sobrando depois do título) -- por isso sai do fluxo
                normal do flex de ações, igual fizemos com a nav do header
                principal. PageHeaderCard já é position:relative, então
                ancora nele. "Encontre jogadores" fica de fora, continua
                empurrado pro fim pelo marginLeft:auto do próprio container
                de ações (pedido de 21/09/2026: filtro centralizado, botão
                de busca fica onde estava). */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {seasonOverview && (
                <>
                  <SeasonAgentFilterSelect topAgents={seasonOverview.topAgents} agentFilter={seasonAgentFilter} setAgentFilter={setSeasonAgentFilter} />
                  <SeasonMapFilterSelect topMaps={seasonOverview.topMaps} mapFilter={seasonMapFilter} setMapFilter={setSeasonMapFilter} />
                  <SeasonModoFilterSelect availableModos={seasonOverview.availableModos} modoFilter={seasonModoFilter} setModoFilter={setSeasonModoFilter} />
                </>
              )}
              <MatchCountFilterSelect matchCountFilter={matchCountFilter} setMatchCountFilter={setMatchCountFilter} />
            </div>
            <RiotIdSearchFilter
              activeLabel={isSelf ? null : subject}
              searchLoading={searchLoading}
              searchError={searchError}
              onSearch={searchRiotId}
              onClear={() => setSelectedMemberId(null)}
            />
          </>
        }
      />

      {seasonOverviewLoading || searchLoading ? (
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
