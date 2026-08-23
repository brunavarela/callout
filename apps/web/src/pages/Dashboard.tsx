import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AgentWinrate, DashboardSummary, MapWinrate, MatchCountFilter, MatchModeFilter, RecentFormInsights, RrHistoryPoint, SessionUser, SidesBreakdown } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { useSession } from '../lib/session';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const MODOS: Array<{ key: MatchModeFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'Competitive', label: 'Competitivo' },
  { key: 'Unrated', label: 'Sem classificação' },
];
const MATCH_COUNTS: Array<{ key: MatchCountFilter; label: string }> = [
  { key: 7, label: 'Últimas 7' },
  { key: 20, label: 'Últimas 20' },
];

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--acc, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';
const LOW_SAMPLE = 'var(--bar-dim)';
const UNDER_50 = 'color-mix(in srgb, var(--acc, #EF4958) 42%, var(--track))';
const MIN_SAMPLE = 3;

function fmtNum(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',');
}

function fmtDelta(n: number, decimals: number, suffix = ''): string {
  const abs = Math.abs(n);
  const numStr = decimals > 0 ? fmtNum(abs, decimals) : String(Math.round(abs));
  if (n > 0) return `+${numStr}${suffix}`;
  if (n < 0) return `−${numStr}${suffix}`;
  return `${numStr}${suffix}`;
}

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function rateBarColor(wins: number, total: number): string {
  if (total < MIN_SAMPLE) return LOW_SAMPLE;
  return wins / total >= 0.5 ? WIN : UNDER_50;
}

// Ticks "redondos" cobrindo [min,max] garantindo que 0 caia exatamente numa
// linha de grade — sem isso a régua vertical fica arbitrária e ilegível.
function niceTicks(minIn: number, maxIn: number, count = 4): number[] {
  const min = Math.min(0, minIn);
  const max = Math.max(0, maxIn === minIn ? minIn + 10 : maxIn);
  const rawStep = (max - min) / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + 1e-6; v += step) ticks.push(Math.round(v));
  return ticks;
}

function pickTickIndices(n: number, count = 5): number[] {
  if (n <= count) return Array.from({ length: n }, (_, i) => i);
  const idxs = new Set<number>();
  for (let k = 0; k < count; k++) idxs.add(Math.round((k * (n - 1)) / (count - 1)));
  return [...idxs].sort((a, b) => a - b);
}

function streaks(results: Array<'V' | 'D' | 'E'>): { currentType: 'V' | 'D' | 'E' | null; currentCount: number; bestWin: number } {
  if (results.length === 0) return { currentType: null, currentCount: 0, bestWin: 0 };
  const last = results[results.length - 1]!;
  let currentCount = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === last) currentCount++;
    else break;
  }
  let bestWin = 0;
  let run = 0;
  for (const r of results) {
    run = r === 'V' ? run + 1 : 0;
    bestWin = Math.max(bestWin, run);
  }
  return { currentType: last, currentCount, bestWin };
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <svg width={108} height={32} />;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const y = (v: number) => 30 - ((v - min) / span) * 27;
  const step = 108 / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 108 32" width={108} height={32} aria-hidden="true">
      <line x1={0} y1={y(0)} x2={108} y2={y(0)} stroke="var(--divider)" strokeWidth={1} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

