import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { THEME_PALETTE, useTheme } from '../lib/theme';
import { useSession } from '../lib/session';

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        border: 'none',
        padding: 2,
        display: 'flex',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        background: checked ? 'var(--acc, #EF4958)' : 'var(--track)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        flex: 'none',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'block' }} />
    </button>
  );
}

function Swatch({ color, active, disabled, onClick }: { color: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={color}
      style={{
        width: 22,
        height: 22,
        flex: 'none',
        borderRadius: '50%',
        background: color,
        border: active ? '2px solid var(--text)' : '2px solid transparent',
        outline: active ? 'none' : '1px solid var(--surface-border)',
        opacity: disabled ? 0.25 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    />
  );
}

export function ThemeSettings({ onClose, className }: { onClose: () => void; className: string }) {
  const { theme, setTheme } = useTheme();
  const { user, logout, adminMode, setAdminMode } = useSession();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  async function update(patch: Partial<typeof theme>) {
    setSaving(true);
    try {
      await setTheme({ ...theme, ...patch });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        zIndex: 10,
        boxShadow: '0 12px 28px rgba(0,0,0,.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Tema</div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13 }}>
          ✕
        </button>
      </div>

      <div>
        <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>COR PRINCIPAL</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, rowGap: 10 }}>
          {THEME_PALETTE.map((c) => (
            <Swatch key={c} color={c} active={theme.accentColor === c} disabled={saving} onClick={() => update({ accentColor: c })} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>COR NEGATIVA</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, rowGap: 10 }}>
          {THEME_PALETTE.map((c) => (
            <Swatch
              key={c}
              color={c}
              active={theme.negativeColor === c}
              disabled={saving || c === theme.accentColor}
              onClick={() => update({ negativeColor: c })}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>
          <span>GLOW</span>
          <span style={{ marginLeft: 'auto' }}>{theme.glow}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={theme.glow}
          disabled={saving}
          onChange={(e) => update({ glow: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          {theme.mode === 'light' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
          Tema claro
        </span>
        <Switch checked={theme.mode === 'light'} disabled={saving} onChange={(v) => update({ mode: v ? 'light' : 'dark' })} />
      </div>

      {user?.isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Administrador</span>
          <Switch checked={adminMode} onChange={setAdminMode} />
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--surface-border)', margin: '2px 0' }} />

      <button
        onClick={() => setConfirmingLogout(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--acc, #EF4958)',
          cursor: 'pointer',
        }}
      >
        <LogOut size={16} strokeWidth={1.75} />
        Sair da conta
      </button>

      {confirmingLogout && (
        <div
          onClick={() => !loggingOut && setConfirmingLogout(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 22,
              width: 320,
              maxWidth: '90vw',
              boxShadow: '0 12px 28px rgba(0,0,0,.5)',
            }}
          >
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Sair da conta?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8 }}>
              Você vai precisar entrar de novo pra acessar o callout.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setConfirmingLogout(false)}
                disabled={loggingOut}
                className="btn-secondary"
                style={{ flex: 1, padding: 10, fontSize: 13, justifyContent: 'center' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-primary"
                style={{ flex: 1, padding: 10, fontSize: 13, justifyContent: 'center', opacity: loggingOut ? 0.6 : 1 }}
              >
                {loggingOut ? 'Saindo…' : 'Sair'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
