import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { routeForStep } from '../lib/onboarding';

export function VerificarRiotId() {
  const navigate = useNavigate();
  const { user, loading, logout, refresh } = useSession();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.proximoPasso !== 'verificar-riot') {
      navigate(routeForStep(user.proximoPasso), { replace: true });
    }
  }, [loading, user, navigate]);

  async function gerarCodigo() {
    setError(null);
    setGerando(true);
    try {
      const data = await apiFetch<{ codigo: string }>('/auth/riot/gerar-codigo', { method: 'POST' });
      setCodigo(data.codigo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar código. Tenta de novo.');
    } finally {
      setGerando(false);
    }
  }

  useEffect(() => {
    if (user && user.proximoPasso === 'verificar-riot' && !codigo && !gerando) {
      gerarCodigo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleConfirmar() {
    setError(null);
    setConfirmando(true);
    try {
      const data = await apiFetch<SessionUser>('/auth/riot/confirmar', { method: 'POST' });
      await refresh();
      navigate(routeForStep(data.proximoPasso));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao confirmar. Tenta de novo.');
    } finally {
      setConfirmando(false);
    }
  }

  async function handleTrocar(e: React.MouseEvent) {
    e.preventDefault();
    await logout();
    navigate('/login');
  }

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--acc, #EF4958)', marginBottom: 18 }}>ETAPA 2 DE 3</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Prova que
        <br />
        é você.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '42ch' }}>
        Abre o cliente do Valorant e troca sua tag (a parte depois do #) pro código abaixo. Só quem tem acesso à conta
        consegue fazer isso.
      </p>

      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          padding: '22px 20px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--text-dim)', marginBottom: 8 }}>
          {user?.riotId ? `${user.riotId.name}#` : 'NOME#'}
        </div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '.1em' }}>{codigo ?? (gerando ? '…' : '----')}</div>
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" style={{ justifyContent: 'space-between' }} onClick={handleConfirmar} disabled={confirmando || !codigo}>
          <span>{confirmando ? 'Confirmando…' : 'Já troquei, confirmar'}</span>
          <span>→</span>
        </button>
        <button className="btn-secondary" onClick={gerarCodigo} disabled={gerando}>
          {gerando ? 'Gerando…' : 'Gerar código novo'}
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
