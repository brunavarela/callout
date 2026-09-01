import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, ChevronRight, History, TrendingDown, TrendingUp } from 'lucide-react';
import { MIN_TEAM_MATCH_PLAYERS, type BestAgentComposition, type LineupCombo, type LineupComboMatch, type EquipeAgentePerformance } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { cardStyle, WIN, LOSS, DRAW, rateBarColor, plural, RateBlock, RankingBlock, type RankingRow } from '../components/statsPrimitives';
import { AgentAvatar } from '../components/AgentAvatar';

// Altura fixa dos 4 cards médios (Variações de equipe, Destaques da equipe,
// Em quais mapas a equipe ganha, Melhores agentes da equipe) — pra ficarem
// todos do mesmo tamanho independente de quanto conteúdo cada um tem. O que
// não couber rola dentro do próprio card (título/cabeçalho de coluna
// continuam fixos, só a lista rola).
const MEDIUM_CARD_HEIGHT = 320;

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

function ResultIcon({ isWin }: { isWin: boolean }) {
  const Icon = isWin ? TrendingUp : TrendingDown;
  return <Icon size={13} strokeWidth={2.5} style={{ flex: 'none', color: isWin ? WIN : LOSS }} />;
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
              ? `Última vitória da equipe com essa composição — ${compo.playedAtLabel}.`
              : `${plural(compo.wins, 'vitória')} em ${plural(compo.total, 'partida')} com essa composição.`
            : 'Ainda sem vitórias registradas.'}
        </span>
      </div>
    </div>
  );
}

// Iniciais de cada jogador da formação (hover mostra o nome completo) —
// quem são, não "quem falta", e sem ordenar por winrate: "variações de
// equipe" é sobre o que aconteceu, não um ranking de qual formação é
// "melhor" (isso soaria como "a equipe rende mais sem Fulano"). Ordenado
// por quantas vezes cada formação jogou.
const LINEUP_COLUMNS = '16px 1fr 74px 74px 56px 50px 66px';

function comboResultColor(result: LineupComboMatch['result']): string {
  return result === 'V' ? WIN : result === 'D' ? LOSS : DRAW;
}

// Linha de uma partida específica dentro de uma formação expandida — sem
// legenda, só V/D/E, mapa, placar e os agentes daquela partida (que podem
// variar partida a partida, diferente do agente "mais jogado" da linha
// principal).
function ComboMatchRow({ m }: { m: LineupComboMatch }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0 7px 24px', borderTop: '1px solid var(--divider)' }}>
      <span style={{ width: 14, flex: 'none', fontSize: 10.5, fontWeight: 700, textAlign: 'center', color: comboResultColor(m.result) }}>{m.result}</span>
      <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{m.map}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.score}</span>
      <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', flex: 'none' }}>
        {m.agents.map((a) => (
          <AgentAvatar key={a.userId} agent={a.agent} size={20} title={a.name} />
        ))}
      </div>
    </div>
  );
}

// Linha principal de uma formação — clicável, expande pra listar as
// partidas específicas dessa formação (ComboMatchRow acima).
function ComboRow({ combo }: { combo: LineupCombo }) {
  const [expanded, setExpanded] = useState(false);
  const otRate = combo.total ? Math.round(((combo.overtimeWins + combo.overtimeLosses) / combo.total) * 100) : 0;

  return (
    <div style={{ borderTop: '1px solid var(--divider)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: LINEUP_COLUMNS,
          gap: 8,
          alignItems: 'center',
          padding: '9px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <ChevronRight size={13} strokeWidth={2} style={{ flex: 'none', color: 'var(--text-faint)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {combo.members.map((m) => (
            <PlayerInitials key={m.userId} name={m.name} size={26} />
          ))}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: WIN, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {combo.wins}
          {combo.overtimeWins > 0 && (
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>
              {' ('}
              <span style={{ fontWeight: 700, color: WIN }}>{combo.overtimeWins}</span>OT)
            </span>
          )}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: LOSS, textAlign: 'right', whiteSpace: 'nowrap' }}>
          {combo.losses}
          {combo.overtimeLosses > 0 && (
            <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>
              {' ('}
              <span style={{ fontWeight: 700, color: LOSS }}>{combo.overtimeLosses}</span>OT)
            </span>
          )}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'right' }}>{combo.draws}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-3)', textAlign: 'right' }}>{combo.winratePercent}%</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'right' }}>{otRate}%</span>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transition: 'grid-template-rows .28s ease, opacity .22s ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>{combo.matches.map((m) => <ComboMatchRow key={m.matchId} m={m} />)}</div>
      </div>
    </div>
  );
}

