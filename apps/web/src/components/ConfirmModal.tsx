export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Apagar',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)', width: 360, maxWidth: '90vw', padding: 22 }}
      >
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8 }}>{message}</div>
        {error && <div style={{ color: 'var(--acc, #EF4958)', fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: 10, fontSize: 13, justifyContent: 'center' }} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 13,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--acc, #EF4958)',
              color: '#fff',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Apagando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
