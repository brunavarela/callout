import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MIN_TEAM_MATCH_PLAYERS, type BestAgentComposition, type LineupCombo, type TeamAgentPerformance } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { cardStyle, WIN, LOSS, rateBarColor, plural, RateBlock, RankingBlock, type RankingRow } from '../components/statsPrimitives';
import { agentImageUrl } from '../lib/agentImages';

// Altura fixa dos 4 cards médios (Variações de time, Destaques do time, Em
// quais mapas o time ganha, Melhores agentes do time) — pra ficarem todos
// do mesmo tamanho independente de quanto conteúdo cada um tem. O que não
// couber rola dentro do próprio card (título/cabeçalho de coluna continuam
// fixos, só a lista rola).
const MEDIUM_CARD_HEIGHT = 320;

function AgentAvatar({ agent, size, title }: { agent: string; size: number; title?: string }) {
  const imageUrl = agentImageUrl(agent);
  return (
    <div
      title={title ?? agent}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 30 ? 9 : 7,
        overflow: 'hidden',
        flex: 'none',
        background: imageUrl ? '#141415' : 'var(--avatar-bg)',
        border: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size >= 30 ? 9 : 7,
        fontWeight: 700,
        color: 'var(--text-muted)',
      }}
    >
      {imageUrl ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : agent.slice(0, 2).toUpperCase()}
    </div>
  );
}

function PlayerInitials({ name, size }: { name: string; size: number }) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        flex: 'none',
        background: 'var(--avatar-bg)',
        border: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--text-muted)',
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

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

// Mesmo formato do KpiTile, mas o "valor" é a fileira de ícones dos 5
// agentes em vez de texto — não tem um número único que resuma "melhor
// composição de agentes" do jeito que resume "melhor mapa".
function AgentComboKpiTile({ compo }: { compo: BestAgentComposition | null }) {
  return (
    <div style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>Melhor composição de agentes</span>
      {compo ? (
        <div style={{ display: 'flex', gap: 5 }}>
          {compo.agents.map((agent, i) => (
            <AgentAvatar key={`${agent}-${i}`} agent={agent} size={32} />
          ))}
        </div>
      ) : (
        <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 26 }}>—</span>
      )}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
        <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)' }}>
          {compo
            ? compo.isFallback
              ? `Última vitória do time com essa composição — ${compo.playedAtLabel}.`
              : `${plural(compo.wins, 'vitória')} em ${plural(compo.total, 'partida')} com essa composição.`
            : 'Ainda sem vitórias registradas.'}
        </span>
      </div>
    </div>
  );
}

