import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginShell } from '../components/LoginShell';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import type { SessionUser } from '@callout/shared';

const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

export function LoginStep2() {
  const navigate = useNavigate();
  const { user, loading, logout, refresh } = useSession();
  const [riotId, setRiotId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login', { replace: true });
    else if (!user.team) navigate('/login/time', { replace: true });
  }, [loading, user, navigate]);

  async function handleSubmit() {
    if (!RIOT_ID_PATTERN.test(riotId)) {
      setError('Formato inválido. Use nome#tag, por exemplo thiago#BR1.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<SessionUser>('/auth/riot', {
        method: 'POST',
        body: JSON.stringify({ riotId }),
      });
      await refresh();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao vincular. Tenta de novo.');
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
        Vincule
        <br />
        sua conta.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 32px', maxWidth: '38ch' }}>
        Seu Riot ID é o que liga suas partidas ao grupo. Formato <span style={{ color: 'var(--text)' }}>nome#tag</span>.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input-field"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="thiago#BR1"
          disabled={submitting}
        />
        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        <button className="btn-primary" style={{ justifyContent: 'space-between' }} onClick={handleSubmit} disabled={submitting}>
          <span>{submitting ? 'Vinculando…' : 'Vincular e continuar'}</span>
          <span>→</span>
        </button>
      </div>
      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        Entrou como <span style={{ color: 'var(--text-muted)' }}>@{user?.discordUsername ?? '…'}</span> ·{' '}
        <a href="#" onClick={handleTrocar}>
          trocar
        </a>
      </div>
    </LoginShell>
  );
}
