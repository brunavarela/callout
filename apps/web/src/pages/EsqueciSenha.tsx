import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { PasswordField } from '../components/PasswordField';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { senhaValida } from '../lib/senha';
import { routeForStep } from '../lib/onboarding';

export function EsqueciSenha() {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  function iniciarCooldown() {
    setCooldown(60);
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
      await apiFetch('/auth/recuperar-senha', { method: 'POST', body: JSON.stringify({ email }) });
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
    if (!senhaValida(novaSenha)) return setError('Sua senha ainda não atende todos os requisitos abaixo.');
    if (novaSenha !== confirmarNovaSenha) return setError('As senhas não coincidem.');

    setSubmitting(true);
    try {
      const data = await apiFetch<SessionUser>('/auth/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ email, codigo, novaSenha, confirmarNovaSenha }),
      });
      await refresh();
      navigate(routeForStep(data.proximoPasso));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao redefinir. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginShell>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Esqueceu
        <br />
        a senha?
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: '40ch' }}>
        Digita seu email que a gente manda um código pra você criar uma senha nova.
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
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} onClick={handleEnviar} disabled={enviando || !email} type="button">
            <span>{enviando ? 'Enviando…' : 'Enviar código'}</span>
            <span>→</span>
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
            <PasswordField value={novaSenha} onChange={setNovaSenha} placeholder="Senha nova" disabled={submitting} autoComplete="new-password" />
            <PasswordRequirements senha={novaSenha} />
            <PasswordField
              value={confirmarNovaSenha}
              onChange={setConfirmarNovaSenha}
              placeholder="Confirmar senha nova"
              disabled={submitting}
              autoComplete="new-password"
            />
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} disabled={submitting || codigo.length !== 6} type="submit">
              <span>{submitting ? 'Redefinindo…' : 'Redefinir senha'}</span>
              <span>→</span>
            </button>
            <button className="btn-secondary" type="button" onClick={handleEnviar} disabled={cooldown > 0 || enviando}>
              {cooldown > 0 ? `Reenviar código (${cooldown}s)` : enviando ? 'Reenviando…' : 'Reenviar código'}
            </button>
          </form>
        )}

        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        <Link to="/login">Voltar pro login</Link>
      </div>
    </LoginShell>
  );
}
