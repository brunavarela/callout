import { useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Copy, Eye, EyeOff, MoreVertical, Pencil, Shield, ShieldOff, Trash2 } from 'lucide-react';
import type { Cargo, MembroEquipeCard } from '@callout/shared';
import { apiFetch, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { ConfirmModal } from '../components/ConfirmModal';
import { MembroConfiguracoesModal } from '../components/MembroConfiguracoesModal';
import { compressImageToDataUrl } from '../lib/imageCompress';
import { CARGO_LABEL, CARGO_OPTIONS } from '../lib/cargo';
import { MainAgentIcons } from '../components/MainAgentIcons';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// Avatar redondo com overlay de câmera no hover — só quando `editable`
// (dono do próprio perfil). Clique abre o seletor de arquivo; upload
// comprime no navegador (mesmo padrão de Spot.imagens) e salva via
// PATCH /me/perfil.
function MemberAvatar({ member, editable, onUploaded }: { member: MembroEquipeCard; editable: boolean; onUploaded: (dataUrl: string) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      await onUploaded(dataUrl);
    } catch {
      // falha silenciosa — avatar volta a mostrar o valor anterior
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--avatar-bg)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}
      className={editable ? 'hover-reveal' : undefined}
    >
      {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(member.name)}
      {editable && (
        <>
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
            <Camera size={14} strokeWidth={2} />
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
        </>
      )}
    </div>
  );
}

