import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MapSchematic, BIND_RECTS } from './MapSchematic';
import { currentUser, team, recentMatches, strategies } from '../data/mock';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', match: (p: string) => p === '/' },
  { to: `/partida/${recentMatches[0].id}`, label: 'Partidas', match: (p: string) => p.startsWith('/partida') },
  { to: '/time', label: 'Time', match: (p: string) => p === '/time' },
  { to: `/board/${strategies[0].id}`, label: 'Board', match: (p: string) => p.startsWith('/board') },
  { to: '/spots', label: 'Spots', match: (p: string) => p === '/spots' },
];

function crumbFor(pathname: string) {
  if (pathname === '/') return 'THIAGO#BR1 / VISÃO GERAL';
  if (pathname.startsWith('/partida')) return 'PARTIDAS / BIND · ONTEM 23:14';
  if (pathname === '/time') return 'OS BOYS / MEMBROS';
  if (pathname.startsWith('/board')) return 'BOARD / BIND — RUSH B COM MOLLY DUPLA';
  if (pathname === '/spots') return 'SPOTS / BIBLIOTECA DE LINEUPS';
  return '';
}

function SyncChip({ syncing }: { syncing: boolean }) {
  if (!syncing) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          border: '1.5px solid var(--action)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'block',
          animation: 'spin 900ms linear infinite',
        }}
      />
      buscando partidas · 14 de 30
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!syncing) return;
    const t = setTimeout(() => setSyncing(false), 2400);
    return () => clearTimeout(t);
  }, [syncing]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '224px 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          borderRight: '1px solid var(--divider)',
          background: 'var(--surface-sunken)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '22px 20px 18px',
            borderBottom: '1px solid var(--divider)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>
            callout
          </div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)', marginTop: 2 }}>
            {team.name.toUpperCase()} · {team.memberCount} MEMBROS
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', padding: '12px 10px', gap: 2, position: 'relative', zIndex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = item.match(location.pathname);
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className="nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  background: active ? 'var(--nav-active)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 'var(--radius-xs)',
                    background: active ? 'var(--action)' : 'rgba(255,255,255,.18)',
                  }}
                />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--divider)', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--avatar-bg)', border: '1px solid rgba(255,255,255,.1)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{currentUser.handle}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-dim)' }}>{currentUser.rank}</div>
            </div>
          </div>
        </div>

        <MapSchematic
          rects={BIND_RECTS.slice(0, 7)}
          stroke="#FCFCFC"
          strokeWidth={3}
          style={{
            position: 'absolute',
            bottom: -40,
            left: -90,
            width: 340,
            opacity: 0.055,
            pointerEvents: 'none',
          }}
        />
      </aside>

      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 28px',
            height: 60,
            borderBottom: '1px solid var(--divider)',
            background: 'var(--bg)',
          }}
        >
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)' }}>
            {crumbFor(location.pathname)}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <SyncChip syncing={syncing} />
            <button className="btn-secondary" onClick={() => setSyncing(true)} disabled={syncing}>
              Sincronizar
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
