import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';
import { useTheme } from '../lib/theme';
import { glassSurfaceStyle } from './statsPrimitives';

// Rodapé enxuto, em linha — aparece no fim de toda página (AppShell.tsx
// pras telas logadas, LoginShell.tsx pras telas de login, LegalPageShell.tsx
// pras próprias Termos/Privacidade/Sobre/Ajuda). Termos/Privacidade ainda
// não passaram por revisão jurídica formal (ver LAUNCH.md §3.4/§12) — os
// links já existem pra não ter que replicar essa mudança depois, mas as
// próprias páginas deixam isso avisado. Sobre/Ajuda entraram aqui em
// 21/09/2026 (pedido explícito de deixar num lugar só, em toda página).
export function Footer() {
  const year = new Date().getFullYear();
  const { theme } = useTheme();
  return (
    <footer style={{ borderTop: '1px solid var(--divider)', marginTop: 'auto', background: 'var(--surface)', ...(theme.glassCards ? glassSurfaceStyle : {}) }}>
      <div style={{ padding: '14px 26px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="footer-disclaimer" style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.6, maxWidth: '70ch' }}>
          Ferramenta independente. Sem vínculo com a Riot Games. Dados de partida vindos de API pública não-oficial.
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-faint)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/sobre" className="link-quiet" style={{ color: 'var(--text)' }}>
              Sobre
            </Link>
            <Link to="/ajuda" className="link-quiet" style={{ color: 'var(--text)' }}>
              Precisa de ajuda?
            </Link>
            <Link to="/termos" className="link-quiet" style={{ color: 'var(--text)' }}>
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="link-quiet" style={{ color: 'var(--text)' }}>
              Política de Privacidade
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-faint)' }}>
            <LogoMark size={14} weight={0} />
            <span>
              © {year} callout. Todos os direitos reservados.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
