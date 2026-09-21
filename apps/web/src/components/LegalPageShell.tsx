import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { Footer } from './Footer';

// Layout compartilhado por /termos e /privacidade — acessível sem login
// (por isso não usa AppShell, que exige equipe/Riot vinculados). A faixa de
// "rascunho, sem validade jurídica" saiu em 21/09/2026 -- contradizia o
// próprio fluxo de cadastro (a pessoa aceita esses Termos pra criar conta) e
// travava a submissão ao Riot Developer Portal. Revisão formal por advogado
// continua pendente antes da Fase D (cobrança) -- ver LAUNCH.md §3.4.
export function LegalPageShell({ title, updatedAtLabel, children }: { title: string; updatedAtLabel?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ flex: 1, padding: '32px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
            <Link to="/" style={{ display: 'inline-flex' }}>
              <Logo height={24} />
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', fontSize: 12.5 }}
            >
              <ArrowLeft size={14} strokeWidth={2} />
              Voltar
            </button>
          </div>

          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', margin: updatedAtLabel ? '0 0 6px' : '0 0 28px' }}>
            {title}
          </h1>
          {updatedAtLabel && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 28 }}>Última atualização: {updatedAtLabel}</div>}

          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {children}
          </div>

          <button
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', fontSize: 12.5, marginTop: 32 }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Voltar
          </button>
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
