import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { DashboardSummary, SyncStatus } from '@callout/shared';
import { apiFetch, ApiError } from '../lib/api';

const POS = '#18AAB7';
const DIM = 'rgba(255,255,255,.15)';

const cardStyle: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface)' };

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

export function Dashboard() {
  const navigate = useNavigate();
  const { sync } = useOutletContext<{ sync: SyncStatus | null }>();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wasSyncing = useRef(false);

  const load = useCallback(async () => {
    try {
      const summary = await apiFetch<DashboardSummary>('/dashboard');
      setData(summary);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (sync?.state === 'syncing') {
      wasSyncing.current = true;
    } else if (wasSyncing.current && sync?.state === 'idle') {
      wasSyncing.current = false;
      load();
    }
  }, [sync, load]);

  if (loading) {
    return <div style={{ padding: 28, color: 'var(--text-muted)' }}>Carregando…</div>;
  }

  if (error && !data) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button
            className="btn-secondary"
            onClick={() => {
              setLoading(true);
              load();
            }}
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.recentMatches.length === 0) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nenhuma partida sincronizada ainda. Clica em "Sincronizar" lá em cima pra buscar suas últimas partidas.
        </div>
      </div>
    );
  }

  const { kpis, mapWinrates, agentWinrates, recentMatches, rank, last14Results } = data;

  const statRows = [
    { label: 'KDA', value: fmtNum(kpis.kda.value, 2), deltaText: `${fmtDelta(kpis.kda.delta, 2)} vs. 30d`, positive: kpis.kda.delta > 0 },
    { label: 'ACS', value: String(kpis.acs.value), deltaText: fmtDelta(kpis.acs.delta, 0), positive: kpis.acs.delta > 0 },
    { label: 'ADR', value: String(kpis.adr.value), deltaText: fmtDelta(kpis.adr.delta, 0), positive: kpis.adr.delta > 0 },
    { label: 'HS%', value: `${fmtNum(kpis.hsPercent.value, 1)}%`, deltaText: fmtDelta(kpis.hsPercent.delta, 1), positive: kpis.hsPercent.delta > 0 },
    { label: 'WINRATE', value: `${kpis.winrate.value}%`, deltaText: `${kpis.winrate.wins}V · ${kpis.winrate.losses}D`, positive: false },
  ];

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28 }}>
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>RANK ATUAL</div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em' }}>
              {rank.current}
            </div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              {rank.rr} RR
              {rank.rrDelta7d !== 0 && (
                <>
                  {' · '}
                  <span style={{ color: 'var(--positive)' }}>{fmtDelta(rank.rrDelta7d, 0)}</span> nos últimos 7 dias
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 22, alignItems: 'flex-end', height: 52 }}>
            {last14Results.map((r, i) => (
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
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>ÚLTIMAS {last14Results.length} PARTIDAS</div>
        </div>

        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
          {statRows.map((s) => (
            <div key={s.label} style={{ padding: 22, borderRight: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>{s.label}</div>
              <div>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 38, lineHeight: 1, letterSpacing: '-.02em', marginTop: 26 }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, marginTop: 8, color: s.positive ? 'var(--positive)' : 'var(--text-muted-2)' }}>
                  {s.deltaText}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 28 }}>
        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 16 }}>POR MAPA</div>
          {mapWinrates.map((m) => (
            <div key={m.map} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 46px', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ fontSize: 13 }}>{m.map}</div>
              <div style={{ height: 6, background: 'var(--track)' }}>
                <div style={{ height: 6, width: `${m.winratePercent}%`, background: m.winratePercent >= 55 ? POS : 'var(--bar-dim-strong)' }} />
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{m.winratePercent}%</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 16 }}>POR AGENTE</div>
          {agentWinrates.map((a) => (
            <div key={a.agent} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 46px', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: a.color, opacity: 0.85 }} />
                {a.agent}
              </div>
              <div style={{ height: 6, background: 'var(--track)' }}>
                <div style={{ height: 6, width: `${a.winratePercent}%`, background: a.color }} />
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{a.winratePercent}%</div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 22px 12px' }}>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>PARTIDAS RECENTES</div>
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
              <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, color: m.result === 'V' ? 'var(--positive)' : 'var(--text-faint)' }}>{m.result}</div>
              <div>{m.map}</div>
              <div style={{ color: 'var(--text-muted)' }}>{m.agent}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', color: 'var(--text-muted)' }}>{m.score}</div>
              <div style={{ fontFamily: 'Inter,sans-serif' }}>{m.kda}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-faint)', textAlign: 'right' }}>{m.playedAtLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--action-tint-border)', background: 'var(--action-tint-bg)', padding: '14px 18px' }}>
          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.12em', color: 'var(--action)', whiteSpace: 'nowrap' }}>API INSTÁVEL</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{error} Os números acima são da última carga que deu certo.</span>
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
            onClick={load}
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
