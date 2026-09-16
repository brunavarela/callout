// Primitivos visuais compartilhados entre o painel individual (Dashboard.tsx)
// e o painel da equipe (EquipePainel.tsx) — cores, formatação e os dois
// formatos de card recorrentes (barra de winrate / ranking numerado).
// Extraído de Dashboard.tsx (era tudo privado lá) sem mudar comportamento.

// minWidth:0 evita que um card vire item de flex/grid "grudado" na largura
// mínima do conteúdo mais largo lá dentro (ex.: a lista de partidas, que
// tem um scroll interno pra conteúdo largo) -- sem isso, o card inteiro (e
// a coluna dele) cresce pra caber o conteúdo em vez de travar na largura
// disponível e deixar só o scroll interno (.scroll-x-mobile) resolver.
export const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)', minWidth: 0 };

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

// "?" ao lado de um título de stat — passa o mouse (ou foca via teclado)
// pra ver a legenda numa bolha, mesma linguagem visual do resto do app.
export function InfoDot({ text, align = 'left' }: { text: string; align?: 'left' | 'right' }) {
  return (
    <span className={`info-tip${align === 'right' ? ' align-right' : ''}`} tabIndex={0}>
      <span className="info-dot">?</span>
      <span className="info-tip-bubble">{text}</span>
    </span>
  );
}

// Quadradinho de ícone (mapa/agente, via valorant-api.com) ou, na ausência
// de ícone, um "dot" de cor — usado tanto em RateBlock quanto em
// RankingBlock. Ícone tem prioridade sobre `dot` quando os dois vêm juntos.
function RowGlyph({ icon, dot, size }: { icon?: string; dot?: string; size: number }) {
  if (icon) return <img src={icon} alt="" style={{ width: size, height: size, borderRadius: 4, objectFit: 'contain', background: 'var(--track)', flex: 'none' }} />;
  if (dot) return <span style={{ width: 9, height: 9, borderRadius: 3, background: dot, flex: 'none' }} />;
  return null;
}

export function RateBlock({
  title,
  sub,
  rows,
  colorFor,
  maxHeight,
}: {
  title: string;
  sub: string;
  rows: Array<{ key: string; name: string; wins: number; total: number; dot?: string; icon?: string }>;
  colorFor: (wins: number, total: number) => string;
  // Opcional — quando passado, o card vira altura fixa e só a lista de
  // linhas rola por dentro (título/legenda continuam sempre visíveis). Sem
  // isso, o card cresce com o conteúdo (comportamento de sempre).
  maxHeight?: number;
}) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, ...(maxHeight ? { height: maxHeight } : {}) }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, ...(maxHeight ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
          {rows.map((r) => (
            <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 40px', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-3)' }}>
                    <RowGlyph icon={r.icon} dot={r.dot} size={18} />
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
  icon?: string;
}

// Leaderboard genérico — numerado, nome + legenda opcional, valor alinhado
// à direita, destaque dourado no 1º lugar (mesma cor do badge de MVP em
// MatchRow.tsx/EquipePartidas.tsx). Cobre ACS/MVP/assistências/first
// blood/clutches/agentes do painel da equipe — uma implementação só.
export function RankingBlock({ title, sub, rows, style }: { title: string; sub: string; rows: RankingRow[]; style?: React.CSSProperties }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, ...style }}>
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
                  <RowGlyph icon={r.icon} dot={r.dot} size={20} />
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
