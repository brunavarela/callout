import { useNavigate } from 'react-router-dom';
import type { RecentFormInsights, RrHistoryPoint, SeasonOverview } from '@callout/shared';
import { SnakeSpinner } from './Spinner';
import { cardStyle, WIN, LOSS, DRAW, fmtDelta, InfoDot } from './statsPrimitives';

// Escada de ranques (sem contar Unranked/Radiant, que não seguem o padrão
// "nome N") — usada só pra descobrir o próximo ranque a partir do atual.
const RANK_LADDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal'];

// Nome do próximo ranque a partir do tierLabel atual (ex.: "Platinum 1" ->
// "Platinum 2", "Immortal 3" -> "Radiant"). `null` quando já é Radiant (não
// tem próximo) ou quando o texto não bate no formato esperado.
function nextTierLabel(tierLabel: string): string | null {
  if (tierLabel === 'Radiant') return null;
  const match = /^(.+)\s+(\d)$/.exec(tierLabel);
  if (!match) return null;
  const [, tier, numStr] = match;
  const num = Number(numStr);
  if (num < 3) return `${tier} ${num + 1}`;
  const idx = RANK_LADDER.indexOf(tier!);
  if (idx === -1) return null;
  return idx === RANK_LADDER.length - 1 ? 'Radiant' : `${RANK_LADDER[idx + 1]} 1`;
}

// Reforço do elo atual — ícone + ranque + quanto falta de RR pro próximo.
// Cada tier tem 100 RR (0-100); assume isso pra Immortal 3 -> Radiant
// também, já que não temos como saber o corte de percentil do Radiant.
function EloReinforcement({ currentRank }: { currentRank: NonNullable<SeasonOverview['currentRank']> }) {
  const next = nextTierLabel(currentRank.tierLabel);
  const missing = 100 - currentRank.rr;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 'none', minWidth: 160, paddingLeft: 20, borderLeft: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {currentRank.iconUrl ? (
          <img src={currentRank.iconUrl} alt="" style={{ width: 38, height: 38, objectFit: 'contain', flex: 'none' }} />
        ) : (
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--avatar-bg)', flex: 'none' }} />
        )}
        <div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 16 }}>{currentRank.tierLabel}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{currentRank.rr} RR</div>
        </div>
      </div>
      {next && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>
          Faltam <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{missing}</b> RR pra chegar em{' '}
          <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{next}</b>.
        </div>
      )}
    </div>
  );
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

