import { useState } from 'react';
import { SnakeSpinner } from './Spinner';
import { apiFetch, ApiError } from '../lib/api';

type Mode = 'criar' | 'entrar';

// Formulário de "criar equipe ou entrar com código" -- extraído de
// LoginEquipe.tsx (onboarding) pra reusar aqui e na tela de Equipe, quando
// a pessoa não tem equipe nenhuma (fluxo agora é opcional, ver
// resolveOnboardingStep) e decide criar/entrar depois, fora do cadastro.
// `onDone` recebe o modo usado -- quem chama decide a mensagem da tela de
// entrada (ver EntradaOverlay/lib/entrada.ts) com base nisso.
export function EquipeSetupForm({ onDone }: { onDone: (mode: 'criar' | 'entrar') => void }) {
  const [mode, setMode] = useState<Mode>('criar');
  const [nome, setNome] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit() {
    if (mode === 'criar' && !nome.trim()) {
      setError('Dá um nome pra equipe.');
      return;
    }
    if (mode === 'entrar' && !code.trim()) {
      setError('Cola o código de convite.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'criar') {
        await apiFetch('/equipes', { method: 'POST', body: JSON.stringify({ nome: nome.trim() }) });
      } else {
        await apiFetch('/equipes/entrar', { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      }
      onDone(mode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao continuar. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={mode === 'criar' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => switchMode('criar')}
          disabled={submitting}
        >
          Criar equipe
        </button>
        <button
          type="button"
          className={mode === 'entrar' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => switchMode('entrar')}
          disabled={submitting}
        >
          Tenho um código
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'criar' ? (
          <input
            className="input-field"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da equipe"
            disabled={submitting}
          />
        ) : (
          <input
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código de convite"
            disabled={submitting}
          />
        )}
        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        <button className="btn-primary" style={{ justifyContent: submitting ? 'center' : 'space-between' }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <SnakeSpinner size={16} color="currentColor" />
          ) : (
            <>
              <span>{mode === 'criar' ? 'Criar e continuar' : 'Entrar e continuar'}</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
