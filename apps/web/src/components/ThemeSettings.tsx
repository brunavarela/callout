import { useState } from 'react';
import { THEME_PALETTE, useTheme } from '../lib/theme';

function Swatch({ color, active, disabled, onClick }: { color: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={color}
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: color,
        border: active ? '2px solid var(--text)' : '2px solid transparent',
        outline: active ? 'none' : '1px solid rgba(255,255,255,.15)',
        opacity: disabled ? 0.25 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    />
  );
}

export function ThemeSettings({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  async function update(patch: Partial<typeof theme>) {
    setSaving(true);
    try {
      await setTheme({ ...theme, ...patch });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
        left: 14,
        right: 14,
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
        <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>COR DE AÇÃO</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {THEME_PALETTE.map((c) => (
            <Swatch key={c} color={c} active={theme.accentColor === c} disabled={saving} onClick={() => update({ accentColor: c })} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>COR POSITIVA</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {THEME_PALETTE.map((c) => (
            <Swatch
              key={c}
              color={c}
              active={theme.positiveColor === c}
              disabled={saving || c === theme.accentColor}
              onClick={() => update({ positiveColor: c })}
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

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
        <input type="checkbox" checked={theme.tintedCards} disabled={saving} onChange={(e) => update({ tintedCards: e.target.checked })} />
        Cards tintados
      </label>
    </div>
  );
}
