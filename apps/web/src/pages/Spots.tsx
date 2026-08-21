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
      const matchesQuery = q === '' || [s.map, s.agent, s.ability, s.from, s.to].some((field) => field.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [query, activeFilter]);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Spots</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{spots.length} lineups salvos pelo time</div>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por mapa, agente ou callout…"
          style={{
            marginLeft: 'auto',
            width: 330,
            padding: '12px 15px',
            background: 'var(--control-bg)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
            fontSize: 13.5,
            outline: 'none',
          }}
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
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${active ? 'var(--acc25, rgba(239,73,88,.25))' : 'var(--surface-border)'}`,
                background: active ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                color: active ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {filtered.map((s, i) => (
          <div
            key={i}
            className="card-hover-acc"
            style={{ borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)', overflow: 'hidden' }}
          >
            <div
              style={{
                height: 146,
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 8px, transparent 8px 16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid var(--surface-border)',
              }}
            >
              <span style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-faint)' }}>PRINT DA MIRA</span>
            </div>
            <div style={{ padding: '15px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: s.color, flex: 'none' }} />
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                  {s.agent} · {s.ability}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
                {s.from} <span style={{ color: 'var(--acc, #EF4958)' }}>→</span> {s.to}
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 11, fontSize: 10.5, color: 'var(--text-faint)' }}>
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
