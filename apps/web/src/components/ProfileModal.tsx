import { useRef, useState } from 'react';
import { Camera, Swords } from 'lucide-react';
import type { SessionUser } from '@callout/shared';
import { Modal, ModalHeader } from './Modal';
import { SaveButton } from './SaveButton';
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

// Rótulo pequeno em caixa alta acima de um campo -- "NOME DE EXIBIÇÃO",
// "MOSTRAR NO TIME COMO" -- só a coluna esquerda usa (layout novo de
// 21/09/2026).
function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 10.5, letterSpacing: '.08em', color: 'var(--text-dim)', marginBottom: 7, ...style }}>{children}</div>;
}

// Seção da coluna direita -- rótulo + status na mesma linha (ex.: "Email
// atual: fulano@..."), conteúdo embaixo, divisória no fim (menos na
// última). Layout novo de 21/09/2026 -- antes cada uma tinha seu título em
// caixa alta separado num "profile-col" próprio, lado a lado.
function FieldSection({ label, status, children, last }: { label: string; status?: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 22, marginBottom: last ? 0 : 22, borderBottom: last ? 'none' : '1px solid var(--surface-border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{label}</span>
        {status && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</span>}
      </div>
      {children}
    </div>
  );
}

function ErrorMsg({ text }: { text: string | null }) {
  if (!text) return null;
  return <div style={{ fontSize: 12.5, color: 'var(--acc, #EF4958)', marginTop: 8 }}>{text}</div>;
}

// Avatar (quadrado arredondado, não mais círculo — layout novo) com overlay
// de câmera no hover, nome/RiotID ao lado e o link "Usar um agente" logo
// abaixo -- tudo numa linha (avatar à esquerda, texto à direita), pedido de
// 21/09/2026. Salva na hora (não espera o botão "Salvar perfil", que é só
// pra displayName/exibirRiotIdComoNome).
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
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          className="hover-reveal"
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            flex: 'none',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'var(--avatar-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
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
            <Camera size={16} strokeWidth={1.75} />
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 3, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nome}</div>
          {user.riotId && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {user.riotId.name}#{user.riotId.tag}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAgents((v) => !v)}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--acc, #EF4958)', fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 3 }}
          >
            <Swords size={12} strokeWidth={1.75} />
            {showAgents ? 'Ocultar agentes' : 'Usar um agente'}
          </button>
        </div>
      </div>

      {showAgents && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12, maxHeight: 160, overflowY: 'auto', padding: '2px 2px 4px' }}>
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

// --- Coluna esquerda: imagem + nome/preferência de exibição ---
function PerfilColumn({ user, onUpdated }: { user: SessionUser; onUpdated: (u: SessionUser) => void }) {
  const [nome, setNome] = useState(user.displayName ?? '');
  const [exibirRiotId, setExibirRiotId] = useState(user.exibirRiotIdComoNome);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSalvar() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await apiFetch<SessionUser>('/me/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: nome, exibirRiotIdComoNome: exibirRiotId }),
      });
      onUpdated(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-col-left">
      <AvatarPicker user={user} onUpdated={onUpdated} />

      <FieldLabel>NOME DE EXIBIÇÃO</FieldLabel>
      <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" disabled={saving} />

      {user.riotId && (
        <>
          <FieldLabel style={{ marginTop: 18 }}>MOSTRAR NO TIME COMO</FieldLabel>
          <div style={{ display: 'flex', gap: 6, background: 'var(--control-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
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
        </>
      )}

      {/* Empurra o botão pra base da coluna, mesmo com a direita mais alta
          (só faz efeito porque .profile-col-left é display:flex column). */}
      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 18, marginTop: 18 }}>
        <SaveButton
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleSalvar}
          saving={saving}
          success={success}
          onSuccessTimeout={() => setSuccess(false)}
          label="Salvar perfil"
        />
        <ErrorMsg text={error} />
      </div>
    </div>
  );
}

