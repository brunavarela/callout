const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

export function Competitions() {
  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-.025em', margin: 0 }}>Competições</h1>
      <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Em breve.
      </div>
    </div>
  );
}
