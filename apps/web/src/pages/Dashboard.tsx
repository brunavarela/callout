import { useNavigate } from 'react-router-dom';
import { byAgent, byMap, currentUser, POS, DIM, rankHistory, recentMatches, stats } from '../data/mock';

const cardStyle: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface)' };

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>RANK ATUAL</div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em' }}>
              {currentUser.rank}
            </div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              312 RR · <span style={{ color: 'var(--positive)' }}>+47</span> nos últimos 7 dias
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 22, alignItems: 'flex-end', height: 52 }}>
            {rankHistory.map((r, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: r === 'V' ? POS : DIM,
                  height: 24 + ((i * 37) % 28),
                }}
              />
            ))}
          </div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>ÚLTIMAS 14 PARTIDAS</div>
        </div>

        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: 22, borderRight: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>{s.label}</div>
              <div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 38, lineHeight: 1, letterSpacing: '-.02em', marginTop: 26 }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, marginTop: 8, color: s.positive ? 'var(--positive)' : 'var(--text-muted-2)' }}>
                  {s.delta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 28 }}>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 16 }}>POR MAPA</div>
          {byMap.map((m) => (
            <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 46px', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ fontSize: 13 }}>{m.name}</div>
              <div style={{ height: 6, background: 'var(--track)' }}>
                <div style={{ height: 6, width: `${m.wr}%`, background: m.wr >= 55 ? POS : 'var(--bar-dim-strong)' }} />
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{m.wr}%</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 16 }}>POR AGENTE</div>
          {byAgent.map((a) => (
            <div key={a.name} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 46px', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: a.color, opacity: 0.85 }} />
                {a.name}
              </div>
              <div style={{ height: 6, background: 'var(--track)' }}>
                <div style={{ height: 6, width: `${a.wr}%`, background: a.color }} />
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{a.wr}%</div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 22px 12px' }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>PARTIDAS RECENTES</div>
            <a href="#" className="link-quiet" style={{ marginLeft: 'auto' }} onClick={(e) => { e.preventDefault(); navigate(`/partida/${recentMatches[0].id}`); }}>
              ver todas
            </a>
          </div>
          {recentMatches.map((m) => (
            <div
              key={m.id}
              className="table-row"
              onClick={() => navigate(`/partida/${m.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 1fr 78px 78px 78px 66px',
                alignItems: 'center',
                gap: 12,
                padding: '9px 22px',
                borderTop: '1px solid var(--divider-soft)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, color: m.res === 'V' ? 'var(--positive)' : 'var(--text-faint)' }}>{m.res}</div>
              <div>{m.map}</div>
              <div style={{ color: 'var(--text-muted)' }}>{m.agent}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', color: 'var(--text-muted)' }}>{m.score}</div>
              <div style={{ fontFamily: 'Inter,sans-serif' }}>{m.kda}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-faint)', textAlign: 'right' }}>{m.when}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--action-tint-border)', background: 'var(--action-tint-bg)', padding: '14px 18px' }}>
        <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.12em', color: 'var(--action)', whiteSpace: 'nowrap' }}>API INSTÁVEL</span>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
          A fonte de dados não respondeu nas últimas 3 tentativas. Os números acima são de 12 min atrás.
        </span>
        <button
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(239,73,88,.5)',
            color: 'var(--action)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
