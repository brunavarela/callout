import type { ReactNode } from 'react';
import { MapSchematic } from './MapSchematic';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr .9fr' }}>
      <div
        style={{
          padding: 64,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--divider)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: '-.02em' }}>callout</span>
          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-dim)' }}>v0.1 — privado</span>
        </div>

        <div style={{ maxWidth: 440 }}>{children}</div>

        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-faint)', maxWidth: '60ch', lineHeight: 1.6 }}>
          Ferramenta independente feita por um grupo de amigos. Sem vínculo com a Riot Games. Dados de partida vindos
          de API pública não-oficial.
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--surface-sunken)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div style={{ position: 'relative', width: '74%', opacity: 0.55 }}>
          <MapSchematic showAccentPoint style={{ width: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', left: '6%', top: '4%', fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.1em', color: 'var(--positive)' }}>
            A SITE
          </div>
          <div style={{ position: 'absolute', right: '8%', bottom: '14%', fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.1em', color: 'var(--positive)' }}>
            B SITE
          </div>
          <div style={{ position: 'absolute', left: '44%', top: '44%', fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.1em', color: 'var(--action)' }}>
            HOOKAH
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'Inter,sans-serif',
            fontSize: 11,
            letterSpacing: '.16em',
            color: 'var(--text-faint)',
          }}
        >
          BIND — PLANTA ESQUEMÁTICA
        </div>
      </div>
    </div>
  );
}
