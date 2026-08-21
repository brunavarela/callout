import { useCallback, useEffect, useState } from 'react';
import type { TeamMemberCard, TeamOverview } from '@callout/shared';
import { apiFetch, ApiError } from '../lib/api';

const cardStyle: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--surface)' };

// Escalas de visualização — não são percentuais reais, só definem quanto da
// barra enche pra faixas típicas de KDA/ACS em Valorant.
const kdaBarWidth = (kda: number) => Math.max(0, Math.min(100, (kda / 2) * 100));
const acsBarWidth = (acs: number) => Math.max(0, Math.min(100, (acs / 300) * 100));

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
        style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 12, color: 'var(--text-muted-2)', lineHeight: 1.5, cursor: 'text', minHeight: 18 }}
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
        borderTop: '1px solid rgba(255,255,255,.06)',
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

export function Team() {
  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<TeamOverview>('/team');
      setTeam(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o time.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNote(userId: string, note: string) {
    try {
      await apiFetch(`/team/members/${userId}/note`, { method: 'PATCH', body: JSON.stringify({ note }) });
      setTeam((prev) => (prev ? { ...prev, members: prev.members.map((m) => (m.userId === userId ? { ...m, note } : m)) } : prev));
    } catch {
      // falha silenciosa — o campo volta a mostrar o valor anterior na próxima carga
    }
  }

  if (loading) return <div style={{ padding: 28, color: 'var(--text-muted)' }}>Carregando…</div>;

  if (error && !team) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button className="btn-secondary" onClick={load}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 40, letterSpacing: '-.03em', margin: 0 }}>{team.name}</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted-2)', marginTop: 6 }}>
          {team.memberCount} membros · {team.matchesTogether30d} partidas juntos nos últimos 30 dias · {team.groupWinratePercent}% de winrate em grupo
        </div>
      </div>

      {team.members.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Ninguém no time ainda.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {team.members.map((p) => (
            <div key={p.userId} style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--avatar-bg)', border: '1px solid rgba(255,255,255,.1)' }} />
                <div
                  style={{
                    fontFamily: 'Inter,sans-serif',
                    fontSize: 9,
                    letterSpacing: '.1em',
                    color: p.role === 'duelista' ? 'var(--action)' : 'var(--text-muted)',
                    border: '1px solid rgba(255,255,255,.12)',
                    padding: '4px 7px',
                  }}
                >
                  {p.role.toUpperCase()}
                </div>
              </div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 22, marginTop: 16, letterSpacing: '-.01em' }}>{p.name}</div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: 'var(--text-dim)' }}>{p.rankLabel}</div>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'KDA', value: p.kda.toFixed(2).replace('.', ','), w: kdaBarWidth(p.kda) },
                  { label: 'ACS', value: String(p.acs), w: acsBarWidth(p.acs) },
                  { label: 'WR', value: `${p.winratePercent}%`, w: p.winratePercent },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 44px', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-dim)' }}>{row.label}</div>
                    <div style={{ height: 5, background: 'var(--track)' }}>
                      <div style={{ height: 5, width: `${row.w}%`, background: p.isSelf ? 'var(--action)' : 'var(--bar-dim-strong)' }} />
                    </div>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, textAlign: 'right' }}>{row.value}</div>
                  </div>
                ))}
              </div>
              <NoteEditor member={p} onSave={(note) => saveNote(p.userId, note)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
