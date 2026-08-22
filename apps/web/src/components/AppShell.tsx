import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { SyncStatus } from '@callout/shared';
import { useSession } from '../lib/session';
import { useAppData, type AppData } from '../lib/appData';
import { ThemeSettings } from './ThemeSettings';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', match: (p: string) => p === '/' },
  { to: '/time', label: 'Time', match: (p: string) => p === '/time' },
  { to: '/board', label: 'Board', match: (p: string) => p.startsWith('/board') },
  { to: '/spots', label: 'Spots', match: (p: string) => p === '/spots' },
];

export type OutletContext = AppData;

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function SyncChip({ sync }: { sync: SyncStatus | null }) {
  if (!sync) return null;

  if (sync.state === 'failed') {
    return (
      <div
        title={sync.reason}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 13px',
          border: '1px solid var(--acc25, rgba(239,73,88,.25))',
          background: 'var(--acc10, rgba(239,73,88,.1))',
          borderRadius: 'var(--radius-pill)',
          fontSize: 12,
          color: 'var(--acc, #EF4958)',
          maxWidth: 320,
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>Sync falhou</span>
        {sync.reason && <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {sync.reason}</span>}
      </div>
    );
  }

  if (sync.state !== 'syncing') return null;
  const progress = sync.progress;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 13px',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          border: '1.5px solid var(--acc, #EF4958)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'block',
          animation: 'spin 900ms linear infinite',
        }}
      />
      sincronizando{progress ? ` · ${progress.done} de ${progress.total}` : '…'}
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const appData = useAppData(user);
  const { sync, startSync, team, dashboard } = appData;
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.riotId) return <Navigate to="/login/vincular" replace />;

  const latestMatchId = dashboard?.recentMatches[0]?.id;
  const navItems = [
    BASE_NAV_ITEMS[0]!,
    { to: latestMatchId ? `/partida/${latestMatchId}` : '/', label: 'Partidas', match: (p: string) => p.startsWith('/partida') },
    ...BASE_NAV_ITEMS.slice(1),
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid #202023',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -140,
            left: -90,
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--acc18, rgba(239,73,88,.18)) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', padding: '24px 22px 16px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>
            callout<span style={{ color: 'var(--acc, #EF4958)' }}>.</span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)', marginTop: 3 }}>
            {team ? `${team.name.toUpperCase()} · ${team.memberCount} MEMBRO${team.memberCount === 1 ? '' : 'S'}` : '…'}
          </div>
        </div>

        <nav style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: 4 }}>
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className="nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '11px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  background: active ? 'var(--acc18, rgba(239,73,88,.16))' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `1.5px solid ${active ? 'var(--acc, #EF4958)' : 'var(--text-faint)'}`,
                    display: 'block',
                    flex: 'none',
                  }}
                />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ position: 'relative', marginTop: 'auto', padding: 14 }}>
          <div
            style={{
              borderRadius: 14,
              padding: 18,
              background: 'linear-gradient(160deg, var(--acc22, rgba(239,73,88,.22)) 0%, rgba(21,21,23,.4) 70%)',
              border: '1px solid var(--acc25, rgba(239,73,88,.25))',
            }}
          >
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Já revisou a semana?</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 6 }}>
              Dá uma olhada nas estratégias salvas do time antes do próximo jogo.
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 14, padding: 9, fontSize: 13, justifyContent: 'center' }}
              onClick={() => navigate('/board')}
            >
              Abrir board
            </button>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {settingsOpen && <ThemeSettings onClose={() => setSettingsOpen(false)} />}
          <div
            style={{
              padding: '14px 18px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              borderTop: '1px solid #202023',
              cursor: 'pointer',
            }}
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {user.discordAvatarUrl ? (
              <img src={user.discordAvatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: 10 }} />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--avatar-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                {initialsOf(user.discordUsername)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {user.riotId.name}#{user.riotId.tag}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{user.discordUsername}</div>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>›</span>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 26px', borderBottom: '1px solid var(--divider)' }}>
          <div
            style={{
              flex: 1,
              maxWidth: 520,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--control-bg)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #5A5D61', display: 'block' }} />
            <input
              placeholder="Buscar partida, mapa, agente ou estratégia…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13 }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <SyncChip sync={sync} />
            <button className="btn-icon" title="Sincronizar" onClick={startSync} disabled={sync?.state === 'syncing'}>
              ◔
            </button>
          </div>
        </header>

        <Outlet context={appData satisfies OutletContext} />
      </main>
    </div>
  );
}
