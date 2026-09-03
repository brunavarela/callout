import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { SnakeSpinner } from '../components/Spinner';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

const RESEND_COOLDOWN_S = 60;

export function VerificarEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useSession();
  const state = location.state as { email?: string; codigoJaEnviado?: boolean } | null;
  const [email, setEmail] = useState(state?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [codigoEnviado, setCodigoEnviado] = useState(Boolean(state?.codigoJaEnviado));
  const [enviando, setEnviando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function iniciarCooldown() {
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
  }

  async function handleEnviar() {
    if (!email) return setError('Digita seu email primeiro.');
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/auth/reenviar-codigo', { method: 'POST', body: JSON.stringify({ email }) });
      setCodigoEnviado(true);
      iniciarCooldown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao enviar. Tenta de novo.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmar(e: React.FormEvent) {
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

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--acc, #EF4958)', marginBottom: 18 }}>ETAPA 1 DE 3</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Confirme
        <br />
        seu email.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: '40ch' }}>
        A gente manda um código de 6 dígitos pro seu email pra confirmar que é você.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input-field"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setCodigoEnviado(false);
          }}
          placeholder="Seu email"
          disabled={enviando || submitting}
        />

        {!codigoEnviado ? (
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: enviando ? 'center' : 'space-between' }}
            onClick={handleEnviar}
            disabled={enviando || !email}
            type="button"
          >
            {enviando ? (
              <SnakeSpinner size={16} color="currentColor" />
            ) : (
              <>
                <span>Enviar código</span>
                <span>→</span>
              </>
            )}
          </button>
        ) : (
          <form onSubmit={handleConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--pos, #18AAB7)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> Código enviado — confere sua caixa de entrada (e o spam).
            </div>
            <input
              className="input-field"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              disabled={submitting}
              autoFocus
              style={{ letterSpacing: '.3em', textAlign: 'center', fontSize: 20 }}
            />
            <button className="btn-primary" style={{ width: '100%', justifyContent: submitting ? 'center' : 'space-between' }} disabled={submitting || codigo.length !== 6} type="submit">
              {submitting ? (
                <SnakeSpinner size={16} color="currentColor" />
              ) : (
                <>
                  <span>Confirmar</span>
                  <span>→</span>
                </>
              )}
            </button>
            <button className="btn-secondary" type="button" onClick={handleEnviar} disabled={cooldown > 0 || enviando} style={{ display: 'flex', justifyContent: 'center' }}>
              {enviando ? <SnakeSpinner size={14} color="currentColor" /> : cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
            </button>
          </form>
        )}

        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
      </div>
    </LoginShell>
  );
}