// Iniciais de cada jogador da formação (hover mostra o nome completo) —
// quem são, não "quem falta", e sem ordenar por winrate: "variações de
// time" é sobre o que aconteceu, não um ranking de qual formação é
// "melhor" (isso soaria como "o time rende mais sem Fulano"). Ordenado por
// quantas vezes cada formação jogou.
function LineupVariations({ combos }: { combos: LineupCombo[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, height: MEDIUM_CARD_HEIGHT }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Variações de time - Jogadores</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Formações de 5 jogadores diferentes nas partidas do time</div>
      </div>
      {combos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px 50px', gap: 8, padding: '0 0 6px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
            <span>COMPOSIÇÃO</span>
            <span style={{ textAlign: 'right' }}>V</span>
            <span style={{ textAlign: 'right' }}>D</span>
            <span style={{ textAlign: 'right' }}>TAXA</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {combos.map((c) => (
              <div
                key={c.comboKey}
                style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px 50px', gap: 8, alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--divider)' }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  {c.members.map((m) => (
                    <PlayerInitials key={m.userId} name={m.name} size={26} />
                  ))}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: WIN, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {c.wins}
                  {c.overtimeWins > 0 && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}> ({c.overtimeWins}OT)</span>}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: LOSS, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {c.losses}
                  {c.overtimeLosses > 0 && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}> ({c.overtimeLosses}OT)</span>}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-3)', textAlign: 'right' }}>{c.winratePercent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Kills/assistências/first bloods são média por partida jogada com o
// agente (mesma base do impacto/ACS) — total puro premiaria só quem foi
// mais pickado, não quem rendeu mais quando jogado.
function BestAgentsTable({ agents }: { agents: TeamAgentPerformance[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, height: MEDIUM_CARD_HEIGHT }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Melhores agentes do time</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Kills, assistências e first bloods são média por partida com o agente</div>
      </div>
      {agents.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 46px 52px 36px 58px 56px', gap: 8, padding: '0 0 6px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
            <span>AGENTE</span>
            <span style={{ textAlign: 'right' }}>KILLS</span>
            <span style={{ textAlign: 'right' }}>ASSIST</span>
            <span style={{ textAlign: 'right' }}>FB</span>
            <span style={{ textAlign: 'right' }}>IMPACTO</span>
            <span style={{ textAlign: 'right' }}>PARTIDAS</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {agents.map((a) => (
              <div
                key={a.agent}
                style={{ display: 'grid', gridTemplateColumns: '1fr 46px 52px 36px 58px 56px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--divider)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <AgentAvatar agent={a.agent} size={24} />
                  <span style={{ fontSize: 13, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agent}</span>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', textAlign: 'right' }}>{a.kills}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', textAlign: 'right' }}>{a.assists}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', textAlign: 'right' }}>{a.firstBloods}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-3)', textAlign: 'right' }}>{a.impact}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'right' }}>{a.picks}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DestaquesDoTime({ insights }: { insights: string[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, height: MEDIUM_CARD_HEIGHT }}>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Destaques do time</div>
      {insights.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem destaques ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {insights.map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--text-faint)' }}>•</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamDashboard() {
  const navigate = useNavigate();
  const { team, teamDashboard: data, teamDashboardError: error, teamDashboardLoading: loading, loadTeamDashboard } = useOutletContext<OutletContext>();

  useEffect(() => {
    if (data === null && !loading) loadTeamDashboard();
  }, [data, loading, loadTeamDashboard]);

  // Maior taxa de vitória, sem piso de amostra — mapWinrates já vem
  // ordenado desc por winratePercent, então é só pegar o primeiro (mesmo
  // que seja 1 vitória em 1 partida só).
  const bestMap = data?.mapWinrates[0] ?? null;

  const acsRows: RankingRow[] = (data?.acsRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value), caption: `(${plural(r.matchesPlayed, 'partida')})` }));
  const mvpRows: RankingRow[] = (data?.mvpRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: plural(r.value, 'vez') }));
  const assistRows: RankingRow[] = (data?.assistRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value) }));
  const clutchRows: RankingRow[] = (data?.clutchRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: `${r.clutchesWon} de ${r.clutchesPlayed}` }));
  const firstBloodRows: RankingRow[] = (data?.firstBloodRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value) }));
  const firstDeathRows: RankingRow[] = (data?.firstDeathRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value) }));
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
    if (data.firstDeathRanking[0]) insights.push(`${data.firstDeathRanking[0].name} é quem mais morre primeiro nos rounds, ${data.firstDeathRanking[0].value} vezes.`);
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
              sub={bestMap ? `${plural(bestMap.total, 'partida')} jogada${bestMap.total === 1 ? '' : 's'} e ${plural(bestMap.wins, 'vitória')}.` : 'Ainda sem partidas.'}
            />
            <KpiTile
              label="Sequência atual"
              value={data.currentStreak.type ? plural(data.currentStreak.count, data.currentStreak.type === 'V' ? 'vitória' : 'derrota') : '—'}
              sub={`Melhor sequência: ${plural(data.bestWinStreak, 'vitória')} seguidas.`}
            />
            <AgentComboKpiTile compo={data.bestAgentComposition} />
          </div>

          {/* 4 cards médios, 2 colunas x 2 linhas */}
          <div className="grid-responsive-2">
            <LineupVariations combos={data.lineupCombos} />
            <BestAgentsTable agents={data.bestAgents} />
            <RateBlock
              title="Em quais mapas o time ganha"
              sub="% de partidas vencidas em cada mapa"
              rows={data.mapWinrates.map((m) => ({ key: m.map, name: m.map, wins: m.wins, total: m.total }))}
              colorFor={rateBarColor}
              maxHeight={MEDIUM_CARD_HEIGHT}
            />
            <DestaquesDoTime insights={insights} />
          </div>

          {/* 8 cards pequenos, 4 colunas x 2 linhas */}
          <div className="grid-responsive-4">
            <RankingBlock title="Ranking de ACS" sub="Média de ACS nas partidas do time" rows={acsRows} />
            <RankingBlock title="Ranking de MVP" sub="Maior ACS do time na partida" rows={mvpRows} />
            <RankingBlock title="Ranking de assistências" sub="Total de assistências nas partidas do time" rows={assistRows} />
            <RankingBlock title="Ranking de clutches" sub="Rounds ganhos sozinho contra a vantagem numérica" rows={clutchRows} />
            <RankingBlock title="Ranking de first bloods" sub="Primeira eliminação do round" rows={firstBloodRows} />
            <RankingBlock title="Ranking de primeira morte" sub="Primeiro a morrer no round" rows={firstDeathRows} />
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
        </>
      )}
    </div>
  );
}