// --- Direita, seção 1: troca de email ---
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
    <FieldSection label="Email" status={!pendente ? `atual: ${user.email}` : undefined}>
      {!pendente ? (
        <>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input-field" style={{ flex: 1, minWidth: 0 }} type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="Novo email" disabled={enviando} />
            <button className="btn-secondary" style={{ flex: 'none' }} onClick={handleSolicitar} disabled={enviando || !novoEmail}>
              {enviando ? 'Enviando…' : 'Trocar email'}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>Enviamos um link de confirmação para o novo endereço.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--pos, #18AAB7)', marginBottom: 8 }}>✓ Código enviado pra {emailAlvo} — confere a caixa de entrada.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input-field"
              style={{ flex: 1, minWidth: 0, letterSpacing: '.3em', textAlign: 'center', fontSize: 18 }}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
            />
            <button className="btn-secondary" style={{ flex: 'none' }} onClick={handleConfirmar} disabled={confirmando || codigo.length !== 6}>
              {confirmando ? 'Confirmando…' : 'Confirmar troca'}
            </button>
          </div>
        </>
      )}
      <ErrorMsg text={error} />
    </FieldSection>
  );
}

// --- Direita, seção 2: troca de RiotID ---
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
    <FieldSection label="RiotID" status={!pendente ? `atual: ${user.riotId ? `${user.riotId.name}#${user.riotId.tag}` : '—'}` : undefined}>
      {!pendente ? (
        <>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input-field" style={{ flex: 1, minWidth: 0 }} value={novoRiotId} onChange={(e) => setNovoRiotId(e.target.value)} placeholder="Novo RiotID — nome#tag" disabled={gerando} />
            <button className="btn-secondary" style={{ flex: 'none' }} onClick={handleSolicitar} disabled={gerando || !novoRiotId}>
              {gerando ? 'Gerando código…' : 'Trocar RiotID'}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>As partidas antigas continuam vinculadas à conta.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>
            Troca a tag da conta <strong style={{ color: 'var(--text)' }}>{riotNameAlvo}</strong> pra:
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 24, letterSpacing: '.1em', padding: '8px 0' }}>{codigo ?? '····'}</div>
          <button className="btn-secondary" onClick={handleConfirmar} disabled={confirmando}>
            {confirmando ? 'Confirmando…' : 'Já troquei, confirmar'}
          </button>
        </>
      )}
      <ErrorMsg text={error} />
    </FieldSection>
  );
}

// --- Direita, seção 3: troca de senha ---
function SenhaSection() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSalvar() {
    setError(null);
    setSuccess(false);
    if (!senhaAtual) return setError('Digita sua senha atual.');
    if (!senhaValida(novaSenha)) return setError('A senha nova ainda não atende todos os requisitos.');
    if (novaSenha !== confirmarNovaSenha) return setError('As senhas não coincidem.');

    setSaving(true);
    try {
      await apiFetch('/me/senha', { method: 'PATCH', body: JSON.stringify({ senhaAtual, novaSenha, confirmarNovaSenha }) });
      setSuccess(true);
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
    <FieldSection label="Senha" last>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PasswordField value={senhaAtual} onChange={setSenhaAtual} placeholder="Senha atual" disabled={saving} autoComplete="current-password" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PasswordField value={novaSenha} onChange={setNovaSenha} placeholder="Senha nova" disabled={saving} autoComplete="new-password" />
          </div>
        </div>
        {novaSenha.length > 0 && <PasswordRequirements senha={novaSenha} />}
        <PasswordField value={confirmarNovaSenha} onChange={setConfirmarNovaSenha} placeholder="Confirmar senha nova" disabled={saving} autoComplete="new-password" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <SaveButton
            onClick={handleSalvar}
            saving={saving}
            success={success}
            onSuccessTimeout={() => setSuccess(false)}
            label="Alterar senha"
            savingLabel="Alterando"
            successLabel="Alterada"
          />
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Mínimo de 8 caracteres, com um número.</span>
        </div>
      </div>
      <ErrorMsg text={error} />
    </FieldSection>
  );
}

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useSession();
  if (!user) return null;

  async function handleUpdated() {
    await refresh();
  }

  return (
    <Modal onClose={onClose} width={880} padding={34} closeOnBackdrop={false}>
      <ModalHeader title="Perfil" subtitle="Como você aparece no time e os dados de acesso da conta." onClose={onClose} />
      <div className="profile-modal-grid">
        <PerfilColumn user={user} onUpdated={handleUpdated} />
        <div className="profile-col-right">
          <EmailSection user={user} onUpdated={handleUpdated} />
          <RiotIdSection user={user} onUpdated={handleUpdated} />
          <SenhaSection />
        </div>
      </div>
    </Modal>
  );
}
