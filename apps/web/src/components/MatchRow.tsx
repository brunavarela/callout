import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { RecentMatchSummary } from '@callout/shared';

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';

function fmtRr(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return String(abs);
}

// Uma linha de partida — badge V/D/E, mapa · agente (com MVP/ACE), placar,
// RR e uma segunda linha com KDA/HS%. Usado tanto na lista compacta do
// Dashboard quanto na página cheia de Partidas. `showViewIcon` liga o
// ícone de olho no final da linha — só na página de Partidas por ora, pra
// não apertar o card compacto do Dashboard.
export function MatchRow({ m, showViewIcon }: { m: RecentMatchSummary; showViewIcon?: boolean }) {
  const navigate = useNavigate();
  return (
    <div
      key={m.id}
      className="list-row"
      onClick={() => navigate(`/partida/${m.id}`)}
      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '9px 6px', margin: '0 -6px', borderRadius: 8, cursor: 'pointer', borderTop: '1px solid var(--divider)' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: showViewIcon ? '24px 1fr 62px 42px 24px' : '24px 1fr 62px 42px', gap: 8, alignItems: 'center' }}>
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
                  ? 'color-mix(in srgb, var(--neg, #EF4958) 14%, transparent)'
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
          {m.rr === null ? '—' : fmtRr(m.rr)}
        </span>
        {showViewIcon && (
          <span title="Ver detalhes" style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-faint)' }}>
            <Eye size={15} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div style={{ marginLeft: 32, fontSize: 10.5, color: 'var(--text)' }}>
        KDA {m.kda} · HS {m.hsPercent}%
      </div>
    </div>
  );
}
