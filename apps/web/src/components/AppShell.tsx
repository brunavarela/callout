import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Swords, Users, PenTool, MapPin, Trophy } from 'lucide-react';
import { useSession } from '../lib/session';
import { useAppData, type AppData } from '../lib/appData';
import { useTheme } from '../lib/theme';
import { routeForStep } from '../lib/onboarding';
import { AccountMenu } from './AccountMenu';
import { Logo } from './Logo';
import { CardStyleProvider, glassSurfaceStyle } from './statsPrimitives';
import { EntradaOverlay } from './EntradaOverlay';
import { lerEntrando, limparEntrando } from '../lib/entrada';
import { Footer } from './Footer';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { to: '/equipe', label: 'Equipe', icon: Users, match: (p: string) => p.startsWith('/equipe') },
  { to: '/board', label: 'Estratégia', icon: PenTool, match: (p: string) => p.startsWith('/board') },
  { to: '/spots', label: 'Spots', icon: MapPin, match: (p: string) => p === '/spots' },
  { to: '/competicoes', label: 'Competições', icon: Trophy, match: (p: string) => p.startsWith('/competicoes') },
];

export type OutletContext = AppData;

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// Elo atual + nível da conta — fica fixo no header global (não só na página
// do painel) porque é "quem você é" agora, não um dado específico do ato
// selecionado. Vem de seasonOverview (mesma chamada de MMR que já
// alimentava o painel antigo, só que now compartilhada pelo header).
function RankLevelChip({ appData }: { appData: AppData }) {
  const { seasonOverview } = appData;
  if (!seasonOverview) return null;
  const { currentRank, peakRank, accountLevel } = seasonOverview;
  if (!currentRank && accountLevel === null) return null;

  // Ordem invertida em 21/09/2026 (pedido explícito): level primeiro,
  // depois elo -- antes era elo então level.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
      {accountLevel !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--text-dim)' }}>LEVEL</span>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{accountLevel}</span>
        </div>
      )}
      {currentRank && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: accountLevel !== null ? 10 : 0,
            borderLeft: accountLevel !== null ? '1px solid var(--divider)' : 'none',
          }}
        >
          {currentRank.iconUrl ? (
            <img src={currentRank.iconUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flex: 'none' }} />
          ) : (
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--avatar-bg)', flex: 'none' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
              {currentRank.tierLabel} · {currentRank.rr} RR
            </span>
            {peakRank && (
              <span className="rank-peak" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                Máx: {peakRank.tierLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const { user, loading } = useSession();
  const { theme } = useTheme();
  const appData = useAppData(user);
  const { equipe, equipeError, equipeNaoTemNenhuma, seasonOverviewLoading, selectedMemberId, setSelectedMemberId } = appData;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  // Painel do menu de conta agora vai por portal direto no <body> (ver
  // accountTrigger/createPortal abaixo) -- precisa de um segundo ref só pra
  // ele, pro clique-fora não fechar o menu ao clicar dentro do próprio
  // painel (que não é mais descendente de accountMenuRef no DOM).
  const accountPanelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);

  // Modo "espiar" (busca livre de RiotID / ver painel de outro membro) só
  // faz sentido dentro do painel individual (Painel/Partidas) -- decisão de
  // produto de 21/09/2026. Trocar pra qualquer outra aba (Equipe,
  // Estratégia, Spots, Competições) volta sozinho pro próprio RiotID, pra
  // não carregar o alvo espiado escondido pra uma tela onde isso não devia
  // aparecer.
  useEffect(() => {
    if (!selectedMemberId) return;
    const stayOnTarget = location.pathname === '/' || location.pathname === '/partidas';
    if (!stayOnTarget) setSelectedMemberId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Tela de "estamos preparando tudo" logo depois de cadastro/criar-equipe/
  // entrar-em-equipe (ver lib/entrada.ts) -- some assim que os dados
  // relevantes pra primeira tela terminarem de carregar de verdade, não num
  // tempo fixo: Visão do ato (pra quem cai na dashboard) E equipe (pra quem
  // acabou de criar/entrar numa e cai direto em /equipe). Lazy init lê o
  // sessionStorage só uma vez, no mount.
  const equipePronta = equipe !== null || equipeNaoTemNenhuma || equipeError !== null;
  const [entrandoMsg, setEntrandoMsg] = useState<string | null>(() => lerEntrando());
  useEffect(() => {
    if (entrandoMsg && !seasonOverviewLoading && equipePronta) {
      limparEntrando();
      setEntrandoMsg(null);
    }
  }, [entrandoMsg, seasonOverviewLoading, equipePronta]);

  useEffect(() => {
    if (!settingsOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (accountMenuRef.current?.contains(target)) return;
      if (accountPanelRef.current?.contains(target)) return;
      setSettingsOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [settingsOpen]);

  // Abre o menu já com a posição calculada a partir do botão de verdade --
  // precisa disso pro portal (renderiza fora da árvore do header, ver
  // accountTrigger) saber onde flutuar.
  function toggleSettings() {
    setSettingsOpen((prev) => {
      const next = !prev;
      if (next && accountMenuRef.current) {
        const rect = accountMenuRef.current.getBoundingClientRect();
        setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
      return next;
    });
  }

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.proximoPasso !== 'completo' || !user.riotId) return <Navigate to={routeForStep(user.proximoPasso)} replace />;
  if (entrandoMsg) return <EntradaOverlay message={entrandoMsg} />;
  const riotId = user.riotId;

  const navItems = [
    BASE_NAV_ITEMS[0]!,
    { to: '/partidas', label: 'Partidas', icon: Swords, match: (p: string) => p.startsWith('/partida') },
    ...BASE_NAV_ITEMS.slice(1),
  ];

  // Botão de perfil — o painel (AccountMenu) vai por portal direto no
  // <body> (ver createPortal abaixo), não mais aninhado dentro do header.
  // Isso saiu de vez de um bug achado em 21/09/2026: o painel, aninhado no
  // novo header horizontal, aparecia com conteúdo da própria página
  // (PageHeaderCard) visível "por cima"/misturado com os itens do menu --
  // com o header virando ele próprio um elemento posicionado
  // (position:relative + z-index, ver .app-topbar no CSS) achei que
  // resolveria, mas não resolveu de vez; portal elimina o problema na
  // raiz, sem depender de entender a causa exata de stacking/overflow.
  const accountTrigger = (
    <div ref={accountMenuRef}>
      <button
        className="header-profile-trigger"
        onClick={toggleSettings}
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
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: 9, flex: 'none', objectFit: 'cover' }} />
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
            {initialsOf(user.nome)}
          </div>
        )}
        <div className="header-profile-text" style={{ minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>
            {riotId.name}#{riotId.tag}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{user.nome}</div>
        </div>
        <span className="header-profile-text" style={{ color: 'var(--text-faint)' }}>
          ›
        </span>
      </button>
      {settingsOpen &&
        panelPos &&
        createPortal(
          <div ref={accountPanelRef} className="header-profile-panel" style={{ top: panelPos.top, right: panelPos.right }}>
            <AccountMenu className="" onClose={() => setSettingsOpen(false)} />
          </div>,
          document.body,
        )}
    </div>
  );

  return (
    <div className="app-shell-flat">
      <header className="app-topbar" style={theme.glassCards ? glassSurfaceStyle : undefined}>
        {/* Esquerda: só a logo agora -- busca de jogador (21/09/2026) saiu
            pro headerpage do Painel/Partidas (RiotIdSearchFilter), e nome
            da equipe/contagem de membro virou uma "flag" (foto da equipe)
            direto no item "Equipe" da nav (ver abaixo), então esse bloco
            não precisa mais de nada além da logo. */}
        <div className="app-topbar-left">
          <Logo height={26} />
        </div>

        {/* Nav horizontal -- centralizada no eixo X do header inteiro
            (position:absolute + translateX, ver .app-topbar-nav no CSS),
            não só "no meio do espaço sobrando" -- por isso sai do fluxo
            normal em vez de ficar entre os outros dois blocos. Era a lista
            vertical da sidebar (sidebar saiu de vez, pedido de 21/09/2026);
            .nav-item continua o mesmo, só muda a orientação de quem
            envolve. Some em mobile, vira .app-bottom-nav fixo embaixo. */}
        <nav className="app-topbar-nav">
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;
            const isEquipeItem = item.to === '/equipe';
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className="nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap',
                  background: active ? 'var(--acc18, rgba(239,73,88,.16))' : undefined,
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.25 : 1.75} color={active ? 'var(--acc, #EF4958)' : 'var(--text-faint)'} style={{ flex: 'none' }} />
                {isEquipeItem ? (
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    {item.label}
                    {/* "Flag" de que já tem equipe -- foto dela (ou
                        iniciais, sem foto), flutuando na diagonal superior
                        direita da última letra em vez de solta do lado
                        (pedido de 21/09/2026, ajuste em seguida). */}
                    {equipe && (
                      <span
                        title={`${equipe.name} · ${equipe.memberCount} membro${equipe.memberCount === 1 ? '' : 's'}`}
                        style={{
                          position: 'absolute',
                          top: -13,
                          right: -17,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          flex: 'none',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--avatar-bg)',
                          border: '1.5px solid var(--surface)',
                          fontSize: 9,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {equipe.imagemUrl ? (
                          <img src={equipe.imagemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          initialsOf(equipe.name)
                        )}
                      </span>
                    )}
                  </span>
                ) : (
                  item.label
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Direita: level, elo, conta. */}
        <div className="app-topbar-actions">
          <RankLevelChip appData={appData} />
          {accountTrigger}
        </div>
      </header>

      {/* overflowX travado: sem isso, qualquer elemento um pouco mais largo
          que a tela (ex.: um label sem quebra de linha num grid apertado)
          arrasta a página inteira de lado em vez de só o card culpado --
          scroll lateral deve ficar contido em quem já opta por ele
          (.scroll-x-mobile), nunca no painel inteiro. */}
      <main className="app-main" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        <CardStyleProvider glass={theme.glassCards}>
          <Outlet context={appData satisfies OutletContext} />
        </CardStyleProvider>
        <Footer />
      </main>

      {/* Barra de navegação de mobile (<900px) -- só existe no CSS pra essa
          faixa de tela, mesmos navItems do header de desktop. */}
      <nav className="app-bottom-nav">
        {navItems.map((item) => {
          const active = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <NavLink key={item.label} to={item.to} className="nav-item" style={{ color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
              <Icon size={18} strokeWidth={active ? 2.25 : 1.75} color={active ? 'var(--acc, #EF4958)' : 'var(--text-faint)'} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
