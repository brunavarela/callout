import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import { THEME_PALETTE, type ThemePreferences } from '@callout/shared';
import { useSession } from './session';
import { apiFetch } from './api';

export { THEME_PALETTE };

const DEFAULT_THEME: ThemePreferences = {
  accentColor: '#EF4958',
  negativeColor: '#EF4958',
  glow: 70,
  tintedCards: true,
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

  const cssVars = useMemo<CSSProperties>(() => {
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
      '--kpi-bg': theme.tintedCards
        ? `radial-gradient(120% 130% at 100% 0%, ${rgba(theme.accentColor, 0.26 * glow)} 0%, var(--surface) 62%)`
        : 'var(--surface)',
      '--kpi-border': theme.tintedCards ? rgba(theme.accentColor, 0.22) : 'var(--surface-border)',
    };
    return vars as CSSProperties;
  }, [theme]);

  async function setTheme(next: ThemePreferences) {
    await apiFetch('/me/theme', { method: 'PATCH', body: JSON.stringify(next) });
    await refresh();
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div style={cssVars}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de um ThemeProvider');
  return ctx;
}
