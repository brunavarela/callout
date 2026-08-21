import { useMemo } from 'react';
import { matchComments, myMatchStats, roundResults, scoreboard } from '../data/mock';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const scoreCols = '1fr 100px 62px 54px 54px 54px 62px';

export function MatchDetail() {
  const sorted = useMemo(() => {
    const ours = scoreboard.filter((p) => p.ours).sort((a, b) => b.acs - a.acs);
    const theirs = scoreboard.filter((p) => !p.ours).sort((a, b) => b.acs - a.acs);
    return [...ours, ...theirs];
  }, []);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -60,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--acc18, rgba(239,73,88,.18)) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)' }}>COMPETITIVO · ONTEM 23:14 · 41 MIN</div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 38, letterSpacing: '-.03em', lineHeight: 1.1, marginTop: 6 }}>Bind</div>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 40, fontWeight: 600, color: 'var(--pos, #18AAB7)' }}>13</span>
          <span style={{ fontSize: 20, color: 'var(--text-faint)' }}>—</span>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 40, fontWeight: 600, color: 'var(--text-muted-2)' }}>11</span>
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {roundResults.map((won, i) => (
            <div
              key={i}
              style={{ width: 12, borderRadius: 3, height: 18 + ((i * 23) % 24), background: won ? 'var(--pos, #18AAB7)' : 'var(--bar-dim)' }}
            />
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: scoreCols, padding: '14px 22px', fontSize: 10.5, letterSpacing: '.12em', color: 'var(--text-dim)' }}>
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
              padding: '11px 22px',
              borderTop: '1px solid var(--divider)',
              fontSize: 13,
              background: p.name === 'thiago' ? 'color-mix(in srgb, var(--acc, #EF4958) 9%, transparent)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 3, height: 16, borderRadius: 2, background: p.ours ? 'var(--acc, #EF4958)' : 'var(--text-faint)' }} />
              <span style={{ color: p.ours ? 'var(--text)' : 'var(--text-muted)', fontWeight: p.name === 'thiago' ? 600 : 400 }}>{p.name}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{p.tag}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{p.agent}</div>
            <div style={{ textAlign: 'right' }}>{p.acs}</div>
            <div style={{ textAlign: 'right' }}>{p.k}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.d}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.a}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.hs}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 16 }}>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>
            Comentários <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {matchComments.length}</span>
          </div>
          {matchComments.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--avatar-bg)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {c.who} · {c.when}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{c.text}</div>
              </div>
            </div>
          ))}
          <input className="input-field" placeholder="Escrever um comentário…" style={{ marginTop: 14, padding: '13px 15px', fontSize: 14 }} />
        </div>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Meus números</div>
          {myMatchStats.map((s) => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--divider)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <span>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
