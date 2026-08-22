import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { HeatmapResult } from '@callout/shared';
import { apiFetch } from '../lib/api';
import type { OutletContext } from '../components/AppShell';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

export function Heatmap() {
  const { dashboard, dashboardLoading } = useOutletContext<OutletContext>();
  const maps = dashboard?.mapWinrates.map((m) => m.map) ?? [];

  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [kind, setKind] = useState<'kills' | 'deaths'>('kills');
  const [data, setData] = useState<HeatmapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMap && maps.length > 0) setSelectedMap(maps[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps.length]);

  useEffect(() => {
    if (!selectedMap) return;
    setLoading(true);
    setError(null);
    apiFetch<HeatmapResult>(`/heatmap?map=${encodeURIComponent(selectedMap)}&kind=${kind}`)
      .then(setData)
      .catch(() => setError('Não foi possível carregar o heatmap.'))
      .finally(() => setLoading(false));
  }, [selectedMap, kind]);

  if (dashboardLoading && maps.length === 0) {
    return <div style={{ padding: 26, color: 'var(--text-muted)' }}>Carregando…</div>;
  }

  if (maps.length === 0) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Sincronize suas partidas pra ver o heatmap.
        </div>
      </div>
    );
  }

  const dotColor = kind === 'kills' ? 'var(--pos, #18AAB7)' : 'var(--acc, #EF4958)';

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Heatmap</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            {loading ? 'Carregando…' : `${data?.points.length ?? 0} ${kind === 'kills' ? 'abates' : 'mortes'} em ${selectedMap}`}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['kills', 'deaths'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${kind === k ? 'var(--acc25, rgba(239,73,88,.25))' : 'var(--surface-border)'}`,
                background: kind === k ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                color: kind === k ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              {k === 'kills' ? 'Abates' : 'Mortes'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {maps.map((m) => {
          const active = m === selectedMap;
          return (
            <button
              key={m}
              className="filter-chip"
              onClick={() => setSelectedMap(m)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${active ? 'var(--acc25, rgba(239,73,88,.25))' : 'var(--surface-border)'}`,
                background: active ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                color: active ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ ...cardStyle, padding: 22, color: 'var(--text-3)', fontSize: 14 }}>{error}</div>
      )}

      <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', maxWidth: 760, aspectRatio: '1 / 1' }}>
        {data?.mapDisplayIcon ? (
          <>
            <img src={data.mapDisplayIcon} alt={data.mapName} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            {data.points.map((p, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 7px ${dotColor}`,
                  opacity: 0.8,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {loading ? 'Carregando…' : 'Sem dado de minimapa pra esse mapa ainda.'}
          </div>
        )}
      </div>
    </div>
  );
}
