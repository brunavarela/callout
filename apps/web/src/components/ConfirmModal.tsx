import { useState } from 'react';

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Apagar',
  busy,
  error,
  onConfirm,
  onCancel,
  typeToConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  // Segurança extra pra ação destrutiva de equipe (sair/excluir membro/
  // excluir equipe, ver EquipeConfiguracoes.tsx) -- exige digitar esse texto
  // exatamente (sem diferenciar maiúscula/minúscula ou espaço nas pontas)
  // antes de liberar o botão de confirmar. Sem isso, o modal funciona igual
  // a antes (confirma direto no clique).
  typeToConfirm?: string;
}) {
  const [typed, setTyped] = useState('');
  const confirmBlocked = typeToConfirm !== undefined && typed.trim().toLowerCase() !== typeToConfirm.trim().toLowerCase();

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
        {typeToConfirm !== undefined && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 6 }}>
              Digite <strong style={{ color: 'var(--text)' }}>{typeToConfirm}</strong> pra confirmar:
            </div>
            <input
              className="input-field"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              placeholder={typeToConfirm}
            />
          </div>
        )}
        {error && <div style={{ color: 'var(--acc, #EF4958)', fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: 10, fontSize: 13, justifyContent: 'center' }} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || confirmBlocked}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 13,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--acc, #EF4958)',
              color: '#fff',
              cursor: busy || confirmBlocked ? (busy ? 'wait' : 'not-allowed') : 'pointer',
              opacity: busy || confirmBlocked ? 0.5 : 1,
            }}
          >
            {busy ? 'Apagando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