function LineupVariations({ combos }: { combos: LineupCombo[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, height: MEDIUM_CARD_HEIGHT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Variações de equipe - Jogadores</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Formações de 5 jogadores diferentes nas partidas da equipe</div>
        </div>
        <span style={{ fontSize: 10.5, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>OT = overtime</span>
      </div>
      {combos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
        <div className="scroll-x-mobile" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: LINEUP_COLUMNS, gap: 8, padding: '0 0 6px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
            <span />
            <span>COMPOSIÇÃO</span>
            <span style={{ textAlign: 'right' }}>VITÓRIAS</span>
            <span style={{ textAlign: 'right' }}>DERROTAS</span>
            <span style={{ textAlign: 'right' }}>EMPATE</span>
            <span style={{ textAlign: 'right' }}>TAXA</span>
            <span style={{ textAlign: 'right' }}>TAXA OT</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {combos.map((c) => (
              <ComboRow key={c.comboKey} combo={c} />
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
function BestAgentsTable({ agents }: { agents: EquipeAgentePerformance[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, height: MEDIUM_CARD_HEIGHT }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Melhores agentes da equipe</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Kills, assistências e first bloods são média por partida com o agente</div>
      </div>
      {agents.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
        <div className="scroll-x-mobile" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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

function DestaquesDaEquipe({ insights }: { insights: string[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, height: MEDIUM_CARD_HEIGHT }}>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Destaques da equipe</div>
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

export function EquipePainel() {
  const navigate = useNavigate();
  const { equipe, equipePainel: data, equipePainelError: error, equipePainelLoading: loading, loadEquipePainel } = useOutletContext<OutletContext>();

  useEffect(() => {
    if (data === null && !loading) loadEquipePainel();
  }, [data, loading, loadEquipePainel]);

  // Maior taxa de vitória, sem piso de amostra — mapWinrates já vem
  // ordenado desc por winratePercent, então é só pegar o primeiro (mesmo
  // que seja 1 vitória em 1 partida só).
  const bestMap = data?.mapWinrates[0] ?? null;

  const acsRows: RankingRow[] = (data?.acsRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value), caption: `(${plural(r.matchesPlayed, 'partida')})` }));
  const mvpRows: RankingRow[] = (data?.mvpRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: `${r.value} ${r.value === 1 ? 'vez' : 'vezes'}`,
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const assistRows: RankingRow[] = (data?.assistRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: String(r.value),
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const clutchRows: RankingRow[] = (data?.clutchRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: `${r.clutchesWon} de ${r.clutchesPlayed}`,
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const firstBloodRows: RankingRow[] = (data?.firstBloodRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: String(r.value),
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const firstDeathRows: RankingRow[] = (data?.firstDeathRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: String(r.value),
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const agentRows: RankingRow[] = (data?.mostPickedAgents ?? []).map((a) => ({ key: a.agent, name: a.agent, value: plural(a.count, 'pick'), dot: a.color }));

  const insights: string[] = [];
  if (data) {
    if (data.acsRanking[0]) insights.push(`${data.acsRanking[0].name} lidera o ranking de ACS da equipe, com ${data.acsRanking[0].value} de média.`);
    if (data.mvpRanking[0] && data.mvpRanking[0].value > 0) {
      insights.push(`${data.mvpRanking[0].name} foi MVP em ${plural(data.mvpRanking[0].value, 'partida')} da equipe.`);
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <button
            onClick={() => navigate('/equipe')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 10 }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Voltar pra equipe
          </button>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Painel da equipe</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            {data
              ? `${plural(data.qualifyingMatchCount, 'partida')} juntos · ${data.wins}V–${data.losses}D · ${data.winratePercent}%`
              : `${equipe ? equipe.name : ''} · partidas com pelo menos ${MIN_TEAM_MATCH_PLAYERS} membros da equipe juntos`}
          </div>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/equipe/partidas')}>
          <History size={15} strokeWidth={1.75} />
          Histórico de partidas
        </button>
      </div>

      {error ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button className="btn-secondary" onClick={loadEquipePainel}>
            Tentar de novo
          </button>
        </div>
      ) : data === null ? (
        <LoadingFill />
      ) : data.qualifyingMatchCount === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nenhuma partida ainda com {MIN_TEAM_MATCH_PLAYERS}+ membros da equipe juntos.
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
              title="Em quais mapas a equipe ganha"
              sub="% de partidas vencidas em cada mapa"
              rows={data.mapWinrates.map((m) => ({ key: m.map, name: m.map, wins: m.wins, total: m.total }))}
              colorFor={rateBarColor}
              maxHeight={MEDIUM_CARD_HEIGHT}
            />
            <DestaquesDaEquipe insights={insights} />
          </div>

          {/* 8 cards pequenos, 4 colunas x 2 linhas */}
          <div className="grid-responsive-4">
            <RankingBlock title="Ranking de ACS" sub="Média de ACS nas partidas da equipe" rows={acsRows} />
            <RankingBlock title="Ranking de MVP" sub="Maior ACS da equipe na partida" rows={mvpRows} />
            <RankingBlock title="Ranking de assistências" sub="Total de assistências nas partidas da equipe" rows={assistRows} />
            <RankingBlock title="Ranking de clutches" sub="Rounds ganhos sozinho contra a vantagem numérica" rows={clutchRows} />
            <RankingBlock title="Ranking de first bloods" sub="Primeira eliminação do round" rows={firstBloodRows} />
            <RankingBlock title="Ranking de primeira morte" sub="Primeiro a morrer no round" rows={firstDeathRows} />
            <RankingBlock title="Agentes mais pickados" sub="Em todas as partidas da equipe" rows={agentRows} />
            <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Destaques de placar</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ResultIcon isWin />
                  <span style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--text-faint)' }}>MAIOR PLACAR APLICADO</span>
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ResultIcon isWin={(data.closestMatch?.marginRounds ?? 0) >= 0} />
                  <span style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--text-faint)' }}>PARTIDA MAIS APERTADA</span>
                </div>
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
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ResultIcon isWin={false} />
                  <span style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--text-faint)' }}>MAIOR PLACAR SOFRIDO</span>
                </div>
                {data.worstLoss ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: LOSS, marginTop: 3 }}>{data.worstLoss.score}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {data.worstLoss.map} · {data.worstLoss.playedAtLabel}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>Sem derrotas ainda.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
