import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

type Modo = 'email' | 'riotId';

export function Login() {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [modo, setModo] = useState<Modo>('email');
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
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        O que a memória
        <br />
        não guarda.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '38ch', textWrap: 'pretty' }}>
        Suas últimas partidas e as estratégias que sua equipe desenhou.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md, 10px)', padding: 4 }}>
        {(['email', 'riotId'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: modo === m ? 'var(--acc, #EF4958)' : 'transparent',
              color: modo === m ? '#fff' : 'var(--text-muted)',
              transition: 'background .15s ease, color .15s ease',
            }}
          >
            {m === 'email' ? 'Email' : 'RiotID'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input-field"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          placeholder={modo === 'email' ? 'voce@email.com' : 'nome#tag'}
          disabled={submitting}
          autoComplete={modo === 'email' ? 'email' : 'username'}
        />
        <input
          className="input-field"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          disabled={submitting}
          autoComplete="current-password"
        />
        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} disabled={submitting} type="submit">
          <span>{submitting ? 'Entrando…' : 'Entrar'}</span>
          <span>→</span>
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </div>
    </LoginShell>
  );
}
