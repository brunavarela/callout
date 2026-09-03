import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { AuthTabs } from '../components/AuthTabs';
import { AuthStepFrame } from '../components/AuthStepFrame';
import { PasswordField } from '../components/PasswordField';
import { SnakeSpinner } from '../components/Spinner';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

export function Login() {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<SessionUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identificador, senha }),
      });
      await refresh();
      navigate(routeForStep(data.proximoPasso));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const body = err.body as { email?: string } | undefined;
        navigate('/cadastro/verificar-email', { state: { email: body?.email } });
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginShell>
      <AuthTabs active="entrar" />
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        O que a memória
        <br />
        não guarda.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '38ch', textWrap: 'pretty' }}>
        Suas últimas partidas e as estratégias que sua equipe desenhou.
      </p>

      <AuthStepFrame animKey="entrar">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input-field"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Email ou RiotID"
            disabled={submitting}
            autoComplete="username"
          />
          <PasswordField value={senha} onChange={setSenha} placeholder="Senha" disabled={submitting} autoComplete="current-password" />
          {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
          <button className="btn-primary" style={{ width: '100%', justifyContent: submitting ? 'center' : 'space-between' }} disabled={submitting} type="submit">
            {submitting ? (
              <SnakeSpinner size={16} color="currentColor" />
            ) : (
              <>
                <span>Entrar</span>
                <span>→</span>
              </>
            )}
          </button>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            <Link to="/esqueci-senha">Esqueceu a senha?</Link>
          </div>
        </form>
      </AuthStepFrame>
    </LoginShell>
  );
}
