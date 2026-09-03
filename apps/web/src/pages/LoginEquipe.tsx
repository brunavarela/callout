import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginShell } from '../components/LoginShell';
import { SnakeSpinner } from '../components/Spinner';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

type Mode = 'criar' | 'entrar';

export function LoginEquipe() {
  const navigate = useNavigate();
  const { user, loading, logout, refresh } = useSession();
  const [mode, setMode] = useState<Mode>('criar');
  const [nome, setNome] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // Já tem equipe (voltou pra essa URL à toa) — segue o fluxo normal.
    if (user.equipe) navigate(routeForStep(user.proximoPasso), { replace: true });
  }, [loading, user, navigate]);

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
      await refresh();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao continuar. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTrocar(e: React.MouseEvent) {
    e.preventDefault();
    await logout();
    navigate('/login');
  }

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--acc, #EF4958)', marginBottom: 18 }}>ETAPA 3 DE 3</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Monte
        <br />
        sua equipe.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: '38ch' }}>
        Crie uma equipe nova ou entre numa que já existe com o código de convite.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        Entrou como <span style={{ color: 'var(--text-muted)' }}>{user?.nome ?? '…'}</span> ·{' '}
        <a href="#" onClick={handleTrocar}>
          trocar
        </a>
      </div>
    </LoginShell>
  );
}
