import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { Footer } from './Footer';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div className="login-shell-grid" style={{ marginInline: 'auto' }}>
        <div
          className="login-shell-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', color: 'var(--text)' }}>
            <Logo height={38} />
          </div>

          <div style={{ position: 'relative', maxWidth: 460 }}>{children}</div>

          <div style={{ position: 'relative', fontSize: 11, color: 'var(--text-faint)', maxWidth: '60ch', lineHeight: 1.6 }}>
            Ferramenta independente feita por um grupo de amigos. Sem vínculo com a Riot Games. Dados de partida
            vindos de API pública não-oficial.
          </div>
        </div>

        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src="/img/login-art.jpg"
            alt="Ilustração dos agentes do grupo"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              filter: 'saturate(.85) contrast(1.02)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, var(--bg) 0%, rgba(15,15,16,.75) 8%, rgba(15,15,16,.35) 16%, transparent 28%, transparent 88%, var(--bg) 100%)',
            }}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
