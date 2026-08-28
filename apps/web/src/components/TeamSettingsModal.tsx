import { useState } from 'react';
import { MAX_FUNCOES, MAX_MAIN_AGENTS, PLACEHOLDER_AGENTS, type AgentAsset, type Funcao, type MainAgent, type TeamMemberCard } from '@callout/shared';
import { agentImageUrl } from '../lib/agentImages';
import { apiFetch } from '../lib/api';

const FUNCOES: Array<{ key: Funcao; label: string }> = [
  { key: 'iniciador', label: 'Iniciador' },
  { key: 'duelista', label: 'Duelista' },
  { key: 'controlador', label: 'Controlador' },
  { key: 'sentinela', label: 'Sentinela' },
  { key: 'flex', label: 'Flex' },
];

interface AgentOption {
  uuid: string;
  name: string;
  color: string;
}

export function TeamSettingsModal({
  member,
  agents,
  onClose,
  onSaved,
}: {
  member: TeamMemberCard;
  agents: AgentAsset[] | null;
  onClose: () => void;
  onSaved: (roles: Funcao[], mainAgents: MainAgent[]) => void;
}) {
  const [roles, setRoles] = useState<Funcao[]>(member.roles);
  const [selectedUuids, setSelectedUuids] = useState<string[]>(member.mainAgents.map((a) => a.uuid));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentOptions: AgentOption[] =
    agents && agents.length > 0
      ? agents.map((a) => ({ uuid: a.uuid, name: a.nome, color: a.cor }))
      : PLACEHOLDER_AGENTS.map((a) => ({ uuid: a.id, name: a.name, color: a.color }));

  function toggleRole(key: Funcao) {
    setRoles((prev) => {
      if (prev.includes(key)) return prev.filter((r) => r !== key);
      if (prev.length >= MAX_FUNCOES) return prev;
      return [...prev, key];
    });
  }

  function toggleAgent(uuid: string) {
    setSelectedUuids((prev) => {
      if (prev.includes(uuid)) return prev.filter((u) => u !== uuid);
      if (prev.length >= MAX_MAIN_AGENTS) return prev;
      return [...prev, uuid];
    });
  }

  async function salvar() {
    if (roles.length === 0) {
      setError('Escolhe pelo menos uma função.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/team/members/${member.userId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ funcoes: roles, mainAgentUuids: selectedUuids }),
      });
      const mainAgents: MainAgent[] = selectedUuids
        .map((uuid) => {
          const a = agentOptions.find((o) => o.uuid === uuid);
          return a ? { uuid, name: a.name } : null;
        })
        .filter((a): a is MainAgent => a !== null);
      onSaved(roles, mainAgents);
      onClose();
    } catch {
      setError('Falha ao salvar. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          width: 420,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 22,
        }}
      >
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17 }}>Configurações de {member.name}</div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)' }}>FUNÇÃO</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
              {roles.length}/{MAX_FUNCOES}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FUNCOES.map((f) => {
              const active = roles.includes(f.key);
              const disabled = saving || (!active && roles.length >= MAX_FUNCOES);
              return (
                <button
                  key={f.key}
                  onClick={() => toggleRole(f.key)}
                  disabled={disabled}
                  style={{
                    padding: '7px 13px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    opacity: disabled && !active ? 0.4 : 1,
                    background: active ? 'var(--acc, #EF4958)' : 'var(--input-bg)',
                    color: active ? 'var(--acc-text, #141415)' : 'var(--text-muted)',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)' }}>AGENTES PRINCIPAIS</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
              {selectedUuids.length}/{MAX_MAIN_AGENTS}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {agentOptions.map((a) => {
              const active = selectedUuids.includes(a.uuid);
              const disabled = saving || (!active && selectedUuids.length >= MAX_MAIN_AGENTS);
              const imageUrl = agentImageUrl(a.name);
              return (
                <button
                  key={a.uuid}
                  title={a.name}
                  onClick={() => toggleAgent(a.uuid)}
                  disabled={disabled}
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: active ? '2px solid var(--acc, #EF4958)' : '1px solid var(--surface-border)',
                    background: imageUrl ? '#141415' : a.color,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled && !active ? 0.35 : 1,
                    padding: 0,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,.55)',
                  }}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    a.name.slice(0, 3).toUpperCase()
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div style={{ color: 'var(--neg, #EF4958)', fontSize: 12.5, marginTop: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={salvar} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
