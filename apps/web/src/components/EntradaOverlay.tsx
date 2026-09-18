import { SnakeSpinner } from './Spinner';
import { Logo } from './Logo';

// Feedback de carregamento cheio (fixed, cobre a tela inteira) -- usado nos
// momentos de "entrada" no app (terminar cadastro, criar equipe, entrar numa
// equipe) enquanto os dados da Visão do ato ainda não chegaram. Ver
// lib/entrada.ts pra quem dispara/lê isso.
export function EntradaOverlay({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 20,
      }}
    >
      <Logo height={30} />
      <SnakeSpinner size={40} />
      <div style={{ fontSize: 14.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}
