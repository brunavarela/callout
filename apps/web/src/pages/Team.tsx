import { teamMembers } from '../data/mock';

export function Team() {
  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 40, letterSpacing: '-.03em', margin: 0 }}>Os boys</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted-2)', marginTop: 6 }}>
          {teamMembers.length} membros · 34 partidas juntos nos últimos 30 dias · 58% de winrate em grupo
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {teamMembers.map((p) => (
          <div key={p.name} style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--avatar-bg)', border: '1px solid rgba(255,255,255,.1)' }} />
              <div
                style={{
                  fontFamily: 'Inter,sans-serif',
                  fontSize: 9,
                  letterSpacing: '.1em',
                  color: p.role === 'DUELISTA' ? 'var(--action)' : 'var(--text-muted)',
                  border: '1px solid rgba(255,255,255,.12)',
                  padding: '4px 7px',
                }}
              >
                {p.role}
              </div>
            </div>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 22, marginTop: 16, letterSpacing: '-.01em' }}>{p.name}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-dim)' }}>{p.rank}</div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'KDA', value: p.kda, w: p.kdaW },
                { label: 'ACS', value: p.acs, w: p.acsW },
                { label: 'WR', value: p.wr, w: p.wrW },
              ].map((row) => (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 44px', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-dim)' }}>{row.label}</div>
                  <div style={{ height: 5, background: 'var(--track)' }}>
                    <div style={{ height: 5, width: `${row.w}%`, background: p.highlight ? 'var(--action)' : 'var(--bar-dim-strong)' }} />
                  </div>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, textAlign: 'right' }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 12, color: 'var(--text-muted-2)', lineHeight: 1.5 }}>
              {p.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
