import { useNavigate } from 'react-router-dom';
import type { MatchCountFilter, RecentFormInsights, RrHistoryPoint } from '@callout/shared';
import { SnakeSpinner } from './Spinner';
import { cardStyle, WIN, LOSS, DRAW, fmtDelta } from './statsPrimitives';

const MATCH_COUNTS: Array<{ key: MatchCountFilter; label: string }> = [
  { key: 7, label: 'Últimas 7' },
  { key: 20, label: 'Últimas 20' },
];

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

// Mesmo padrão visual do resto dos filtros compactos do app — controla a
// janela de partidas (7/20) do gráfico de RR e dos 4 tópicos de análise, que
// usam o mesmo filtro pra bater.
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
            color: matchCountFilter === c.key ? 'var(--acc-text, #141415)' : 'var(--text-muted)',
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// Card de RR ganho/perdido + as 4 análises de forma recente (mapa/agente
// mais jogado, KDA negativo, MVP) — volta como card próprio, largura
// inteira, abaixo da lista de partidas do ato.
export function RrHistoryCard({
  rrHistory,
  rrHistoryLoading,
  formInsights,
  matchCountFilter,
  setMatchCountFilter,
  subject,
  noRankedHistory,
}: {
  rrHistory: RrHistoryPoint[];
  rrHistoryLoading: boolean;
  formInsights: RecentFormInsights | null;
  matchCountFilter: MatchCountFilter;
  setMatchCountFilter: (n: MatchCountFilter) => void;
  subject: string;
  noRankedHistory: boolean;
}) {
  return (
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
            <span>Vertical: RR acumulado no período (0 = onde {subject} começou)</span>
            <span>Horizontal: data da partida</span>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dim)' }}>
          {noRankedHistory ? 'Sem histórico de RR em partidas Sem Classificação.' : 'Sem histórico de RR ainda.'}
        </div>
      )}
      {formInsights && formInsights.matchesAnalyzed > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
          {formInsights.topMap && (
            <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
              <span style={{ color: 'var(--text-faint)' }}>•</span>
              <span>
                Nas últimas {formInsights.matchesAnalyzed} partidas {subject} jogou{' '}
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
                Nas últimas {formInsights.matchesAnalyzed} partidas {subject} jogou{' '}
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
              Nas últimas {formInsights.matchesAnalyzed} partidas {subject} ficou com KDA negativo{' '}
              <b style={{ color: formInsights.negativeKdaMatches > 0 ? LOSS : 'var(--text-2)', fontWeight: 600 }}>
                {formInsights.negativeKdaMatches}
              </b>{' '}
              {formInsights.negativeKdaMatches === 1 ? 'vez' : 'vezes'}.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
            <span style={{ color: 'var(--text-faint)' }}>•</span>
            <span>
              Nas últimas {formInsights.matchesAnalyzed} partidas {subject} foi MVP{' '}
              <b style={{ color: formInsights.mvpMatches > 0 ? '#E8B339' : 'var(--text-2)', fontWeight: 600 }}>{formInsights.mvpMatches}</b>{' '}
              {formInsights.mvpMatches === 1 ? 'vez' : 'vezes'}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
