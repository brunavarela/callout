import { useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Swords, Users, PenTool, MapPin, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '../lib/session';
import { useAppData, type AppData } from '../lib/appData';
import { ThemeSettings } from './ThemeSettings';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { to: '/time', label: 'Time', icon: Users, match: (p: string) => p.startsWith('/time') },
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

const SIDEBAR_COLLAPSED_KEY = 'callout:sidebar-collapsed';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const appData = useAppData(user);
  const { team } = appData;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // sem localStorage (modo privado etc.) — só não persiste, sidebar continua funcionando
      }
      return next;
    });
  }

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.riotId) return <Navigate to="/login/vincular" replace />;

  const navItems = [
    BASE_NAV_ITEMS[0]!,
    { to: '/partidas', label: 'Partidas', icon: Swords, match: (p: string) => p.startsWith('/partida') },
    ...BASE_NAV_ITEMS.slice(1),
  ];

  return (
    <div className="app-shell-grid" style={{ '--sidebar-w': collapsed ? '76px' : '232px' } as React.CSSProperties}>
      <aside className={`app-sidebar${collapsed ? ' app-sidebar-collapsed' : ''}`}>
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
        <div className="app-sidebar-header" style={{ position: 'relative', padding: '24px 16px 16px' }}>
          <div className="sidebar-fade sidebar-fade--col" style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
              callout<span style={{ color: 'var(--acc, #EF4958)' }}>.</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)', marginTop: 3, whiteSpace: 'nowrap' }}>
              {team ? `${team.name.toUpperCase()} · ${team.memberCount} MEMBRO${team.memberCount === 1 ? '' : 'S'}` : '…'}
            </div>
          </div>
          {/* Mesma marca do favicon.svg, sem o retângulo de fundo preto — só
              aparece com a sidebar recolhida (fade cruzado via CSS). */}
          <div className="sidebar-brand-mark">
            <svg width="44" height="15.3" viewBox="0 0 207 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M174.982 0V71.04H156.166V0H174.982Z" fill="currentColor" />
              <path d="M145.451 0V71.04H126.635V0H145.451Z" fill="currentColor" />
              <path
                d="M58.3125 44.064C58.3125 38.496 59.3045 33.632 61.2885 29.472C63.3365 25.312 66.0885 22.112 69.5445 19.872C73.0645 17.632 76.9685 16.512 81.2565 16.512C84.9685 16.512 88.1685 17.248 90.8565 18.72C93.5445 20.192 95.6245 22.176 97.0965 24.672V17.184H115.912V71.04H97.0965V63.552C95.6245 66.048 93.5125 68.032 90.7605 69.504C88.0725 70.976 84.9045 71.712 81.2565 71.712C76.9685 71.712 73.0645 70.592 69.5445 68.352C66.0885 66.112 63.3365 62.912 61.2885 58.752C59.3045 54.528 58.3125 49.632 58.3125 44.064ZM97.0965 44.064C97.0965 40.608 96.1365 37.888 94.2165 35.904C92.3605 33.92 90.0565 32.928 87.3045 32.928C84.4885 32.928 82.1525 33.92 80.2965 35.904C78.4405 37.824 77.5125 40.544 77.5125 44.064C77.5125 47.52 78.4405 50.272 80.2965 52.32C82.1525 54.304 84.4885 55.296 87.3045 55.296C90.0565 55.296 92.3605 54.304 94.2165 52.32C96.1365 50.336 97.0965 47.584 97.0965 44.064Z"
                fill="currentColor"
              />
              <path
                d="M0 44.064C0 38.496 1.152 33.632 3.456 29.472C5.76 25.312 8.96 22.112 13.056 19.872C17.216 17.632 21.952 16.512 27.264 16.512C34.112 16.512 39.872 18.4 44.544 22.176C49.216 25.888 52.224 31.104 53.568 37.824H33.6C32.448 34.304 30.208 32.544 26.88 32.544C24.512 32.544 22.624 33.536 21.216 35.52C19.872 37.44 19.2 40.288 19.2 44.064C19.2 47.84 19.872 50.72 21.216 52.704C22.624 54.688 24.512 55.68 26.88 55.68C30.272 55.68 32.512 53.92 33.6 50.4H53.568C52.224 57.056 49.216 62.272 44.544 66.048C39.872 69.824 34.112 71.712 27.264 71.712C21.952 71.712 17.216 70.592 13.056 68.352C8.96 66.112 5.76 62.912 3.456 58.752C1.152 54.592 0 49.696 0 44.064Z"
                fill="currentColor"
              />
              <path
                d="M195.192 71.8081C191.864 71.8081 189.176 70.9121 187.128 69.1201C185.144 67.2641 184.152 64.9281 184.152 62.1121C184.152 59.2961 185.144 56.9601 187.128 55.1041C189.176 53.2481 191.864 52.3201 195.192 52.3201C198.456 52.3201 201.08 53.2481 203.064 55.1041C205.112 56.9601 206.136 59.2961 206.136 62.1121C206.136 64.8641 205.112 67.1681 203.064 69.0241C201.08 70.8801 198.456 71.8081 195.192 71.8081Z"
                fill="var(--acc, #EF4958)"
              />
            </svg>
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
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 11,
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
                <span className="sidebar-fade sidebar-fade--col" style={{ minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar-promo sidebar-fade sidebar-fade--row" style={{ position: 'relative', marginTop: 'auto' }}>
          <div style={{ padding: 14 }}>
            <div
              style={{
                borderRadius: 14,
                padding: 18,
                background: 'linear-gradient(160deg, var(--acc22, rgba(239,73,88,.22)) 0%, rgba(21,21,23,.4) 70%)',
                border: '1px solid var(--acc25, rgba(239,73,88,.25))',
              }}
            >
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>
                Já revisou o painel
                <br />
                do time?
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 6 }}>
                Dá uma olhada nas estatísticas da equipe e o impacto que você causa.
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 14, padding: 9, fontSize: 13, justifyContent: 'center' }}
                onClick={() => navigate('/time/painel')}
              >
                Painel do time
              </button>
            </div>
          </div>
        </div>
      </aside>

      <button
        className="sidebar-edge-toggle"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        style={{ left: 'var(--sidebar-w)' }}
      >
        {collapsed ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronLeft size={13} strokeWidth={2} />}
      </button>

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
