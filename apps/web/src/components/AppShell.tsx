import { useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Swords, Users, PenTool, MapPin, Trophy } from 'lucide-react';
import { useSession } from '../lib/session';
import { useAppData, type AppData } from '../lib/appData';
import { ThemeSettings } from './ThemeSettings';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { to: '/time', label: 'Time', icon: Users, match: (p: string) => p === '/time' },
  { to: '/board', label: 'Estratégia', icon: PenTool, match: (p: string) => p.startsWith('/board') },
  { to: '/spots', label: 'Spots', icon: MapPin, match: (p: string) => p === '/spots' },
  { to: '/competicoes', label: 'Competições', icon: Trophy, match: (p: string) => p.startsWith('/competicoes') },
];

export type OutletContext = AppData;

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  to: string;
}

interface SearchGroup {
  title: string;
  results: SearchResult[];
}

function SearchBar({ appData }: { appData: AppData }) {
  const navigate = useNavigate();
  const { dashboard, strategies } = appData;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const groups: SearchGroup[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchResult[] = (dashboard?.recentMatches ?? [])
      .filter((m) => m.map.toLowerCase().includes(q) || m.agent.toLowerCase().includes(q))
      .slice(0, 5)
      .map((m) => ({ id: m.id, label: `${m.map} · ${m.agent}`, sub: `${m.result === 'V' ? 'Vitória' : 'Derrota'} · ${m.score}`, to: `/partida/${m.id}` }));

    const strats: SearchResult[] = (strategies ?? [])
      .filter((s) => s.title.toLowerCase().includes(q) || s.mapName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({ id: s.id, label: s.title, sub: s.mapName, to: `/board/${s.id}` }));

    const out: SearchGroup[] = [];
    if (matches.length > 0) out.push({ title: 'Partidas', results: matches });
    if (strats.length > 0) out.push({ title: 'Estratégias', results: strats });
    return out;
  }, [query, dashboard, strategies]);

  function pick(to: string) {
    navigate(to);
    setQuery('');
    setOpen(false);
  }

  const showDropdown = open && query.trim() !== '';

  return (
    <div
      style={{ position: 'relative', flex: 1, maxWidth: 520 }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--control-bg)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #5A5D61', display: 'block', flex: 'none' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar partida, mapa ou estratégia…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13 }}
        />
      </div>
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 28px rgba(0,0,0,.4)',
            padding: 8,
            maxHeight: 360,
            overflow: 'auto',
            zIndex: 40,
          }}
        >
          {groups.length === 0 && <div style={{ padding: '10px 8px', fontSize: 12.5, color: 'var(--text-muted)' }}>Nenhum resultado.</div>}
          {groups.map((group) => (
            <div key={group.title} style={{ marginBottom: 6 }}>
              <div style={{ padding: '6px 8px 2px', fontSize: 10, letterSpacing: '.12em', color: 'var(--text-dim)' }}>{group.title.toUpperCase()}</div>
              {group.results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pick(r.to)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 8px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                  }}
                  className="strat-item"
                >
                  <div style={{ fontSize: 13 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{r.sub}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const appData = useAppData(user);
  const { team } = appData;
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.riotId) return <Navigate to="/login/vincular" replace />;

  const navItems = [
    BASE_NAV_ITEMS[0]!,
    { to: '/partidas', label: 'Partidas', icon: Swords, match: (p: string) => p.startsWith('/partida') },
    ...BASE_NAV_ITEMS.slice(1),
  ];

  return (
    <div className="app-shell-grid">
      <aside className="app-sidebar">
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
        <div className="app-sidebar-header" style={{ position: 'relative', padding: '24px 22px 16px' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>
            callout<span style={{ color: 'var(--acc, #EF4958)' }}>.</span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)', marginTop: 3 }}>
            {team ? `${team.name.toUpperCase()} · ${team.memberCount} MEMBRO${team.memberCount === 1 ? '' : 'S'}` : '…'}
          </div>
        </div>

        <nav className="app-sidebar-nav" style={{ position: 'relative', padding: '10px 12px', gap: 4 }}>
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;
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
                <Icon
                  size={18}
                  strokeWidth={active ? 2.25 : 1.75}
                  color={active ? 'var(--acc, #EF4958)' : 'var(--text-faint)'}
                  style={{ flex: 'none' }}
                />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar-promo" style={{ position: 'relative', marginTop: 'auto', padding: 14 }}>
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
              Abrir estratégia
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main" style={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <header className="app-header" style={{ padding: '16px 26px', borderBottom: '1px solid var(--divider)' }}>
          <SearchBar appData={appData} />
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            {settingsOpen && <ThemeSettings className="header-profile-panel" onClose={() => setSettingsOpen(false)} />}
            <button
              className="header-profile-trigger"
              onClick={() => setSettingsOpen((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px 6px 6px',
                cursor: 'pointer',
              }}
            >
              {user.discordAvatarUrl ? (
                <img src={user.discordAvatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: 9, flex: 'none' }} />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    flex: 'none',
                    borderRadius: 9,
                    background: 'var(--avatar-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                  }}
                >
                  {initialsOf(user.discordUsername)}
                </div>
              )}
              <div className="header-profile-text" style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                  {user.riotId.name}#{user.riotId.tag}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{user.discordUsername}</div>
              </div>
              <span className="header-profile-text" style={{ color: 'var(--text-faint)' }}>
                ›
              </span>
            </button>
          </div>
        </header>

        <Outlet context={appData satisfies OutletContext} />
      </main>
    </div>
  );
}
