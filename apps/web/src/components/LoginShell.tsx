import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { LoginHeroPanel } from './LoginHeroPanel';

// Sem <Footer> aqui — o rodapé completo (logo, copyright, links de Termos/
// Privacidade) só aparece nas telas logadas (AppShell). Na tela de login o
// aviso vira só essa frase discreta embaixo do formulário; Termos/
// Privacidade viram checkbox obrigatório no passo de senha do cadastro
// (ver Cadastro.tsx / LegalModal.tsx).
export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="login-shell-grid" style={{ marginInline: 'auto' }}>
        <div
          className="login-shell-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            // flex-start (não space-between) -- com space-between o bloco do
            // meio (AuthTabs+conteúdo) sobe/desce conforme a altura do
            // conteúdo abaixo muda entre /login e /cadastro, fazendo as tabs
            // "pularem" na troca. Aqui tudo fica ancorado no topo a partir
            // da logo, só o aviso de rodapé é empurrado pro final via
            // margin-top: auto.
            justifyContent: 'flex-start',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -160,
              left: -160,
              width: 520,
              height: 520,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--acc18, rgba(239,73,88,.18)) 0%, transparent 68%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', color: 'var(--text)', marginBottom: 56 }}>
            <Logo height={38} />
          </div>

          <div style={{ position: 'relative', maxWidth: 460 }}>{children}</div>

          <div style={{ position: 'relative', fontSize: 11, lineHeight: 1.6, color: 'var(--text-faint)', maxWidth: '60ch', marginTop: 'auto', paddingTop: 40 }}>
            Ferramenta independente. Sem vínculo com a Riot Games. Dados de partida vindos de API pública não-oficial.
          </div>
        </div>

        <LoginHeroPanel />
      </div>
    </div>
  );
}
