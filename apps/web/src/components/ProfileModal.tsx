import { useRef, useState } from 'react';
import { Camera, Swords } from 'lucide-react';
import type { SessionUser } from '@callout/shared';
import { Modal, ModalHeader } from './Modal';
import { PasswordField } from './PasswordField';
import { PasswordRequirements } from './PasswordRequirements';
import { useSession } from '../lib/session';
import { apiFetch, ApiError } from '../lib/api';
import { senhaValida } from '../lib/senha';
import { compressImageToDataUrl } from '../lib/imageCompress';
import { AGENT_ICONS } from '../lib/agentImages';

const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// Coluna do modal (retangular, 4 colunas lado a lado em telas largas --
// ver .profile-modal-grid/.profile-col no index.css, que empilha em telas
// estreitas). Só o título + espaçamento; a divisória entre colunas é toda
// via CSS, não aqui.
function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="profile-col">
      <div style={{ fontSize: 11.5, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 18 }}>{title.toUpperCase()}</div>
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

// Avatar redondo com overlay de câmera no hover — mesmo padrão de
// MemberAvatar (EquipeConfiguracoes.tsx), aqui pro próprio usuário editar
// direto no modal de Perfil. Salva na hora (não espera o botão "Salvar" da
// coluna de perfil, que é só pra displayName/exibirRiotIdComoNome).
function AvatarPicker({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAgents, setShowAgents] = useState(false);

  async function saveAvatarUrl(avatarUrl: string) {
    setUploading(true);
    setError(null);
    try {
      const updated = await apiFetch<SessionUser>('/me/perfil', { method: 'PATCH', body: JSON.stringify({ avatarUrl }) });
      onUpdated(updated);
      setShowAgents(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao trocar a foto.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await compressImageToDataUrl(file);
    await saveAvatarUrl(dataUrl);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 22 }}>
      <div
        className="hover-reveal"
        style={{
          position: 'relative',
          width: 88,
          height: 88,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--avatar-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-muted)',
        }}
      >
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(user.nome)}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Trocar foto"
          className="hover-reveal-target"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.55)',
            border: 'none',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: 0,
            transition: 'opacity .12s ease',
            color: '#fff',
          }}
        >
          <Camera size={18} strokeWidth={1.75} />
        </button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </div>

      <button
        type="button"
        onClick={() => setShowAgents((v) => !v)}
        disabled={uploading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--acc, #EF4958)', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
        <Swords size={13} strokeWidth={1.75} />
        {showAgents ? 'Ocultar agentes' : 'Usar um agente'}
      </button>

      {showAgents && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxHeight: 160, overflowY: 'auto', padding: '2px 2px 4px' }}>
          {AGENT_ICONS.map((a) => (
            <button
              key={a.url}
              type="button"
              title={a.name}
              onClick={() => saveAvatarUrl(a.url)}
              disabled={uploading}
              style={{
                width: 34,
                height: 34,
                flex: 'none',
                padding: 0,
                borderRadius: 9,
                overflow: 'hidden',
                border: user.avatarUrl === a.url ? '2px solid var(--acc, #EF4958)' : '1px solid var(--surface-border)',
                background: '#141415',
                cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <img src={a.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      <ErrorMsg text={error} />
    </div>
  );
}

// --- Coluna 1: imagem + nome/preferência de exibição ---
function PerfilColumn({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
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
    <Column title="Perfil">
      <AvatarPicker user={user} onUpdated={onUpdated} />
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
    </Column>
  );
}

// --- Coluna 2: troca de email ---
function EmailColumn({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
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
    <Column title="Email">
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
    </Column>
  );
}

// --- Coluna 3: troca de RiotID ---
function RiotIdColumn({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
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
    <Column title="RiotID">
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
    </Column>
  );
}

// --- Coluna 4: troca de senha ---
function SenhaColumn() {
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
    <Column title="Senha">
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
    </Column>
  );
}

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useSession();
  if (!user) return null;

  async function handleUpdated() {
    await refresh();
  }

  return (
    <Modal onClose={onClose} width={1311} padding={34} closeOnBackdrop={false}>
      <ModalHeader title="Perfil" onClose={onClose} />
      <div className="profile-modal-grid">
        <PerfilColumn user={user} onUpdated={handleUpdated} />
        <EmailColumn user={user} onUpdated={handleUpdated} />
        <RiotIdColumn user={user} onUpdated={handleUpdated} />
        <SenhaColumn />
      </div>
    </Modal>
  );
}
