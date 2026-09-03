import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';

// Rodapé enxuto, em linha — aparece no fim de toda página (AppShell.tsx
// pras telas logadas, LoginShell.tsx pras telas de login). Termos/
// Privacidade são rascunho interno ainda sem revisão jurídica formal (ver
// LAUNCH.md §3.4/§12) — os links já existem pra não ter que replicar essa
// mudança depois, mas as próprias páginas deixam isso avisado.
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ borderTop: '1px solid var(--divider)', marginTop: 'auto' }}>
      <div style={{ padding: '14px 26px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.6, maxWidth: '70ch' }}>
          Ferramenta independente feita por um grupo de amigos. Sem vínculo com a Riot Games. Dados de partida
          vindos de API pública não-oficial.
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 12,
            color: 'var(--text-faint)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)' }}>
            <LogoMark size={14} weight={0} />
            <span>
              © {year} callout. Todos os direitos reservados.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/termos" className="link-quiet" style={{ color: 'var(--text-faint)' }}>
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="link-quiet" style={{ color: 'var(--text-faint)' }}>
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
