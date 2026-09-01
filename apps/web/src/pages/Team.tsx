import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Settings, History, BarChart3, Copy, Check } from 'lucide-react';
import type { TeamMemberCard } from '@callout/shared';
import { apiFetch } from '../lib/api';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { TeamSettingsModal } from '../components/TeamSettingsModal';
import { agentImageUrl } from '../lib/agentImages';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

// Escalas de visualização — não são percentuais reais, só definem quanto da
// barra enche pra faixas típicas de KDA/ACS em Valorant.
const kdaBarWidth = (kda: number) => Math.max(0, Math.min(100, (kda / 2) * 100));
const acsBarWidth = (acs: number) => Math.max(0, Math.min(100, (acs / 300) * 100));

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function MainAgentIcons({ agents }: { agents: TeamMemberCard['mainAgents'] }) {
  if (agents.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
      {agents.map((a) => {
        const imageUrl = agentImageUrl(a.name);
        return (
          <div
            key={a.uuid}
            title={a.name}
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              overflow: 'hidden',
              flex: 'none',
              background: imageUrl ? '#141415' : 'var(--avatar-bg)',
              border: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            {imageUrl ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.name.slice(0, 2).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function NoteEditor({ member, onSave }: { member: TeamMemberCard; onSave: (note: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(member.note);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div
        onDoubleClick={() => {
          setValue(member.note);
          setEditing(true);
        }}
        title="Clique duas vezes pra editar"
        style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--surface-border)', fontSize: 12, color: 'var(--text-muted-2)', lineHeight: 1.5, cursor: 'text', minHeight: 18 }}
      >
        {member.note || 'Sem recado ainda — clique duas vezes pra escrever um.'}
      </div>
    );
  }

  return (
    <textarea
      autoFocus
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={async () => {
        setSaving(true);
        await onSave(value);
        setSaving(false);
        setEditing(false);
      }}
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid var(--surface-border)',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        background: 'transparent',
        color: 'var(--text-muted-2)',
        fontSize: 12,
        lineHeight: 1.5,
        fontFamily: 'Inter,sans-serif',
        width: '100%',
        resize: 'none',
        outline: 'none',
      }}
      rows={3}
      maxLength={280}
    />
  );
}

// Código visível pra qualquer membro (não só o dono) — mesmo espírito de
// recado/função serem editáveis por todo mundo (ver README do handoff).
function InviteCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard indisponível (http sem permissão etc.) — código continua visível pra copiar à mão
    }
  }

  return (
    <button
      className="btn-secondary"
      style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'monospace', letterSpacing: '.04em' }}
      onClick={handleCopy}
      title="Copiar código de convite"
    >
      {copied ? <Check size={15} strokeWidth={1.75} /> : <Copy size={15} strokeWidth={1.75} />}
      {copied ? 'Copiado!' : code}
    </button>
  );
}

export function Team() {
  const navigate = useNavigate();
  const { team, teamError, reloadTeam, updateTeamMemberNote, updateTeamMemberSettings, agents, loadAgents } = useOutletContext<OutletContext>();
  const [editingMember, setEditingMember] = useState<TeamMemberCard | null>(null);

  useEffect(() => {
    if (agents === null) loadAgents();
  }, [agents, loadAgents]);

  async function saveNote(userId: string, note: string) {
    try {
      await apiFetch(`/team/members/${userId}/note`, { method: 'PATCH', body: JSON.stringify({ note }) });
      updateTeamMemberNote(userId, note);
    } catch {
      // falha silenciosa — o campo volta a mostrar o valor anterior na próxima carga
    }
  }

  if (teamError && !team) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{teamError}</div>
          <button className="btn-secondary" onClick={reloadTeam}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
        <LoadingFill />
      </div>
    );
  }

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>{team.name}</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            {team.memberCount} membros · {team.matchesTogether30d} partidas juntos nos últimos 30 dias · {team.groupWinratePercent}% de winrate em grupo
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <InviteCodeButton code={team.inviteCode} />
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/time/painel')}>
            <BarChart3 size={15} strokeWidth={1.75} />
            Painel do time
          </button>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/time/partidas')}>
            <History size={15} strokeWidth={1.75} />
            Histórico de partidas
          </button>
        </div>
      </div>

      {team.members.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Ninguém no time ainda.</div>
      ) : (
        <div className="grid-responsive-4">
          {team.members.map((p) => (
            <div
              key={p.userId}
              style={{
                borderRadius: 'var(--radius-lg)',
                background: p.isSelf ? 'var(--kpi-bg, var(--surface))' : 'var(--surface)',
                border: `1px solid ${p.isSelf ? 'var(--kpi-border, var(--surface-border))' : 'var(--surface-border)'}`,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {(() => {
                  const avatarImageUrl = p.mainAgents[0] ? agentImageUrl(p.mainAgents[0].name) : null;
                  return (
                    <div
                      title={p.mainAgents[0]?.name}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        overflow: 'hidden',
                        background: 'var(--avatar-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {avatarImageUrl ? (
                        <img src={avatarImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        initialsOf(p.name)
                      )}
                    </div>
                  );
                })()}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {p.roles.map((role) => (
                    <div
                      key={role}
                      style={{
                        fontSize: 9.5,
                        letterSpacing: '.1em',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--surface-border)',
                        padding: '5px 9px',
                        whiteSpace: 'nowrap',
                        color: role === 'duelista' ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                      }}
                    >
                      {role.toUpperCase()}
                    </div>
                  ))}
                  <button
                    title="Configurações"
                    onClick={() => setEditingMember(p)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4, display: 'flex' }}
                  >
                    <Settings size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 21, marginTop: 15, letterSpacing: '-.01em' }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{p.rankLabel}</div>
              <MainAgentIcons agents={p.mainAgents} />
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { label: 'KDA', value: p.kda.toFixed(2).replace('.', ','), w: kdaBarWidth(p.kda) },
                  { label: 'ACS', value: String(p.acs), w: acsBarWidth(p.acs) },
                  { label: 'WR', value: `${p.winratePercent}%`, w: p.winratePercent },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 42px', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{row.label}</div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--track)' }}>
                      <div style={{ height: 6, borderRadius: 99, width: `${row.w}%`, background: p.isSelf ? 'var(--pos, #18AAB7)' : 'var(--bar-dim)' }} />
                    </div>
                    <div style={{ fontSize: 12, textAlign: 'right' }}>{row.value}</div>
                  </div>
                ))}
              </div>
              <NoteEditor member={p} onSave={(note) => saveNote(p.userId, note)} />
            </div>
          ))}
        </div>
      )}

      {editingMember && (
        <TeamSettingsModal
          member={editingMember}
          agents={agents}
          onClose={() => setEditingMember(null)}
          onSaved={(roles, mainAgents) => updateTeamMemberSettings(editingMember.userId, roles, mainAgents)}
        />
      )}
    </div>
  );
}
