import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { AuthArrow } from '../components/AuthArrow';
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
  const [lembrar, setLembrar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<SessionUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identificador, senha, lembrar }),
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
    <>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        O que a memória
        <br />
        não guarda.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '38ch', textWrap: 'pretty' }}>
        Seu desempenho individual e as estratégias que sua equipe desenhou para alcançar o topo.
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <button
              type="button"
              onClick={() => setLembrar((v) => !v)}
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  flex: 'none',
                  borderRadius: 4,
                  border: `1.5px solid ${lembrar ? 'var(--acc, #EF4958)' : 'var(--text-faint)'}`,
                  background: lembrar ? 'var(--acc, #EF4958)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 11,
                }}
              >
                {lembrar ? '✓' : ''}
              </span>
              Lembrar-me
            </button>
            <Link to="/esqueci-senha" style={{ color: 'var(--text-dim)' }}>
              Esqueceu a senha?
            </Link>
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
          <button className="btn-primary" style={{ width: '100%', justifyContent: submitting ? 'center' : 'space-between' }} disabled={submitting} type="submit">
            {submitting ? (
              <SnakeSpinner size={16} color="currentColor" />
            ) : (
              <>
                <span>Entrar</span>
                <AuthArrow />
              </>
            )}
          </button>
        </form>
      </AuthStepFrame>
    </>
  );
}
