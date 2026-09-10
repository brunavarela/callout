import { useState } from 'react';
import type { SessionUser } from '@callout/shared';
import { Modal, ModalHeader } from './Modal';
import { PasswordField } from './PasswordField';
import { PasswordRequirements } from './PasswordRequirements';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { senhaValida } from '../lib/senha';

const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--surface-border)' }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 10 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function ErrorMsg({ text }: { text: string | null }) {
  if (!text) return null;
  return <div style={{ fontSize: 12.5, color: 'var(--acc, #EF4958)', marginTop: 8 }}>{text}</div>;
}

function OkMsg({ text }: { text: string | null }) {
  if (!text) return null;
  return <div style={{ fontSize: 12.5, color: 'var(--pos, #18AAB7)', marginTop: 8 }}>{text}</div>;
}

// --- Nome + preferência de exibição ---
function NomeSection({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
  const [nome, setNome] = useState(user.displayName ?? '');
  const [exibirRiotId, setExibirRiotId] = useState(user.exibirRiotIdComoNome);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSalvar() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const updated = await apiFetch<SessionUser>('/me/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: nome, exibirRiotIdComoNome: exibirRiotId }),
      });
      onUpdated(updated);
      setOk('Salvo.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 10 }}>PERFIL</div>
      <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" disabled={saving} />

      {user.riotId && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, background: 'var(--control-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          {[
            { key: false, label: 'Meu nome' },
            { key: true, label: 'RiotID' },
          ].map((opt) => (
            <button
              key={String(opt.key)}
              type="button"
              onClick={() => setExibirRiotId(opt.key)}
              disabled={saving}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 600,
                background: exibirRiotId === opt.key ? 'var(--acc, #EF4958)' : 'transparent',
                color: exibirRiotId === opt.key ? '#fff' : 'var(--text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <button className="btn-secondary" style={{ marginTop: 10 }} onClick={handleSalvar} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
      <ErrorMsg text={error} />
      <OkMsg text={ok} />
    </div>
  );
}

// --- Troca de email ---
function EmailSection({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
  const [novoEmail, setNovoEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pendente, setPendente] = useState(Boolean(user.emailPendente));
  const [emailAlvo, setEmailAlvo] = useState(user.emailPendente ?? '');
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSolicitar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/me/email/solicitar', { method: 'POST', body: JSON.stringify({ novoEmail }) });
      setEmailAlvo(novoEmail);
      setPendente(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao solicitar troca.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmar() {
    setError(null);
    setConfirmando(true);
    try {
      const updated = await apiFetch<SessionUser>('/me/email/confirmar', { method: 'POST', body: JSON.stringify({ codigo }) });
      onUpdated(updated);
      setPendente(false);
      setCodigo('');
      setNovoEmail('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao confirmar.');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <Section title="Email">
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Atual: {user.email}</div>
      {!pendente ? (
        <>
          <input className="input-field" type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="Novo email" disabled={enviando} />
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={handleSolicitar} disabled={enviando || !novoEmail}>
            {enviando ? 'Enviando…' : 'Trocar email'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--pos, #18AAB7)', marginBottom: 8 }}>✓ Código enviado pra {emailAlvo} — confere a caixa de entrada.</div>
          <input
            className="input-field"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            style={{ letterSpacing: '.3em', textAlign: 'center', fontSize: 18 }}
          />
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={handleConfirmar} disabled={confirmando || codigo.length !== 6}>
            {confirmando ? 'Confirmando…' : 'Confirmar troca'}
          </button>
        </>
      )}
      <ErrorMsg text={error} />
    </Section>
  );
}

// --- Troca de RiotID ---
function RiotIdSection({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
  const [novoRiotId, setNovoRiotId] = useState('');
  const [codigo, setCodigo] = useState<string | null>(null);
  const [pendente, setPendente] = useState(Boolean(user.riotIdPendente));
  const [riotNameAlvo, setRiotNameAlvo] = useState(user.riotIdPendente?.name ?? '');
  const [gerando, setGerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSolicitar() {
    if (!RIOT_ID_PATTERN.test(novoRiotId)) return setError('Formato inválido. Use nome#tag.');
    setError(null);
    setGerando(true);
    try {
      const data = await apiFetch<{ codigo: string; riotName: string }>('/me/riotid/solicitar', { method: 'POST', body: JSON.stringify({ riotId: novoRiotId }) });
      setCodigo(data.codigo);
      setRiotNameAlvo(data.riotName);
      setPendente(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao solicitar troca.');
    } finally {
      setGerando(false);
    }
  }

  async function handleConfirmar() {
    setError(null);
    setConfirmando(true);
    try {
      const updated = await apiFetch<SessionUser>('/me/riotid/confirmar', { method: 'POST' });
      onUpdated(updated);
      setPendente(false);
      setCodigo(null);
      setNovoRiotId('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao confirmar.');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <Section title="RiotID">
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
        Atual: {user.riotId ? `${user.riotId.name}#${user.riotId.tag}` : '—'}
      </div>
      {!pendente ? (
        <>
          <input className="input-field" value={novoRiotId} onChange={(e) => setNovoRiotId(e.target.value)} placeholder="Novo RiotID — nome#tag" disabled={gerando} />
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={handleSolicitar} disabled={gerando || !novoRiotId}>
            {gerando ? 'Gerando código…' : 'Trocar RiotID'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>
            Troca a tag da conta <strong style={{ color: 'var(--text)' }}>{riotNameAlvo}</strong> pra:
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 24, letterSpacing: '.1em', padding: '8px 0' }}>
            {codigo ?? '····'}
          </div>
          <button className="btn-secondary" onClick={handleConfirmar} disabled={confirmando}>
            {confirmando ? 'Confirmando…' : 'Já troquei, confirmar'}
          </button>
        </>
      )}
      <ErrorMsg text={error} />
    </Section>
  );
}

// --- Troca de senha ---
function SenhaSection() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleSalvar() {
    setError(null);
    setOk(null);
    if (!senhaAtual) return setError('Digita sua senha atual.');
    if (!senhaValida(novaSenha)) return setError('A senha nova ainda não atende todos os requisitos.');
    if (novaSenha !== confirmarNovaSenha) return setError('As senhas não coincidem.');

    setSaving(true);
    try {
      await apiFetch('/me/senha', { method: 'PATCH', body: JSON.stringify({ senhaAtual, novaSenha, confirmarNovaSenha }) });
      setOk('Senha alterada.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao alterar senha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Senha">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PasswordField value={senhaAtual} onChange={setSenhaAtual} placeholder="Senha atual" disabled={saving} autoComplete="current-password" />
        <PasswordField value={novaSenha} onChange={setNovaSenha} placeholder="Senha nova" disabled={saving} autoComplete="new-password" />
        {novaSenha.length > 0 && <PasswordRequirements senha={novaSenha} />}
        <PasswordField value={confirmarNovaSenha} onChange={setConfirmarNovaSenha} placeholder="Confirmar senha nova" disabled={saving} autoComplete="new-password" />
        <button className="btn-secondary" onClick={handleSalvar} disabled={saving}>
          {saving ? 'Alterando…' : 'Alterar senha'}
        </button>
      </div>
      <ErrorMsg text={error} />
      <OkMsg text={ok} />
    </Section>
  );
}

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useSession();
  if (!user) return null;

  async function handleUpdated() {
    await refresh();
  }

  return (
    <Modal onClose={onClose} width={420}>
      <ModalHeader title="Perfil" onClose={onClose} />
      <NomeSection user={user} onUpdated={handleUpdated} />
      <EmailSection user={user} onUpdated={handleUpdated} />
      <RiotIdSection user={user} onUpdated={handleUpdated} />
      <SenhaSection />
    </Modal>
  );
}