function RrLineChart({ points }: { points: RrHistoryPoint[] }) {
  const navigate = useNavigate();
  const w = 640;
  const h = 220;
  const pad = { l: 34, r: 8, t: 14, b: 26 };

  let running = 0;
  const cum = points.map((p) => (running += p.delta));
  const ticks = niceTicks(Math.min(...cum, 0), Math.max(...cum, 0));
  const [niceMin, niceMax] = [ticks[0]!, ticks[ticks.length - 1]!];

  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const y = (v: number) => pad.t + ((niceMax - v) / (niceMax - niceMin || 1)) * plotH;
  const step = plotW / points.length;
  const x = (i: number) => pad.l + step * (i + 0.5);

  const zeroY = y(0);
  const polyline = cum.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area =
    points.length > 0
      ? `M ${x(0).toFixed(1)} ${zeroY.toFixed(1)} ` +
        cum.map((v, i) => `L ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ') +
        ` L ${x(points.length - 1).toFixed(1)} ${zeroY.toFixed(1)} Z`
      : '';

  const tickIndices = pickTickIndices(points.length);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }} role="img" aria-label="RR acumulado por partida">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} y1={y(v)} x2={w} y2={y(v)} stroke={v === 0 ? 'var(--divider)' : 'var(--track)'} strokeWidth={1} />
          <text x={pad.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill={v === 0 ? 'var(--text-muted)' : 'var(--text-faint)'}>
            {v > 0 ? `+${v}` : v}
          </text>
        </g>
      ))}
      {area && <path d={area} fill="color-mix(in srgb, var(--pos, #18AAB7) 10%, transparent)" />}
      {polyline && <polyline points={polyline} fill="none" stroke={WIN} strokeWidth={2.2} strokeLinejoin="round" />}
      {cum.map((v, i) => (
        <circle
          key={points[i]!.matchId}
          cx={x(i)}
          cy={y(v)}
          r={3.4}
          fill="var(--surface)"
          stroke={points[i]!.result === 'V' ? WIN : points[i]!.result === 'D' ? LOSS : DRAW}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/partida/${points[i]!.matchId}`)}
        >
          <title>
            {points[i]!.label} · {points[i]!.map} · {points[i]!.agent} ·{' '}
            {points[i]!.result === 'V' ? 'vitória' : points[i]!.result === 'D' ? 'derrota' : 'empate'} ·{' '}
            {fmtDelta(points[i]!.delta, 0)} RR
          </title>
        </circle>
      ))}
      {tickIndices.map((i) => (
        <text key={i} x={x(i)} y={h - 4} textAnchor="middle" fontSize={10.5} fill="var(--text-faint)">
          {points[i]!.label}
        </text>
      ))}
    </svg>
  );
}

function RateBlock({ title, sub, rows, colorFor }: { title: string; sub: string; rows: Array<{ key: string; name: string; wins: number; total: number; dot?: string }>; colorFor: (wins: number, total: number) => string }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 40px', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-3)' }}>
                  {r.dot && <span style={{ width: 9, height: 9, borderRadius: 3, background: r.dot, flex: 'none' }} />}
                  {r.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{plural(r.total, 'partida')}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--track)', marginTop: 5, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct(r.wins, r.total)}%`, borderRadius: 3, background: colorFor(r.wins, r.total) }} />
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', textAlign: 'right' }}>{pct(r.wins, r.total)}%</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-faint)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 5, borderRadius: 3, background: LOW_SAMPLE }} />
          menos de {MIN_SAMPLE} partidas: amostra pequena
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 5, borderRadius: 3, background: UNDER_50 }} />
          abaixo de 50%
        </span>
      </div>
    </div>
  );
}

function firstName(user: SessionUser | null): string {
  return user?.riotId?.name ?? user?.discordUsername ?? '';
}

