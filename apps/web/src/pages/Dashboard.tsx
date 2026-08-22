import { useNavigate, useOutletContext } from 'react-router-dom';
import type { RrHistoryPoint, SessionUser, SidesBreakdown } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import type { RrRange } from '../lib/appData';
import { useSession } from '../lib/session';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const RANGES: Array<{ key: RrRange; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

function fmtNum(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',');
}

function fmtDelta(n: number, decimals: number): string {
  const abs = Math.abs(n);
  const numStr = decimals > 0 ? fmtNum(abs, decimals) : String(Math.round(abs));
  if (n > 0) return `+${numStr}`;
  if (n < 0) return `−${numStr}`;
  return numStr;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 30 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            height: Math.max(3, (v / max) * 30),
            background: i === values.length - 1 ? 'var(--acc, #EF4958)' : 'color-mix(in srgb, var(--acc, #EF4958) 35%, transparent)',
          }}
        />
      ))}
    </div>
  );
}

function RrChart({ points }: { points: RrHistoryPoint[] }) {
  const maxUp = Math.max(10, ...points.map((p) => Math.max(0, p.delta)));
  const maxDown = Math.max(10, ...points.map((p) => Math.max(0, -p.delta)));
  const zeroTop = (maxUp / (maxUp + maxDown)) * 100;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10, marginTop: 20 }}>
      <div style={{ position: 'relative', height: 190, fontSize: 10.5, color: '#5A5D61', textAlign: 'right' }}>
        <span style={{ position: 'absolute', top: 0 }}>+{maxUp}</span>
        <span style={{ position: 'absolute', top: `${zeroTop}%`, transform: 'translateY(-50%)' }}>0</span>
        <span style={{ position: 'absolute', bottom: 0 }}>−{maxDown}</span>
      </div>
      <div>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'stretch',
            gap: 8,
            height: 190,
            borderLeft: '1px solid var(--surface-border)',
            borderBottom: '1px solid var(--surface-border)',
            padding: '0 4px',
          }}
        >
          <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroTop}%`, height: 1, background: 'var(--divider)' }} />
          {points.map((p, i) => {
            const positive = p.delta >= 0;
            const magnitude = positive ? (Math.abs(p.delta) / maxUp) * zeroTop : (Math.abs(p.delta) / maxDown) * (100 - zeroTop);
            return (
              <div key={i} style={{ position: 'relative', flex: 1 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '70%',
                    maxWidth: 34,
                    borderRadius: 5,
                    background: positive ? 'var(--pos, #18AAB7)' : 'color-mix(in srgb, var(--acc, #EF4958) 55%, transparent)',
                    top: positive ? 'auto' : `${zeroTop}%`,
                    bottom: positive ? `${100 - zeroTop}%` : 'auto',
                    height: `${magnitude}%`,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '8px 4px 0' }}>
          {points.map((p, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: '#5A5D61' }}>
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidesDonut({ sides, winratePercent }: { sides: SidesBreakdown; winratePercent: number }) {
  const totalRounds = sides.attack.total + sides.defense.total + sides.overtime.total;
  const attackShare = totalRounds > 0 ? (sides.attack.total / totalRounds) * 100 : 0;
  const defenseShare = totalRounds > 0 ? (sides.defense.total / totalRounds) * 100 : 0;

  const donut =
    totalRounds > 0
      ? `conic-gradient(var(--pos, #18AAB7) 0 ${attackShare}%, color-mix(in srgb, var(--acc, #EF4958) 70%, transparent) ${attackShare}% ${attackShare + defenseShare}%, var(--bar-dim) ${attackShare + defenseShare}% 100%)`
      : 'var(--bar-dim)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16 }}>
      <div style={{ width: 112, height: 112, borderRadius: '50%', flex: 'none', background: donut, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 19, lineHeight: 1 }}>{winratePercent}%</div>
          <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 3 }}>WINRATE</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0 }}>
        {[
          { label: 'Ataque', value: `${sides.attack.winratePercent}%`, color: 'var(--pos, #18AAB7)' },
          { label: 'Defesa', value: `${sides.defense.winratePercent}%`, color: 'color-mix(in srgb, var(--acc, #EF4958) 70%, transparent)' },
          { label: 'Overtime', value: `${sides.overtime.wins} de ${sides.overtime.total}`, color: 'var(--bar-dim)' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
            <span style={{ color: 'var(--text-3)' }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', paddingLeft: 12 }}>{s.value}</span>
          </div>
        ))}
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

  const { kpis, mapWinrates, agentWinrates, recentMatches, rank } = data;
  const totalInWindow = kpis.winrate.wins + kpis.winrate.losses;
  const recentCount = recentMatches.filter((m) => m.playedAtLabel.startsWith('hoje') || m.playedAtLabel.startsWith('ontem')).length;

  const kpiCards = [
    { label: 'KDA', value: fmtNum(kpis.kda.value, 2), delta: `${fmtDelta(kpis.kda.delta, 2)} vs. 30d`, positive: kpis.kda.delta > 0, icon: '◇', spark: kpis.kda.spark },
    { label: 'ACS', value: String(kpis.acs.value), delta: `${fmtDelta(kpis.acs.delta, 0)} vs. 30d`, positive: kpis.acs.delta > 0, icon: '◈', spark: kpis.acs.spark },
    { label: 'HS%', value: `${fmtNum(kpis.hsPercent.value, 1)}%`, delta: `${fmtDelta(kpis.hsPercent.delta, 1)} vs. 30d`, positive: kpis.hsPercent.delta > 0, icon: '◎', spark: kpis.hsPercent.spark },
    { label: 'WINRATE', value: `${kpis.winrate.value}%`, delta: `${kpis.winrate.wins}V · ${kpis.winrate.losses}D`, positive: false, icon: '◐', spark: kpis.acs.spark.map((_, i, arr) => (i / Math.max(1, arr.length - 1)) * 100) },
  ];

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
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
            {totalInWindow} partida{totalInWindow === 1 ? '' : 's'} nos últimos 30 dias
            {recentCount > 0 ? ` · ${recentCount} recente${recentCount === 1 ? '' : 's'}` : ''}.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {kpiCards.map((k) => (
          <div key={k.label} style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', padding: '18px 20px', background: 'var(--kpi-bg, var(--surface))', border: '1px solid var(--kpi-border, var(--surface-border))' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
              <div style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 8, border: '1px solid var(--kpi-border, var(--surface-border))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--acc, #EF4958)' }}>
                {k.icon}
              </div>
            </div>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 32, letterSpacing: '-.02em', marginTop: 12, lineHeight: 1 }}>{k.value}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 14 }}>
              <div style={{ fontSize: 12, color: k.positive ? 'var(--pos, #18AAB7)' : 'var(--text-muted-2)', whiteSpace: 'nowrap' }}>{k.delta}</div>
              <div style={{ marginLeft: 'auto' }}>
                <Sparkline values={k.spark} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: 16 }}>
        <div style={{ ...cardStyle, padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Partidas recentes</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="list-row"
                onClick={() => navigate(`/partida/${m.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 10px', margin: '0 -10px', borderRadius: 11, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    flex: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    background: m.result === 'V' ? 'color-mix(in srgb, var(--pos, #18AAB7) 16%, transparent)' : 'rgba(255,255,255,.06)',
                    color: m.result === 'V' ? 'var(--pos, #18AAB7)' : 'var(--text-muted-2)',
                  }}
                >
                  {m.result}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {m.map} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {m.agent}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    {m.score} · KDA {m.kda}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{m.playedAtLabel}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Progressão de RR</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: 3 }}>
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
              <RrChart points={rrHistory} />
            ) : (
              <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dim)' }}>Sem histórico de RR ainda.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Por mapa</div>
          {mapWinrates.map((m) => (
            <div key={m.map} style={{ display: 'grid', gridTemplateColumns: '66px 1fr 44px', alignItems: 'center', gap: 10, padding: '6.5px 0' }}>
              <div style={{ fontSize: 13 }}>{m.map}</div>
              <div style={{ height: 7, borderRadius: 99, background: 'var(--track)' }}>
                <div style={{ height: 7, borderRadius: 99, width: `${m.winratePercent}%`, background: m.winratePercent >= 55 ? 'var(--pos, #18AAB7)' : 'var(--bar-dim)' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{m.winratePercent}%</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Por agente</div>
          {agentWinrates.map((a) => (
            <div key={a.agent} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 44px', alignItems: 'center', gap: 10, padding: '6.5px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: a.color, flex: 'none' }} />
                {a.agent}
              </div>
              <div style={{ height: 7, borderRadius: 99, background: 'var(--track)' }}>
                <div style={{ height: 7, borderRadius: 99, width: `${a.winratePercent}%`, background: a.color }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{a.winratePercent}%</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Lados</div>
          {sides ? <SidesDonut sides={sides} winratePercent={kpis.winrate.value} /> : <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>Carregando…</div>}
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