// Texto com lápis discreto no hover — usado pro "Nome" (dono do perfil).
// `renderEditor` decide o controle (input); salvar/cancelar é
// responsabilidade de quem chama (blur/Enter/Escape do próprio input).
function EditableCell({
  value,
  editable,
  editing,
  onStartEdit,
  renderEditor,
}: {
  value: string;
  editable: boolean;
  editing: boolean;
  onStartEdit: () => void;
  renderEditor: () => React.ReactNode;
}) {
  if (editing) return <>{renderEditor()}</>;
  return (
    <div className={editable ? 'hover-reveal' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      {editable && (
        <button
          type="button"
          onClick={onStartEdit}
          className="hover-reveal-target"
          title="Editar"
          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .12s ease', flex: 'none' }}
        >
          <Pencil size={12} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

function MemberMenu({
  member,
  onToggleAdmin,
  onRemove,
}: {
  member: MembroEquipeCard;
  onToggleAdmin: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4, display: 'flex' }}
        title="Mais opções"
      >
        <MoreVertical size={16} strokeWidth={1.75} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 4,
              zIndex: 41,
              width: 190,
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,.35)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onToggleAdmin();
              }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
            >
              {member.isAdmin ? <ShieldOff size={14} strokeWidth={1.75} /> : <Shield size={14} strokeWidth={1.75} />}
              {member.isAdmin ? 'Remover admin' : 'Tornar admin'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: 'none', border: 'none', color: 'var(--acc, #EF4958)', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--divider)' }}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Excluir membro
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// `minmax(piso, 1fr)` — cada coluna nunca fica menor que o próprio
// conteúdo, e o espaço sobrando na linha é dividido em partes iguais
// entre elas (preenche a largura toda, sem empilhar tudo à esquerda nem
// esticar uma coluna mais que as outras). Mesmo espaçamento da tela
// inicial (Equipe.tsx), só com a coluna dos 3 pontinhos a mais no final.
const ROW_COLUMNS = '36px minmax(140px,1fr) 90px minmax(120px,1fr) minmax(150px,1fr) minmax(140px,1fr) minmax(90px,1fr) 32px';
const ROW_GAP = 28;

export function EquipeConfiguracoes() {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const { equipe, equipeError, reloadEquipe, agents, loadAgents } = useOutletContext<OutletContext>();

  const [editingNameUserId, setEditingNameUserId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [editingCargoUserId, setEditingCargoUserId] = useState<string | null>(null);
  const [funcaoModalMember, setFuncaoModalMember] = useState<MembroEquipeCard | null>(null);

  const [confirmRemove, setConfirmRemove] = useState<MembroEquipeCard | null>(null);
  const [confirmToggleAdmin, setConfirmToggleAdmin] = useState<MembroEquipeCard | null>(null);
  const [confirmDeleteEquipe, setConfirmDeleteEquipe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingEquipeInfo, setEditingEquipeInfo] = useState(false);
  const [nomeDraft, setNomeDraft] = useState('');
  const [descricaoDraft, setDescricaoDraft] = useState('');
  const equipeImageInputRef = useRef<HTMLInputElement>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);

  const self = equipe?.members.find((m) => m.isSelf) ?? null;
  const isAdmin = self?.isAdmin ?? false;

  async function saveOwnAvatar(dataUrl: string) {
    await apiFetch('/me/perfil', { method: 'PATCH', body: JSON.stringify({ avatarUrl: dataUrl }) });
    await reloadEquipe();
  }

  async function saveOwnName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setEditingNameUserId(null);
      return;
    }
    try {
      await apiFetch('/me/perfil', { method: 'PATCH', body: JSON.stringify({ displayName: trimmed }) });
      await reloadEquipe();
    } catch {
      // falha silenciosa — nome volta a mostrar o valor anterior
    } finally {
      setEditingNameUserId(null);
    }
  }

  async function saveCargo(userId: string, cargo: Cargo) {
    setEditingCargoUserId(null);
    try {
      await apiFetch(`/equipe/membros/${userId}/cargo`, { method: 'PATCH', body: JSON.stringify({ cargo }) });
      await reloadEquipe();
    } catch {
      // falha silenciosa — cargo volta a mostrar o valor anterior
    }
  }

  async function handleToggleAdmin() {
    if (!confirmToggleAdmin) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/equipe/membros/${confirmToggleAdmin.userId}/admin`, { method: 'PATCH', body: JSON.stringify({ isAdmin: !confirmToggleAdmin.isAdmin }) });
      await reloadEquipe();
      setConfirmToggleAdmin(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao salvar. Tenta de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember() {
    if (!confirmRemove) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/equipe/membros/${confirmRemove.userId}`, { method: 'DELETE' });
      await reloadEquipe();
      setConfirmRemove(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao remover. Tenta de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEquipe() {
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch('/equipe', { method: 'DELETE' });
      await refresh();
      navigate('/login/equipe');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao excluir. Tenta de novo.');
      setBusy(false);
    }
  }

  async function saveEquipeInfo() {
    try {
      await apiFetch('/equipe', { method: 'PATCH', body: JSON.stringify({ nome: nomeDraft.trim(), descricao: descricaoDraft }) });
      await reloadEquipe();
      setEditingEquipeInfo(false);
    } catch {
      // fica em modo de edição com o rascunho — usuário tenta salvar de novo
    }
  }

  async function handleEquipeImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      await apiFetch('/equipe', { method: 'PATCH', body: JSON.stringify({ imagemUrl: dataUrl }) });
      await reloadEquipe();
    } catch {
      // falha silenciosa — imagem volta a mostrar o valor anterior
    }
  }

  async function handleCopyCode() {
    if (!equipe?.codigoConvite) return;
    try {
      await navigator.clipboard.writeText(equipe.codigoConvite);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // clipboard indisponível — código continua visível pra copiar à mão
    }
  }

  if (equipeError && !equipe) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{equipeError}</div>
          <button className="btn-secondary" onClick={reloadEquipe}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!equipe) {
    return (
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
        <LoadingFill />
      </div>
    );
  }

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <button
          onClick={() => navigate('/equipe')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 10 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar pra equipe
        </button>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Configurações da equipe</h1>
      </div>

      {/* Imagem, nome e descrição — só admin edita */}
      <div style={{ ...cardStyle, padding: 22, display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          className={isAdmin ? 'hover-reveal' : undefined}
          style={{ position: 'relative', width: 64, height: 64, borderRadius: 16, overflow: 'hidden', background: 'var(--avatar-bg)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--text-muted)' }}
        >
          {equipe.imagemUrl ? <img src={equipe.imagemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(equipe.name)}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => equipeImageInputRef.current?.click()}
                className="hover-reveal-target"
                title="Trocar imagem da equipe"
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.55)', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity .12s ease', color: '#fff' }}
              >
                <Camera size={18} strokeWidth={2} />
              </button>
              <input ref={equipeImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEquipeImage} />
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {editingEquipeInfo ? (
            <>
              <input className="input-field" value={nomeDraft} onChange={(e) => setNomeDraft(e.target.value)} placeholder="Nome da equipe" maxLength={60} />
              <textarea
                className="input-field"
                value={descricaoDraft}
                onChange={(e) => setDescricaoDraft(e.target.value)}
                placeholder="Descrição da equipe (opcional)"
                rows={3}
                maxLength={500}
                style={{ resize: 'vertical', fontFamily: 'Inter,sans-serif' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setEditingEquipeInfo(false)} style={{ fontSize: 12.5 }}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={saveEquipeInfo} style={{ fontSize: 12.5 }}>
                  Salvar
                </button>
              </div>
            </>
          ) : (
            <div className={isAdmin ? 'hover-reveal' : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 20 }}>{equipe.name}</div>
                {isAdmin && (
                  <button
                    type="button"
                    className="hover-reveal-target"
                    onClick={() => {
                      setNomeDraft(equipe.name);
                      setDescricaoDraft(equipe.descricao);
                      setEditingEquipeInfo(true);
                    }}
                    title="Editar nome e descrição"
                    style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex', flex: 'none', opacity: 0, transition: 'opacity .12s ease' }}
                  >
                    <Pencil size={13} strokeWidth={1.75} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>{equipe.descricao || 'Sem descrição ainda.'}</div>
            </div>
          )}
        </div>

        {isAdmin && equipe.codigoConvite && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'monospace', letterSpacing: '.04em' }}
              onClick={() => setCodeVisible((v) => !v)}
              title={codeVisible ? 'Ocultar código de convite' : 'Mostrar código de convite'}
            >
              {codeVisible ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              {codeVisible ? equipe.codigoConvite : '••••••••'}
            </button>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', padding: '11px' }} onClick={handleCopyCode} title="Copiar código de convite">
              {copiedCode ? <Check size={15} strokeWidth={1.75} /> : <Copy size={15} strokeWidth={1.75} />}
            </button>
          </div>
        )}
      </div>

      {/* Membros */}
      <div style={{ ...cardStyle, padding: '18px 20px' }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Membros</div>
        <div className="scroll-x-mobile">
          <div style={{ minWidth: 1000 }}>
            <div style={{ display: 'grid', gridTemplateColumns: ROW_COLUMNS, gap: ROW_GAP, padding: '0 0 8px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
              <span />
              <span>NOME</span>
              <span>AGENTES</span>
              <span>APELIDO</span>
              <span>CARGO</span>
              <span>FUNÇÃO</span>
              <span>ENTROU EM</span>
              <span />
            </div>
            {equipe.members.map((m) => (
              <div key={m.userId} style={{ display: 'grid', gridTemplateColumns: ROW_COLUMNS, gap: ROW_GAP, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--divider)', fontSize: 13 }}>
                <MemberAvatar member={m} editable={m.isSelf} onUploaded={saveOwnAvatar} />

                <EditableCell
                  value={m.name}
                  editable={m.isSelf}
                  editing={editingNameUserId === m.userId}
                  onStartEdit={() => {
                    setNameDraft(m.name);
                    setEditingNameUserId(m.userId);
                  }}
                  renderEditor={() => (
                    <input
                      autoFocus
                      className="input-field"
                      style={{ padding: '5px 8px', fontSize: 13 }}
                      value={nameDraft}
                      maxLength={60}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={() => saveOwnName(nameDraft)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveOwnName(nameDraft);
                        if (e.key === 'Escape') setEditingNameUserId(null);
                      }}
                    />
                  )}
                />

                <MainAgentIcons agents={m.mainAgents} />

                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.riotIdLabel ?? '—'}</span>

                {editingCargoUserId === m.userId ? (
                  <select
                    autoFocus
                    className="input-field"
                    style={{ padding: '5px 8px', fontSize: 13 }}
                    value={m.cargo}
                    onChange={(e) => saveCargo(m.userId, e.target.value as Cargo)}
                    onBlur={() => setEditingCargoUserId(null)}
                  >
                    {CARGO_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CARGO_LABEL[c]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={isAdmin ? 'hover-reveal' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CARGO_LABEL[m.cargo]}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="hover-reveal-target"
                        onClick={() => setEditingCargoUserId(m.userId)}
                        title="Editar cargo"
                        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .12s ease', flex: 'none' }}
                      >
                        <Pencil size={12} strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                )}

                <div className={isAdmin ? 'hover-reveal' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                    {m.roles.length ? m.roles.map((r) => r[0]!.toUpperCase() + r.slice(1)).join(', ') : '—'}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="hover-reveal-target"
                      onClick={() => {
                        if (agents === null) loadAgents();
                        setFuncaoModalMember(m);
                      }}
                      title="Editar função e agentes"
                      style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0, transition: 'opacity .12s ease', flex: 'none' }}
                    >
                      <Pencil size={12} strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{m.joinedAtLabel}</span>

                {isAdmin && !m.isOwner ? (
                  <MemberMenu member={m} onToggleAdmin={() => setConfirmToggleAdmin(m)} onRemove={() => setConfirmRemove(m)} />
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zona de perigo — só admin */}
      {isAdmin && (
        <div style={{ ...cardStyle, padding: 22, border: '1px solid color-mix(in srgb, var(--acc, #EF4958) 35%, var(--surface-border))' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Excluir equipe</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Apaga a equipe pra todo mundo — estratégias, spots e vínculos de membro somem junto. Não tem como desfazer.
          </div>
          <button
            className="btn-secondary"
            style={{ marginTop: 14, color: 'var(--acc, #EF4958)', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => setConfirmDeleteEquipe(true)}
          >
            <Trash2 size={14} strokeWidth={1.75} />
            Excluir equipe
          </button>
        </div>
      )}

      {funcaoModalMember && (
        <MembroConfiguracoesModal
          member={funcaoModalMember}
          agents={agents}
          onClose={() => setFuncaoModalMember(null)}
          onSaved={() => reloadEquipe()}
        />
      )}

      {confirmToggleAdmin && (
        <ConfirmModal
          title={confirmToggleAdmin.isAdmin ? 'Remover admin?' : 'Tornar admin?'}
          message={
            confirmToggleAdmin.isAdmin
              ? `${confirmToggleAdmin.name} deixa de poder editar as configurações da equipe.`
              : `${confirmToggleAdmin.name} passa a poder editar tudo nas configurações da equipe, igual você.`
          }
          confirmLabel={confirmToggleAdmin.isAdmin ? 'Remover admin' : 'Tornar admin'}
          busy={busy}
          error={actionError}
          onConfirm={handleToggleAdmin}
          onCancel={() => {
            setConfirmToggleAdmin(null);
            setActionError(null);
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Excluir membro?"
          message={`${confirmRemove.name} sai da equipe. Estratégias e spots que já criou continuam existindo.`}
          confirmLabel="Excluir membro"
          busy={busy}
          error={actionError}
          onConfirm={handleRemoveMember}
          onCancel={() => {
            setConfirmRemove(null);
            setActionError(null);
          }}
        />
      )}

      {confirmDeleteEquipe && (
        <ConfirmModal
          title="Excluir a equipe inteira?"
          message="Apaga a equipe, os membros somem da lista, e estratégias/spots da equipe são apagados também. Não tem como desfazer."
          confirmLabel="Excluir equipe"
          busy={busy}
          error={actionError}
          onConfirm={handleDeleteEquipe}
          onCancel={() => {
            setConfirmDeleteEquipe(false);
            setActionError(null);
          }}
        />
      )}
    </div>
  );
}
