import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

const RESEND_COOLDOWN_S = 60;

export function VerificarEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useSession();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<SessionUser>('/auth/verificar-email', {
        method: 'POST',
        body: JSON.stringify({ email, codigo }),
      });
      await refresh();
      navigate(routeForStep(data.proximoPasso));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao verificar. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReenviar() {
    if (!email) return setError('Digita seu email primeiro.');
    setError(null);
    setInfo(null);
    try {
      await apiFetch('/auth/reenviar-codigo', { method: 'POST', body: JSON.stringify({ email }) });
      setInfo('Código reenviado — confere sua caixa de entrada.');
      setCooldown(RESEND_COOLDOWN_S);
      const timer = setInterval(() => {
        setCooldown((v) => {
          if (v <= 1) {
            clearInterval(timer);
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao reenviar. Tenta de novo.');
    }
  }

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--acc, #EF4958)', marginBottom: 18 }}>ETAPA 1 DE 4</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Confirme
        <br />
        seu email.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '40ch' }}>
        Mandamos um código de 6 dígitos pra <span style={{ color: 'var(--text)' }}>{email || 'seu email'}</span>.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!(location.state as { email?: string } | null)?.email && (
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu email" disabled={submitting} />
        )}
        <input
          className="input-field"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
          disabled={submitting}
          style={{ letterSpacing: '.3em', textAlign: 'center', fontSize: 20 }}
        />
        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        {info && <div style={{ fontSize: 13, color: 'var(--pos, #18AAB7)' }}>{info}</div>}
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} disabled={submitting || codigo.length !== 6} type="submit">
          <span>{submitting ? 'Confirmando…' : 'Confirmar'}</span>
          <span>→</span>
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        Não chegou?{' '}
        <button
          type="button"
          onClick={handleReenviar}
          disabled={cooldown > 0}
          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: cooldown > 0 ? 'var(--text-faint)' : 'var(--acc, #EF4958)', cursor: cooldown > 0 ? 'default' : 'pointer' }}
        >
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
        </button>
      </div>
    </LoginShell>
  );
}
