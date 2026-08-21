import { useMemo, useState } from 'react';
import { spotFilters, spots } from '../data/mock';

export function Spots() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(spotFilters[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spots.filter((s) => {
      const matchesFilter =
        activeFilter === 'Todos' ? true : activeFilter === 'Ataque' ? s.side === 'ATK' : s.map === activeFilter || s.agent === activeFilter;
      const matchesQuery =
        q === '' ||
        [s.map, s.agent, s.ability, s.from, s.to].some((field) => field.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [query, activeFilter]);

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 40, letterSpacing: '-.03em', margin: 0 }}>Spots</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted-2)', paddingBottom: 6 }}>{spots.length} lineups salvos pelo time</div>
        <input
          className="input-field"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por mapa, agente ou callout…"
          style={{ marginLeft: 'auto', width: 340, padding: '11px 14px', fontSize: 14 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {spotFilters.map((f) => {
          const active = f === activeFilter;
          return (
            <button
              key={f}
              className="filter-chip"
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '7px 13px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${active ? 'rgba(239,73,88,.6)' : 'var(--border-control)'}`,
                background: active ? 'var(--action-tint-chip-active)' : 'transparent',
                color: active ? 'var(--action)' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {filtered.map((s, i) => (
          <div key={i} className="spot-card" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div
              style={{
                height: 150,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.045) 0 8px, transparent 8px 16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.1em', color: 'var(--text-faint)' }}>PRINT DA MIRA</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: s.color }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {s.agent} · {s.ability}
                </span>
              </div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                {s.from} <span style={{ color: 'var(--action)' }}>→</span> {s.to}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-faint)' }}>
                <span>{s.map}</span>
                <span>·</span>
                <span>{s.side}</span>
                <span>·</span>
                <span>{s.author}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