function RrLineChart({ points }: { points: RrHistoryPoint[] }) {
  const navigate = useNavigate();
  const w = 640;
  const h = 150;
  const pad = { l: 34, r: 8, t: 12, b: 22 };

  let running = 0;
  const cum = points.map((p) => (running += p.delta));
  const rawMin = Math.min(...cum, 0);
  const rawMax = Math.max(...cum, 0);
  // Preenchia a régua inteira com a variação real, o que faz até uma
  // oscilação pequena de RR parecer um zigue-zague enorme. Uma margem de
  // ~35% acima/abaixo (mínimo de 20 RR) deixa a linha "mais afastada",
  // sem esticar pra cobrir cada pixel do card.
  const padding = Math.max(20, (rawMax - rawMin) * 0.35);
  const ticks = niceTicks(rawMin - padding, rawMax + padding);
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

// Card de RR ganho/perdido + análises de forma recente (mapa/agente mais
// jogado, KDA negativo, MVP, saldo de RR, arma mais usada) — mesma largura
// da lista de partidas, logo abaixo dela. Sempre expandido (sem toggle);
// `height` (quando passado) trava a altura total pra bater com a coluna de
// cards ao lado, com scroll por dentro se o conteúdo não couber.
export function RrHistoryCard({
  rrHistory,
  rrHistoryLoading,
  formInsights,
  subject,
  noRankedHistory,
  currentRank,
  height,
}: {
  rrHistory: RrHistoryPoint[];
  rrHistoryLoading: boolean;
  formInsights: RecentFormInsights | null;
  subject: string;
  noRankedHistory: boolean;
  currentRank: SeasonOverview['currentRank'];
  height?: number;
}) {
  const rrBalance = rrHistory.reduce((s, p) => s + p.delta, 0);

  const bullets: React.ReactNode[] = [];
  if (formInsights?.topMap) {
    bullets.push(
      <span key="topMap">
        Nas últimas {formInsights.matchesAnalyzed} partidas {subject} jogou{' '}
        <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topMap.total}</b>{' '}
        {formInsights.topMap.total === 1 ? 'vez' : 'vezes'} no mapa <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topMap.map}</b> e
        ganhou <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topMap.wins}</b> {formInsights.topMap.wins === 1 ? 'vez' : 'vezes'} nesse
        mapa.
      </span>,
    );
  }
  if (formInsights?.topAgent) {
    bullets.push(
      <span key="topAgent">
        Nas últimas {formInsights.matchesAnalyzed} partidas {subject} jogou{' '}
        <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topAgent.total}</b>{' '}
        {formInsights.topAgent.total === 1 ? 'vez' : 'vezes'} com <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topAgent.agent}</b> e
        ganhou <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topAgent.wins}</b> {formInsights.topAgent.wins === 1 ? 'vez' : 'vezes'}.
      </span>,
    );
  }
  if (formInsights) {
    bullets.push(
      <span key="negativeKda">
        Nas últimas {formInsights.matchesAnalyzed} partidas {subject} ficou com KDA negativo{' '}
        <b style={{ color: formInsights.negativeKdaMatches > 0 ? LOSS : 'var(--text-2)', fontWeight: 600 }}>{formInsights.negativeKdaMatches}</b>{' '}
        {formInsights.negativeKdaMatches === 1 ? 'vez' : 'vezes'}.
      </span>,
    );
    bullets.push(
      <span key="mvp">
        Nas últimas {formInsights.matchesAnalyzed} partidas {subject} foi MVP{' '}
        <b style={{ color: formInsights.mvpMatches > 0 ? '#E8B339' : 'var(--text-2)', fontWeight: 600 }}>{formInsights.mvpMatches}</b>{' '}
        {formInsights.mvpMatches === 1 ? 'vez' : 'vezes'}.
      </span>,
    );
    bullets.push(
      <span key="rrBalance">
        Nas últimas {formInsights.matchesAnalyzed} partidas {subject} teve um saldo de RR de{' '}
        <b style={{ color: rrBalance >= 0 ? WIN : LOSS, fontWeight: 600 }}>{fmtDelta(rrBalance, 0)}</b>.
      </span>,
    );
    if (formInsights.topWeapon) {
      bullets.push(
        <span key="topWeapon">
          Nas últimas {formInsights.matchesAnalyzed} partidas a arma mais usada por {subject} foi{' '}
          <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topWeapon.weapon}</b>, com{' '}
          <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{formInsights.topWeapon.hsPercent}%</b> de HS no período{' '}
          <span style={{ color: 'var(--text-faint)' }}>(aproximado)</span>.
        </span>,
      );
    }
  }
  return (
    <div className="season-fixed-card" style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4, ...(height ? { height } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            RR ganho e perdido
            <InfoDot text="RR (Rank Rating) é a pontuação de ranqueada dentro do seu elo atual — vai de 0 a 100 em cada tier. Ganhar RR suficiente sobe de tier; perder no 0 pode rebaixar." />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Soma acumulada de RR — cada ponto é uma partida.</div>
        </div>
        {rrHistory.length > 0 && (
          <span
            title="Saldo de RR sob o filtro de partidas atual"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 8,
              padding: '5px 11px',
              whiteSpace: 'nowrap',
              color: rrBalance >= 0 ? WIN : LOSS,
              background: `color-mix(in srgb, ${rrBalance >= 0 ? WIN : LOSS} 14%, transparent)`,
            }}
          >
            Saldo RR {fmtDelta(rrBalance, 0)}
          </span>
        )}
      </div>
      {/* Só essa parte (gráfico + análises) rola por dentro quando `height`
          trava a altura do card pra bater com a coluna ao lado -- o
          cabeçalho (título/saldo) acima fica sempre visível. Sem isso, o
          card inteiro tinha overflow:hidden e as análises de baixo ficavam
          cortadas sem nenhum jeito de ver o resto (nem scroll, nem nada). */}
      <div style={height ? { flex: 1, minHeight: 0, overflowY: 'auto' } : undefined}>
        {rrHistoryLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>
            <SnakeSpinner size={32} />
          </div>
        ) : rrHistory.length > 0 ? (
          <div>
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
          </div>
        ) : (
          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dim)' }}>
            {noRankedHistory ? 'Sem histórico de RR em partidas Sem Classificação.' : 'Sem histórico de RR ainda.'}
          </div>
        )}
        {formInsights && formInsights.matchesAnalyzed > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 220 }}>
              {bullets.map((bullet, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text-faint)' }}>•</span>
                  {bullet}
                </div>
              ))}
            </div>
            {currentRank && <EloReinforcement currentRank={currentRank} />}
          </div>
        )}
      </div>
    </div>
  );
}
