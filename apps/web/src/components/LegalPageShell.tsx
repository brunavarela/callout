import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Footer } from './Footer';

// Layout compartilhado por /termos e /privacidade — acessível sem login
// (por isso não usa AppShell, que exige equipe/Riot vinculados). Aviso de
// rascunho fica sempre visível no topo até alguém tirar essa faixa depois
// da revisão jurídica formal (ver LAUNCH.md §3.4/§12).
export function LegalPageShell({ title, updatedAtLabel, children }: { title: string; updatedAtLabel: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ flex: 1, padding: '32px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <Link to="/" style={{ display: 'inline-flex', marginBottom: 28 }}>
            <Logo height={24} />
          </Link>

          <div
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid color-mix(in srgb, var(--acc, #EF4958) 35%, var(--surface-border))',
              background: 'color-mix(in srgb, var(--acc, #EF4958) 8%, transparent)',
              padding: '12px 16px',
              fontSize: 12.5,
              lineHeight: 1.5,
              color: 'var(--text-muted)',
              marginBottom: 28,
            }}
          >
            <strong style={{ color: 'var(--text)' }}>Rascunho, ainda não revisado por um advogado.</strong> Este texto
            organiza o que os Termos de Uso e a Política de Privacidade de verdade vão precisar cobrir — não é a
            versão final nem tem validade jurídica ainda.
          </div>

          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', margin: '0 0 6px' }}>
            {title}
          </h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 28 }}>Última atualização: {updatedAtLabel}</div>

          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16, margin: '0 0 8px', color: 'var(--text)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}
