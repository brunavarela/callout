// Primitivos visuais compartilhados entre o painel individual (Dashboard.tsx)
// e o painel do time (TeamDashboard.tsx) — cores, formatação e os dois
// formatos de card recorrentes (barra de winrate / ranking numerado).
// Extraído de Dashboard.tsx (era tudo privado lá) sem mudar comportamento.

export const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

export const WIN = 'var(--pos, #18AAB7)';
export const LOSS = 'var(--neg, #EF4958)';
export const DRAW = 'var(--text-muted, #9A9DA1)';
export const LOW_SAMPLE = 'var(--bar-dim)';
export const UNDER_50 = 'color-mix(in srgb, var(--neg, #EF4958) 42%, var(--track))';
export const MIN_SAMPLE = 3;
export const GOLD = '#E8B339';

export function fmtNum(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',');
}

export function fmtDelta(n: number, decimals: number, suffix = ''): string {
  const abs = Math.abs(n);
  const numStr = decimals > 0 ? fmtNum(abs, decimals) : String(Math.round(abs));
  if (n > 0) return `+${numStr}${suffix}`;
  if (n < 0) return `−${numStr}${suffix}`;
  return `${numStr}${suffix}`;
}

export function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function rateBarColor(wins: number, total: number): string {
  if (total < MIN_SAMPLE) return LOW_SAMPLE;
  return wins / total >= 0.5 ? WIN : UNDER_50;
}

export function RateBlock({
  title,
  sub,
  rows,
  colorFor,
}: {
  title: string;
  sub: string;
  rows: Array<{ key: string; name: string; wins: number; total: number; dot?: string }>;
  colorFor: (wins: number, total: number) => string;
}) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
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
      )}
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

export interface RankingRow {
  key: string;
  name: string;
  value: string;
  caption?: string;
  dot?: string;
}

// Leaderboard genérico — numerado, nome + legenda opcional, valor alinhado
// à direita, destaque dourado no 1º lugar (mesma cor do badge de MVP em
// MatchRow.tsx/TeamMatches.tsx). Cobre ACS/MVP/assistências/first
// blood/clutches/agentes do painel do time — uma implementação só.
export function RankingBlock({ title, sub, rows }: { title: string; sub: string; rows: RankingRow[] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((r, i) => {
            const isFirst = i === 0;
            return (
              <div
                key={r.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 8px',
                  borderRadius: 8,
                  background: isFirst ? `color-mix(in srgb, ${GOLD} 10%, transparent)` : 'transparent',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    flex: 'none',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: isFirst ? GOLD : 'var(--text-faint)',
                    background: isFirst ? `color-mix(in srgb, ${GOLD} 18%, transparent)` : 'var(--track)',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-3)', overflow: 'hidden' }}>
                  {r.dot && <span style={{ width: 9, height: 9, borderRadius: 3, background: r.dot, flex: 'none' }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                    {r.caption && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--text-faint)' }}>{r.caption}</span>}
                  </span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isFirst ? GOLD : 'var(--text-2)', whiteSpace: 'nowrap' }}>{r.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
