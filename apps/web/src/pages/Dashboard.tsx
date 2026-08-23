import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AgentWinrate, MapWinrate, RrHistoryPoint, SessionUser, SidesBreakdown } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import type { RrRange } from '../lib/appData';
import { useSession } from '../lib/session';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const RANGES: Array<{ key: RrRange; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--acc, #EF4958)';
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

function streaks(results: Array<'V' | 'D'>): { currentType: 'V' | 'D' | null; currentCount: number; bestWin: number } {
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
          stroke={points[i]!.delta >= 0 ? WIN : LOSS}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/partida/${points[i]!.matchId}`)}
        >
          <title>
            {points[i]!.label} · {points[i]!.map} · {points[i]!.agent} · {points[i]!.result === 'V' ? 'vitória' : 'derrota'} ·{' '}
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

export function Dashboard() {
  const navigate = useNavigate();
  const { sync, startSync, dashboard: data, dashboardError: error, dashboardLoading: loading, reloadDashboard, sides, rrRange, setRrRange, rrHistory } =
    useOutletContext<OutletContext>();
  const { user } = useSession();

  if (loading) {
    return <div style={{ padding: 26, color: 'var(--text-muted)' }}>Carregando…</div>;
  }

  if (error && !data) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button className="btn-secondary" onClick={reloadDashboard}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.recentMatches.length === 0) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nenhuma partida sincronizada ainda. Clica no ícone de sincronizar lá em cima pra buscar suas últimas partidas.
        </div>
      </div>
    );
  }

  const { kpis, mapWinrates, agentWinrates, recentMatches, rank, last14Results } = data;
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
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-.025em', margin: 0 }}>
              De volta, {firstName(user)}
            </h1>
            {rank.current !== '—' && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '5px 11px',
                }}
              >
                {rank.current} · {rank.rr} RR
                {rank.rrDelta7d !== 0 && (
                  <span style={{ color: rank.rrDelta7d > 0 ? 'var(--pos, #18AAB7)' : 'var(--text-muted-2)' }}> {fmtDelta(rank.rrDelta7d, 0)}</span>
                )}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            {plural(totalInWindow, 'partida')} · 30 dias · {kpis.winrate.wins}V–{kpis.winrate.losses}D
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => navigate('/board')}>
            Abrir board
          </button>
          <button className="btn-primary" style={{ padding: '11px 17px', fontSize: 13 }} onClick={startSync} disabled={sync?.state === 'syncing'}>
            + Sincronizar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {kpiCards.map((k) => {
          const positive = k.delta > 0;
          const color = positive ? 'var(--pos, #18AAB7)' : k.delta < 0 ? 'var(--text-muted-2)' : 'var(--text-faint)';
          return (
            <div key={k.label} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{k.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{k.deltaLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 32, letterSpacing: '-.02em', lineHeight: 1 }}>{k.value}</span>
                <MiniSparkline values={k.spark} color={color} />
              </div>
              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)' }}>{k.explain}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{k.deltaLabel} contra os 30 dias anteriores · linha: últimas partidas, eixo em zero</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14 }}>
        <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>RR ganho e perdido no período</div>
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
            <div style={{ display: 'flex', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: 3, flex: 'none' }}>
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRrRange(r.key)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    background: rrRange === r.key ? 'var(--acc, #EF4958)' : 'transparent',
                    color: rrRange === r.key ? '#141415' : 'var(--text-muted)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {rrHistory.length > 0 ? (
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
            <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dim)' }}>Sem histórico de RR ainda.</div>
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
                      color: m.result === 'V' ? WIN : LOSS,
                      background: m.result === 'V' ? 'color-mix(in srgb, var(--pos, #18AAB7) 16%, transparent)' : 'color-mix(in srgb, var(--acc, #EF4958) 14%, transparent)',
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
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Uma caixa por partida: V venceu, D perdeu</div>
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
                    background: r === 'V' ? 'color-mix(in srgb, var(--pos, #18AAB7) 18%, transparent)' : 'color-mix(in srgb, var(--acc, #EF4958) 18%, transparent)',
                    color: r === 'V' ? WIN : LOSS,
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
                {formBoxes.filter((r) => r === 'V').length}V–{formBoxes.filter((r) => r === 'D').length}D
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sequência atual</span>
              <b style={{ color: form.currentType === 'V' ? WIN : 'var(--text-2)', fontWeight: 600 }}>
                {form.currentType ? plural(form.currentCount, form.currentType === 'V' ? 'vitória' : 'derrota') : '—'}
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Melhor sequência</span>
              <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{plural(form.bestWin, 'vitória')}</b>
            </div>
          </div>
        </div>
      </div>

      {error && (
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
