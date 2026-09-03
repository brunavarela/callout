import { Check } from 'lucide-react';
import { SENHA_REQUISITOS } from '../lib/senha';

export function PasswordRequirements({ senha }: { senha: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 2px 0' }}>
      {SENHA_REQUISITOS.map((r) => {
        const ok = r.test(senha);
        return (
          <div
            key={r.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: ok ? 'var(--pos, #18AAB7)' : 'var(--text-faint)',
              transition: 'color .25s ease',
            }}
          >
            <span
              style={{
                width: 15,
                height: 15,
                flex: 'none',
                borderRadius: '50%',
                border: `1.5px solid ${ok ? 'var(--pos, #18AAB7)' : 'var(--text-faint)'}`,
                background: ok ? 'var(--pos, #18AAB7)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: ok ? 'scale(1)' : 'scale(0.85)',
                transition: 'background .25s ease, border-color .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1)',
              }}
            >
              <Check
                size={9}
                strokeWidth={3.5}
                color="#08131a"
                style={{ opacity: ok ? 1 : 0, transform: ok ? 'scale(1)' : 'scale(0)', transition: 'opacity .2s ease, transform .2s ease' }}
              />
            </span>
            <span>{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}
