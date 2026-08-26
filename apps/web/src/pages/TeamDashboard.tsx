import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MIN_TEAM_MATCH_PLAYERS } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { cardStyle, WIN, LOSS, rateBarColor, plural, RateBlock, RankingBlock, type RankingRow } from '../components/statsPrimitives';

function KpiTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 26, letterSpacing: '-.02em', lineHeight: 1.15 }}>{value}</span>
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
        <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)' }}>{sub}</span>
      </div>
    </div>
  );
}

export function TeamDashboard() {
  const navigate = useNavigate();
  const { team, teamDashboard: data, teamDashboardError: error, teamDashboardLoading: loading, loadTeamDashboard } = useOutletContext<OutletContext>();

  useEffect(() => {
    if (data === null && !loading) loadTeamDashboard();
  }, [data, loading, loadTeamDashboard]);

  const bestMap = data?.mapWinrates.find((m) => m.total >= 3) ?? null;
  const bestCombo = data?.lineupCombos.find((c) => c.total >= 3) ?? null;
  const comboLabel = (missingName: string | null, memberNames: string[]) =>
    missingName ? `Sem ${missingName}` : memberNames.map((n) => n.split(' ')[0]).join(', ');

  const acsRows: RankingRow[] = (data?.acsRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value), caption: `(${plural(r.matchesPlayed, 'partida')})` }));
  const mvpRows: RankingRow[] = (data?.mvpRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: plural(r.value, 'vez') }));
  const assistRows: RankingRow[] = (data?.assistRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value) }));
  const clutchRows: RankingRow[] = (data?.clutchRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: `${r.clutchesWon} de ${r.clutchesPlayed}` }));
  const firstBloodRows: RankingRow[] = (data?.firstBloodRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value) }));
  const agentRows: RankingRow[] = (data?.mostPickedAgents ?? []).map((a) => ({ key: a.agent, name: a.agent, value: plural(a.count, 'pick'), dot: a.color }));

  const insights: string[] = [];
  if (data) {
    if (data.acsRanking[0]) insights.push(`${data.acsRanking[0].name} lidera o ranking de ACS do time, com ${data.acsRanking[0].value} de média.`);
    if (data.mvpRanking[0] && data.mvpRanking[0].value > 0) {
      insights.push(`${data.mvpRanking[0].name} foi MVP em ${plural(data.mvpRanking[0].value, 'partida')} do time.`);
    }
    if (data.assistRanking[0]) insights.push(`${data.assistRanking[0].name} lidera em assistências, com ${data.assistRanking[0].value} no total.`);
    if (data.clutchRanking[0] && data.clutchRanking[0].clutchesWon > 0) {
      insights.push(`${data.clutchRanking[0].name} lidera em clutches (${data.clutchRanking[0].clutchesWon} de ${data.clutchRanking[0].clutchesPlayed}).`);
    }
    if (data.firstBloodRanking[0]) insights.push(`${data.firstBloodRanking[0].name} lidera em first bloods, com ${data.firstBloodRanking[0].value}.`);
    if (data.biggestWin) insights.push(`Maior goleada: ${data.biggestWin.score} no ${data.biggestWin.map} (${data.biggestWin.playedAtLabel}).`);
    if (data.closestMatch) insights.push(`Partida mais apertada: ${data.closestMatch.score} no ${data.closestMatch.map} (${data.closestMatch.playedAtLabel}).`);
  }

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button
          onClick={() => navigate('/time')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 10 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar pro time
        </button>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Painel do time</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          {data
            ? `${plural(data.qualifyingMatchCount, 'partida')} juntos · ${data.wins}V–${data.losses}D · ${data.winratePercent}%`
            : `${team ? team.name : ''} · partidas com pelo menos ${MIN_TEAM_MATCH_PLAYERS} membros do time juntos`}
        </div>
      </div>

      {error ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button className="btn-secondary" onClick={loadTeamDashboard}>
            Tentar de novo
          </button>
        </div>
      ) : data === null ? (
        <LoadingFill />
      ) : data.qualifyingMatchCount === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nenhuma partida ainda com {MIN_TEAM_MATCH_PLAYERS}+ membros do time juntos.
        </div>
      ) : (
        <>
          <div className="grid-responsive-4">
            <KpiTile label="Vitórias e derrotas" value={`${data.wins}V–${data.losses}D`} sub={`${data.winratePercent}% de aproveitamento em ${plural(data.qualifyingMatchCount, 'partida')}.`} />
            <KpiTile
              label="Melhor mapa"
              value={bestMap ? bestMap.map : '—'}
              sub={bestMap ? `${bestMap.winratePercent}% em ${plural(bestMap.total, 'partida')}.` : 'Ainda sem amostra suficiente.'}
            />
            <KpiTile
              label="Melhor combinação"
              value={bestCombo ? comboLabel(bestCombo.missingName, bestCombo.memberNames) : '—'}
              sub={bestCombo ? `${bestCombo.winratePercent}% em ${plural(bestCombo.total, 'partida')}.` : 'Ainda sem amostra suficiente.'}
            />
            <KpiTile
              label="Sequência atual"
              value={data.currentStreak.type ? plural(data.currentStreak.count, data.currentStreak.type === 'V' ? 'vitória' : 'derrota') : '—'}
              sub={`Melhor sequência: ${plural(data.bestWinStreak, 'vitória')} seguidas.`}
            />
          </div>

          <div className="grid-responsive-2">
            <RateBlock title="Em quais mapas o time ganha" sub="% de partidas vencidas em cada mapa" rows={data.mapWinrates.map((m) => ({ key: m.map, name: m.map, wins: m.wins, total: m.total }))} colorFor={rateBarColor} />
            <RateBlock
              title="Melhor combinação de time"
              sub="% de vitórias por formação de 5 jogadores"
              rows={data.lineupCombos.map((c) => ({ key: c.comboKey, name: comboLabel(c.missingName, c.memberNames), wins: c.wins, total: c.total }))}
              colorFor={rateBarColor}
            />
          </div>

          <div className="grid-responsive-2">
            <RankingBlock title="Ranking de ACS" sub="Média de ACS nas partidas do time" rows={acsRows} />
            <RankingBlock title="Ranking de MVP" sub="Maior ACS do time na partida" rows={mvpRows} />
          </div>

          <div className="grid-responsive-2">
            <RankingBlock title="Ranking de assistências" sub="Total de assistências nas partidas do time" rows={assistRows} />
            <RankingBlock title="Ranking de clutches" sub="Rounds ganhos sozinho contra a vantagem numérica" rows={clutchRows} />
          </div>

          <div className="grid-responsive-4">
            <RankingBlock title="Ranking de first bloods" sub="Primeira eliminação do round" rows={firstBloodRows} />
            <RankingBlock title="Agentes mais pickados" sub="Em todas as partidas do time" rows={agentRows} />
            <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Destaques de placar</div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--text-faint)' }}>MAIOR GOLEADA</div>
                {data.biggestWin ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: WIN, marginTop: 3 }}>{data.biggestWin.score}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {data.biggestWin.map} · {data.biggestWin.playedAtLabel}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>Sem vitórias ainda.</div>
                )}
              </div>
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--text-faint)' }}>PARTIDA MAIS APERTADA</div>
                {data.closestMatch ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: data.closestMatch.marginRounds >= 0 ? WIN : LOSS, marginTop: 3 }}>{data.closestMatch.score}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {data.closestMatch.map} · {data.closestMatch.playedAtLabel}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>Sem dados ainda.</div>
                )}
              </div>
            </div>
          </div>

          {insights.length > 0 && (
            <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Destaques do time</div>
              {insights.map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text-faint)' }}>•</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
