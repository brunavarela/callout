import type { ReactNode } from 'react';

// Overlay centralizado reutilizável — mesmo padrão que já existia (inline)
// no diálogo de confirmação de logout, agora compartilhado entre os modais
// de Perfil/Tema também.
export function Modal({ onClose, children, width = 420 }: { onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          width,
          maxWidth: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 12px 28px rgba(0,0,0,.5)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17 }}>{title}</div>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 15, cursor: 'pointer' }}>
        ✕
      </button>
    </div>
  );
}
