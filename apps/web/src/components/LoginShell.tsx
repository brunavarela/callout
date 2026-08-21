import type { ReactNode } from 'react';
import { MapSchematic } from './MapSchematic';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr .95fr', padding: 18, gap: 18 }}>
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          padding: 56,
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
            left: -120,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--acc22, rgba(239,73,88,.22)) 0%, transparent 68%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: '-.02em' }}>
            callout<span style={{ color: 'var(--acc, #EF4958)' }}>.</span>
          </span>
          <span style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--text-dim)' }}>V0.1 — PRIVADO</span>
        </div>

        <div style={{ position: 'relative', maxWidth: 460 }}>{children}</div>

        <div style={{ position: 'relative', fontSize: 11, color: 'var(--text-faint)', maxWidth: '60ch', lineHeight: 1.6 }}>
          Ferramenta independente feita por um grupo de amigos. Sem vínculo com a Riot Games. Dados de partida vindos
          de API pública não-oficial.
        </div>
      </div>

      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--surface-border)',
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
              'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--acc18, rgba(239,73,88,.18)) 0%, transparent 70%)',
          }}
        />
        <div style={{ position: 'relative', width: '72%' }}>
          <MapSchematic
            showAccentPoint
            rounded
            style={{ width: '100%', display: 'block', opacity: 0.6 }}
          />
          <div style={{ position: 'absolute', left: '6%', top: '4%', fontSize: 11, letterSpacing: '.1em', color: 'var(--pos, #18AAB7)' }}>
            A SITE
          </div>
          <div style={{ position: 'absolute', right: '8%', bottom: '14%', fontSize: 11, letterSpacing: '.1em', color: 'var(--pos, #18AAB7)' }}>
            B SITE
          </div>
          <div style={{ position: 'absolute', left: '44%', top: '44%', fontSize: 11, letterSpacing: '.1em', color: 'var(--acc, #EF4958)' }}>
            HOOKAH
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 26,
            left: 0,
            right: 0,
            textAlign: 'center',
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