// Altura fixa de 40px pra bater com .btn-secondary/.btn-primary ao lado
// (11px de padding vertical + linha de texto + borda) — com padding
// percentual o retângulo do filtro ficava mais baixo que os botões.
function ModoFilterButtons({ modoFilter, setModoFilter }: { modoFilter: MatchModeFilter; setModoFilter: (m: MatchModeFilter) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 40, gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: '0 4px' }}>
      {MODOS.map((m) => (
        <button
          key={m.key}
          onClick={() => setModoFilter(m.key)}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            background: modoFilter === m.key ? 'var(--acc, #EF4958)' : 'transparent',
            color: modoFilter === m.key ? '#141415' : 'var(--text-muted)',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// Mesmo padrão visual do ModoFilterButtons, só que mais compacto pra caber
// no header do card de RR. Controla a janela de partidas (7/20) do gráfico
// de RR e dos 4 tópicos de análise — os dois usam o mesmo filtro pra bater.
function MatchCountButtons({ matchCountFilter, setMatchCountFilter }: { matchCountFilter: MatchCountFilter; setMatchCountFilter: (n: MatchCountFilter) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: 3, flex: 'none' }}>
      {MATCH_COUNTS.map((c) => (
        <button
          key={c.key}
          onClick={() => setMatchCountFilter(c.key)}
          style={{
            padding: '5px 11px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11.5,
            whiteSpace: 'nowrap',
            background: matchCountFilter === c.key ? 'var(--acc, #EF4958)' : 'transparent',
            color: matchCountFilter === c.key ? '#141415' : 'var(--text-muted)',
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// "Cobrinha" girando — arco com gradiente que esmaece da cor de ação do
// tema até transparente, mascarado em anel e rotacionando (reaproveita a
// keyframe `spin` já usada no ícone de sync do AppShell).
function SnakeSpinner({ size = 44 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, transparent 0deg, var(--acc, #EF4958) 300deg, transparent 360deg)',
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
        animation: 'spin 900ms linear infinite',
      }}
    />
  );
}

// Centralizado nos dois eixos dentro do espaço de conteúdo (abaixo do
// header, que fica fixo) — minHeight aproxima a altura que o dashboard
// carregado ocupa, pra centralizar de verdade e não só no topo.
function LoadingFill() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 260px)' }}>
      <SnakeSpinner />
    </div>
  );
}

function DashboardContent({
  data,
  modoFilter,
  rrHistory,
  rrHistoryLoading,
  formInsights,
  matchCountFilter,
  setMatchCountFilter,
  sides,
}: {
  data: DashboardSummary;
  modoFilter: MatchModeFilter;
  rrHistory: RrHistoryPoint[];
  rrHistoryLoading: boolean;
  formInsights: RecentFormInsights | null;
  matchCountFilter: MatchCountFilter;
  setMatchCountFilter: (n: MatchCountFilter) => void;
  sides: SidesBreakdown | null;
}) {
  const navigate = useNavigate();
  const { kpis, hasComparison, mapWinrates, agentWinrates, recentMatches, last14Results } = data;
  const totalInWindow = kpis.winrate.wins + kpis.winrate.losses;

  const kpiCards = [
    {
      label: 'KDA médio',
      value: fmtNum(kpis.kda.value, 2),
      delta: kpis.kda.delta,
      deltaLabel: fmtDelta(kpis.kda.delta, 2),
      explain: 'Abates mais assistências divididos pelas mortes, por partida.',
      spark: kpis.kda.spark,
    },
    {
      label: 'ACS médio',
      value: String(kpis.acs.value),
      delta: kpis.acs.delta,
      deltaLabel: fmtDelta(kpis.acs.delta, 0),
      explain: 'Pontuação de combate por round: dano, abates e utilidade somados.',
      spark: kpis.acs.spark,
    },
    {
      label: 'Tiros na cabeça',
      value: `${fmtNum(kpis.hsPercent.value, 1)}%`,
      delta: kpis.hsPercent.delta,
      deltaLabel: fmtDelta(kpis.hsPercent.delta, 1, ' pt'),
      explain: 'Dos seus tiros que acertaram, quantos foram na cabeça.',
      spark: kpis.hsPercent.spark,
    },
    {
      label: 'Partidas ganhas',
      value: `${kpis.winrate.value}%`,
      delta: kpis.winrate.delta,
      deltaLabel: fmtDelta(kpis.winrate.delta, 0, ' pt'),
      explain: `${plural(kpis.winrate.wins, 'vitória')} em ${plural(totalInWindow, 'partida')} jogada${totalInWindow === 1 ? '' : 's'} nos últimos 30 dias.`,
      spark: kpis.winrate.spark,
    },
  ];

  const form = streaks(last14Results.slice(-10));
  const formBoxes = last14Results.slice(-10);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {kpiCards.map((k) => {
          const positive = k.delta > 0;
          const color = positive ? 'var(--pos, #18AAB7)' : k.delta < 0 ? 'var(--text-muted-2)' : 'var(--text-faint)';
          return (
            <div key={k.label} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{k.label}</span>
                {hasComparison && <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{k.deltaLabel}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 32, letterSpacing: '-.02em', lineHeight: 1 }}>{k.value}</span>
                <MiniSparkline values={k.spark} color={color} />
              </div>
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
                <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)' }}>{k.explain}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14 }}>
        <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>RR ganho e perdido</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                Soma acumulada de RR — cada ponto é uma partida.
                {rrHistory.length > 0 && (
                  <>
                    {' '}
                    Fechou em{' '}
                    <span style={{ color: rrHistory.reduce((s, p) => s + p.delta, 0) >= 0 ? 'var(--pos, #18AAB7)' : 'var(--text-muted-2)' }}>
                      {fmtDelta(rrHistory.reduce((s, p) => s + p.delta, 0), 0)} RR
                    </span>
                    .
                  </>
                )}
              </div>
            </div>
            <MatchCountButtons matchCountFilter={matchCountFilter} setMatchCountFilter={setMatchCountFilter} />
          </div>
          {rrHistoryLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
              <SnakeSpinner size={32} />
            </div>
          ) : rrHistory.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: WIN }} /> partida ganhou RR
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: LOSS }} /> partida perdeu RR
                </span>
              </div>
              <RrLineChart points={rrHistory} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10.5, color: 'var(--text-faint)', borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
                <span>Vertical: RR acumulado no período (0 = onde você começou)</span>
                <span>Horizontal: data da partida</span>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dim)' }}>
              {modoFilter === 'Unrated' ? 'Sem histórico de RR em partidas Sem Classificação.' : 'Sem histórico de RR ainda.'}
            </div>
          )}
          {formInsights && formInsights.matchesAnalyzed > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
              {formInsights.topMap && (
                <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text-faint)' }}>•</span>
                  <span>
                    Nas últimas {formInsights.matchesAnalyzed} partidas você jogou{' '}
                    <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topMap.total}</b>{' '}
                    {formInsights.topMap.total === 1 ? 'vez' : 'vezes'} no mapa{' '}
                    <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topMap.map}</b> e ganhou{' '}
                    <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topMap.wins}</b>{' '}
                    {formInsights.topMap.wins === 1 ? 'vez' : 'vezes'} nesse mapa.
                  </span>
                </div>
              )}
              {formInsights.topAgent && (
                <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text-faint)' }}>•</span>
                  <span>
                    Nas últimas {formInsights.matchesAnalyzed} partidas você jogou{' '}
                    <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topAgent.total}</b>{' '}
                    {formInsights.topAgent.total === 1 ? 'vez' : 'vezes'} com{' '}
                    <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topAgent.agent}</b> e ganhou{' '}
                    <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topAgent.wins}</b>{' '}
                    {formInsights.topAgent.wins === 1 ? 'vez' : 'vezes'}.
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--text-faint)' }}>•</span>
                <span>
                  Nas últimas {formInsights.matchesAnalyzed} partidas você ficou com KDA negativo{' '}
                  <b style={{ color: formInsights.negativeKdaMatches > 0 ? LOSS : 'var(--text-2)', fontWeight: 600 }}>
                    {formInsights.negativeKdaMatches}
                  </b>{' '}
                  {formInsights.negativeKdaMatches === 1 ? 'vez' : 'vezes'}.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--text-faint)' }}>•</span>
                <span>
                  Nas últimas {formInsights.matchesAnalyzed} partidas você foi MVP{' '}
                  <b style={{ color: formInsights.mvpMatches > 0 ? '#E8B339' : 'var(--text-2)', fontWeight: 600 }}>
                    {formInsights.mvpMatches}
                  </b>{' '}
                  {formInsights.mvpMatches === 1 ? 'vez' : 'vezes'}.
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Suas {recentMatches.length} últimas partidas</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Da mais recente para a mais antiga</div>

          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 62px 42px', gap: 8, padding: '10px 0 6px', marginTop: 8, borderBottom: '1px solid var(--divider)', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
            <span>V/D</span>
            <span>MAPA · AGENTE</span>
            <span>PLACAR</span>
            <span style={{ textAlign: 'right' }}>RR</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="list-row"
                onClick={() => navigate(`/partida/${m.id}`)}
                style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '9px 6px', margin: '0 -6px', borderRadius: 8, cursor: 'pointer', borderTop: '1px solid var(--divider)' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 62px 42px', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 4,
                      textAlign: 'center',
                      padding: '3px 0',
                      color: m.result === 'V' ? WIN : m.result === 'D' ? LOSS : DRAW,
                      background:
                        m.result === 'V'
                          ? 'color-mix(in srgb, var(--pos, #18AAB7) 16%, transparent)'
                          : m.result === 'D'
                            ? 'color-mix(in srgb, var(--acc, #EF4958) 14%, transparent)'
                            : 'color-mix(in srgb, var(--text-muted, #9A9DA1) 16%, transparent)',
                    }}
                  >
                    {m.result}
                  </span>
                  <span style={{ fontSize: 12.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.map} <span style={{ color: 'var(--text-faint)' }}>· {m.agent}</span>
                    {m.mvp && (
                      <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', color: '#E8B339', background: 'color-mix(in srgb, #E8B339 18%, transparent)' }}>
                        MVP
                      </span>
                    )}
                    {m.ace && (
                      <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', color: '#A78BFA', background: 'color-mix(in srgb, #A78BFA 18%, transparent)' }}>
                        ACE
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{m.score}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'right', color: m.rr === null ? 'var(--text-faint)' : m.rr >= 0 ? WIN : LOSS }}>
                    {m.rr === null ? '—' : fmtDelta(m.rr, 0)}
                  </span>
                </div>
                <div style={{ marginLeft: 32, fontSize: 10.5, color: 'var(--text-faint)' }}>
                  KDA {m.kda} · HS {m.hsPercent}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <RateBlock
          title="Em quais mapas você ganha"
          sub="% de partidas vencidas em cada mapa"
          rows={mapWinrates.map((m: MapWinrate) => ({ key: m.map, name: m.map, wins: m.wins, total: m.total }))}
          colorFor={rateBarColor}
        />
        <RateBlock
          title="Com quais agentes você ganha"
          sub="% de partidas vencidas com cada agente"
          rows={agentWinrates.map((a: AgentWinrate) => ({ key: a.agent, name: a.agent, wins: a.wins, total: a.total, dot: a.color }))}
          colorFor={rateBarColor}
        />

        <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Ataque ou defesa: onde você rende mais</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>% de rounds ganhos em cada lado</div>
          </div>
          {sides ? (
            <>
              {(
                [
                  { label: 'Ataque', ...sides.attack },
                  { label: 'Defesa', ...sides.defense },
                ] as Array<{ label: string; winratePercent: number; wins: number; total: number }>
              ).map((s) => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{s.label}</span>
                    <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17 }}>{s.winratePercent}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 5, background: 'var(--track)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${s.winratePercent}%`, borderRadius: 5, background: s.winratePercent >= 50 ? WIN : UNDER_50 }} />
                    <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'var(--text-faint)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{plural(s.wins, 'round')} ganho{s.wins === 1 ? '' : 's'} de {s.total}</span>
                </div>
              ))}
              {sides.overtime.total > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  + overtime: {sides.overtime.wins} de {sides.overtime.total} rounds
                </div>
              )}
              <p style={{ borderTop: '1px solid var(--divider)', paddingTop: 9, margin: 0, fontSize: 11, lineHeight: 1.4, color: 'var(--text-faint)' }}>
                O traço no meio da barra marca os 50%. Ataque e defesa são medidos separadamente — por isso não somam 100%.
              </p>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Carregando…</div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Vitórias e derrotas em sequência</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Uma caixa por partida: V venceu, D perdeu, E empatou</div>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 4 }}>
              {formBoxes.map((r, i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10.5,
                    fontWeight: 700,
                    background:
                      r === 'V'
                        ? 'color-mix(in srgb, var(--pos, #18AAB7) 18%, transparent)'
                        : r === 'D'
                          ? 'color-mix(in srgb, var(--acc, #EF4958) 18%, transparent)'
                          : 'color-mix(in srgb, var(--text-muted, #9A9DA1) 18%, transparent)',
                    color: r === 'V' ? WIN : r === 'D' ? LOSS : DRAW,
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 5 }}>
              <span>{formBoxes.length} partidas atrás</span>
              <span>partida mais recente</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: 'var(--text-dim)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Saldo nas {formBoxes.length}</span>
              <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                {formBoxes.filter((r) => r === 'V').length}V–{formBoxes.filter((r) => r === 'D').length}D–{formBoxes.filter((r) => r === 'E').length}E
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sequência atual</span>
              <b style={{ color: form.currentType === 'V' ? WIN : form.currentType === 'E' ? DRAW : 'var(--text-2)', fontWeight: 600 }}>
                {form.currentType
                  ? plural(form.currentCount, form.currentType === 'V' ? 'vitória' : form.currentType === 'D' ? 'derrota' : 'empate')
                  : '—'}
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Melhor sequência</span>
              <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{plural(form.bestWin, 'vitória')}</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const {
    sync,
    startSync,
    dashboard: data,
    dashboardError: error,
    dashboardLoading: loading,
    reloadDashboard,
    modoFilter,
    setModoFilter,
    matchCountFilter,
    setMatchCountFilter,
    sides,
    rrHistory,
    rrHistoryLoading,
    formInsights,
  } = useOutletContext<OutletContext>();
  const { user } = useSession();

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header fixo — greeting, filtro de modo e ações não saem da tela
          durante o loading, só o conteúdo abaixo troca por um spinner. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-.025em', margin: 0 }}>
              De volta, {firstName(user)}
            </h1>
            {data && data.rank.current !== '—' && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '5px 11px',
                }}
              >
                {data.rank.current} · {data.rank.rr} RR
                {data.rank.rrDelta7d !== 0 && (
                  <span style={{ color: data.rank.rrDelta7d > 0 ? 'var(--pos, #18AAB7)' : 'var(--text-muted-2)' }}> {fmtDelta(data.rank.rrDelta7d, 0)}</span>
                )}
              </span>
            )}
          </div>
          {data && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
              {plural(data.kpis.winrate.wins + data.kpis.winrate.losses, 'partida')} · 30 dias · {data.kpis.winrate.wins}V–{data.kpis.winrate.losses}D
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ModoFilterButtons modoFilter={modoFilter} setModoFilter={setModoFilter} />
          <button className="btn-secondary" style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 17px' }} onClick={() => navigate('/board')}>
            Abrir board
          </button>
          <button
            className="btn-primary"
            style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 17px', fontSize: 13 }}
            onClick={startSync}
            disabled={sync?.state === 'syncing'}
          >
            + Sincronizar
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingFill />
      ) : error && !data ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button className="btn-secondary" onClick={reloadDashboard}>
            Tentar de novo
          </button>
        </div>
      ) : !data ? null : data.recentMatches.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          {modoFilter === 'all'
            ? 'Nenhuma partida sincronizada ainda. Clica no ícone de sincronizar lá em cima pra buscar suas últimas partidas.'
            : `Nenhuma partida ${modoFilter === 'Competitive' ? 'competitiva' : 'sem classificação'} nas suas partidas sincronizadas. Troque o filtro acima ou sincronize mais partidas.`}
        </div>
      ) : (
        <DashboardContent
          data={data}
          modoFilter={modoFilter}
          rrHistory={rrHistory}
          rrHistoryLoading={rrHistoryLoading}
          formInsights={formInsights}
          matchCountFilter={matchCountFilter}
          setMatchCountFilter={setMatchCountFilter}
          sides={sides}
        />
      )}

      {error && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderRadius: 14, padding: '14px 18px', background: 'var(--acc10, rgba(239,73,88,.1))', border: '1px solid var(--acc25, rgba(239,73,88,.25))' }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--acc, #EF4958)', whiteSpace: 'nowrap' }}>API INSTÁVEL</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{error} Os números acima são da última carga que deu certo.</span>
          <button
            style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 9, background: 'transparent', border: '1px solid var(--acc25, rgba(239,73,88,.25))', color: 'var(--acc, #EF4958)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={reloadDashboard}
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
