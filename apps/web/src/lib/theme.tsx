import { createContext, useContext, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { THEME_MODES, THEME_PALETTE, type ThemePreferences } from '@callout/shared';
import { useSession } from './session';
import { apiFetch } from './api';

// Rotas públicas (fora do AppShell, ver App.tsx) -- o fundo de mapa é só
// pro site logado, nunca aqui, mesmo que a pessoa já tenha sessão válida
// (ex.: voltou pro /login com o cookie ainda ativo).
const ROTAS_SEM_FUNDO_DE_MAPA = ['/login', '/cadastro', '/esqueci-senha', '/termos', '/privacidade'];

export { THEME_MODES, THEME_PALETTE };

const DEFAULT_THEME: ThemePreferences = {
  accentColor: '#EF4958',
  negativeColor: '#EF4958',
  glow: 70,
  mode: 'dark',
  mapBackground: null,
  glassCards: false,
};

// Véu por cima da arte do mapa -- escuro no tema escuro, esbranquiçado no
// tema claro (senão o preto do véu destoava total dos cards/fundo claros).
// Opacidade fixa de propósito (não é preferência da pessoa, ver
// ThemePreferences.mapBackground): forte o bastante pra texto solto (fora
// de card) continuar legível em cima de qualquer arte, mas ainda dá pra
// reconhecer o mapa escolhido.
const MAP_BACKGROUND_OVERLAY_BY_MODE: Record<ThemePreferences['mode'], string> = {
  dark: 'rgba(15, 15, 16, 0.84)',
  light: 'rgba(255, 255, 255, 0.6)',
};

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Preto ou branco, o que der mais contraste em cima da cor de destaque —
// luminância relativa (WCAG). Cobre os presets escuros da paleta (roxo e
// azul-marinho, ex.: #421662/#192573) sem precisar fixar em hex específico:
// qualquer cor escura que entrar na paleta no futuro já cai certo sozinha.
function contrastTextColor(hex: string): string {
  const [r, g, b] = hexRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite > contrastWithBlack ? '#ffffff' : '#141415';
}

interface ThemeContextValue {
  theme: ThemePreferences;
  setTheme: (next: ThemePreferences) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, refresh } = useSession();
  const theme = user?.theme ?? DEFAULT_THEME;
  const location = useLocation();
  const paginaPublica = ROTAS_SEM_FUNDO_DE_MAPA.some((rota) => location.pathname.startsWith(rota));

  // Cor de tema é personalização de quem já está logada -- login/cadastro
  // (e as outras rotas públicas da lista acima) sempre usam a cor padrão,
  // mesmo que a sessão ainda esteja válida em segundo plano (ex.: voltou
  // pro /login manualmente sem deslogar) ou logo depois de mudar a cor e
  // navegar pra lá. Pedido de 21/09/2026.
  const themeParaCores = paginaPublica ? DEFAULT_THEME : theme;

  const cssVars = useMemo<CSSProperties>(() => {
    const theme = themeParaCores;
    const glow = theme.glow / 100;
    const vars: Record<string, string> = {
      '--acc': theme.accentColor,
      '--acc-text': contrastTextColor(theme.accentColor),
      '--accSoft': rgba(theme.accentColor, 0.75),
      '--acc10': rgba(theme.accentColor, 0.1 * glow + 0.03),
      '--acc18': rgba(theme.accentColor, 0.26 * glow),
      '--acc22': rgba(theme.accentColor, 0.3 * glow),
      '--acc25': rgba(theme.accentColor, 0.3),
      // "positivo" (vitória, deltas positivos) segue a cor principal —
      // não é mais uma cor separada, ver ThemePreferences.
      '--pos': theme.accentColor,
      '--pos08': rgba(theme.accentColor, 0.08),
      '--neg': theme.negativeColor,
      '--kpi-bg': `radial-gradient(120% 130% at 100% 0%, ${rgba(theme.accentColor, 0.26 * glow)} 0%, var(--surface) 62%)`,
      '--kpi-border': rgba(theme.accentColor, 0.22),
    };
    return vars as CSSProperties;
  }, [themeParaCores]);

  // Atributo em <html> (não só nesse wrapper) — a paleta clara/escura mora
  // em regras `:root[data-theme=...]` no CSS global, então precisa estar no
  // elemento raiz de verdade pra `html,body{background:var(--bg)}` também
  // pegar a cor certa, não só o conteúdo dentro do provider.
  useEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
  }, [theme.mode]);

  async function setTheme(next: ThemePreferences) {
    await apiFetch('/me/theme', { method: 'PATCH', body: JSON.stringify(next) });
    await refresh();
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div style={cssVars}>
        {/* Fundo de mapa -- fixed + z-index baixo (ver .app-shell-grid no
            index.css, que sobe pra z-index:1) pra ficar atrás de todo o
            conteúdo em qualquer tela, sem empurrar layout (position:fixed
            não ocupa espaço no fluxo). Gradiente com a mesma cor duas vezes
            é só um jeito de sobrepor uma cor sólida translúcida em cima de
            uma background-image só (não dá pra empilhar background-color +
            background-image direto). */}
        {theme.mapBackground && !paginaPublica && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundImage: `linear-gradient(${MAP_BACKGROUND_OVERLAY_BY_MODE[theme.mode]}, ${MAP_BACKGROUND_OVERLAY_BY_MODE[theme.mode]}), url(/img/maps/${theme.mapBackground}.png)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de um ThemeProvider');
  return ctx;
}
