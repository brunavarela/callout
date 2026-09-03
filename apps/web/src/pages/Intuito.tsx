import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { INTUITOS, INTUITO_LABELS } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

export function Intuito() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useSession();
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.proximoPasso !== 'intuito') {
      navigate(routeForStep(user.proximoPasso), { replace: true });
    }
  }, [loading, user, navigate]);

  function toggle(valor: string) {
    setSelecionados((v) => (v.includes(valor) ? v.filter((x) => x !== valor) : [...v, valor]));
  }

  async function handleSubmit() {
    if (selecionados.length === 0) return setError('Escolhe pelo menos uma opção.');
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<SessionUser>('/auth/intuito', {
        method: 'PATCH',
        body: JSON.stringify({ intuitos: selecionados }),
      });
      await refresh();
      navigate(routeForStep(data.proximoPasso));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--acc, #EF4958)', marginBottom: 18 }}>ETAPA 3 DE 4</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Pra que você
        <br />
        vai usar?
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '40ch' }}>
        Pode marcar mais de uma — isso ajuda a gente a priorizar o que construir depois.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {INTUITOS.map((valor) => {
          const ativo = selecionados.includes(valor);
          return (
            <button
              key={valor}
              type="button"
              onClick={() => toggle(valor)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md, 10px)',
                border: `1px solid ${ativo ? 'var(--acc, #EF4958)' : 'var(--surface-border)'}`,
                background: ativo ? 'color-mix(in srgb, var(--acc, #EF4958) 12%, var(--surface))' : 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  flex: 'none',
                  borderRadius: 5,
                  border: `1.5px solid ${ativo ? 'var(--acc, #EF4958)' : 'var(--text-faint)'}`,
                  background: ativo ? 'var(--acc, #EF4958)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                }}
              >
                {ativo ? '✓' : ''}
              </span>
              {INTUITO_LABELS[valor]}
            </button>
          );
        })}
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)', marginBottom: 12 }}>{error}</div>}

      <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} onClick={handleSubmit} disabled={submitting}>
        <span>{submitting ? 'Salvando…' : 'Continuar'}</span>
        <span>→</span>
      </button>
    </LoginShell>
  );
}
