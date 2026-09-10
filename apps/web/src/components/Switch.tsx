export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
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
