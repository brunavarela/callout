import { useMemo } from 'react';
import { matchComments, myMatchStats, roundResults, scoreboard, DIM, POS } from '../data/mock';

const cardStyle: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface)' };
const scoreCols = '1fr 100px 64px 56px 56px 56px 64px';

export function MatchDetail() {
  const sorted = useMemo(() => {
    const ours = scoreboard.filter((p) => p.ours).sort((a, b) => b.acs - a.acs);
    const theirs = scoreboard.filter((p) => !p.ours).sort((a, b) => b.acs - a.acs);
    return [...ours, ...theirs];
  }, []);

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 34, borderBottom: '1px solid var(--border)', paddingBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>
            COMPETITIVO · ONTEM 23:14 · 41 MIN
          </div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 46, letterSpacing: '-.03em', lineHeight: 1.05, marginTop: 6 }}>
            Bind
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontFamily: 'Inter,sans-serif' }}>
          <span style={{ fontSize: 44, fontWeight: 600, color: 'var(--positive)' }}>13</span>
          <span style={{ fontSize: 22, color: 'var(--text-faint)' }}>—</span>
          <span style={{ fontSize: 44, fontWeight: 600, color: 'var(--text-muted-2)' }}>11</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          {roundResults.map((won, i) => (
            <div key={i} style={{ width: 13, height: 16 + ((i * 23) % 22), background: won ? POS : DIM }} />
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: scoreCols, padding: '12px 22px', fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.12em', color: 'var(--text-dim)' }}>
          <div>JOGADOR</div>
          <div>AGENTE</div>
          <div style={{ textAlign: 'right' }}>ACS</div>
          <div style={{ textAlign: 'right' }}>K</div>
          <div style={{ textAlign: 'right' }}>D</div>
          <div style={{ textAlign: 'right' }}>A</div>
          <div style={{ textAlign: 'right' }}>HS%</div>
        </div>
        {sorted.map((p) => (
          <div
            key={p.name}
            style={{
              display: 'grid',
              gridTemplateColumns: scoreCols,
              padding: '10px 22px',
              borderTop: '1px solid var(--divider-soft)',
              fontSize: 13,
              background: p.name === 'thiago' ? 'var(--action-tint-row)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 3, height: 16, background: p.ours ? 'var(--action)' : '#4F5258' }} />
              <span style={{ color: p.ours ? 'var(--text)' : 'var(--text-muted)', fontWeight: p.name === 'thiago' ? 600 : 400 }}>{p.name}</span>
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-faint)' }}>{p.tag}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{p.agent}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', textAlign: 'right' }}>{p.acs}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', textAlign: 'right' }}>{p.k}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', textAlign: 'right', color: 'var(--text-muted)' }}>{p.d}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', textAlign: 'right', color: 'var(--text-muted)' }}>{p.a}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', textAlign: 'right', color: 'var(--text-muted)' }}>{p.hs}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 8 }}>
            COMENTÁRIOS · {matchComments.length}
          </div>
          {matchComments.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12, padding: '12px 0', borderTop: '1px solid var(--divider-soft)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--avatar-bg)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {c.who} · {c.when}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{c.text}</div>
              </div>
            </div>
          ))}
          <input className="input-field" placeholder="Escrever um comentário…" style={{ marginTop: 14, padding: '12px 14px', fontSize: 14 }} />
        </div>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 8 }}>MEUS NÚMEROS</div>
          {myMatchStats.map((s) => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid var(--divider-soft)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontFamily: 'Inter,sans-serif' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
