import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { TeamMatchParticipant, TeamMatchSummary } from '@callout/shared';
import { MIN_TEAM_MATCH_PLAYERS } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';

function resultColor(result: TeamMatchParticipant['result']): string {
  return result === 'V' ? WIN : result === 'D' ? LOSS : DRAW;
}

function fmtRr(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return String(abs);
}

function ParticipantRow({ p }: { p: TeamMatchParticipant }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr 90px 50px 50px 50px',
        gap: 10,
        alignItems: 'center',
        padding: '8px 0',
        borderTop: '1px solid var(--divider)',
        fontSize: 12.5,
      }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', color: resultColor(p.result) }}>{p.result}</span>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.name} <span style={{ color: 'var(--text-faint)' }}>· {p.agent}</span>
        {p.mvp && (
          <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', color: '#E8B339', background: 'color-mix(in srgb, #E8B339 18%, transparent)' }}>
            MVP
          </span>
        )}
        {p.ace && (
          <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', color: '#A78BFA', background: 'color-mix(in srgb, #A78BFA 18%, transparent)' }}>
            ACE
          </span>
        )}
      </span>
      <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{p.kda}</span>
      <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{p.acs} ACS</span>
      <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{p.hsPercent}% HS</span>
      <span style={{ fontWeight: 600, textAlign: 'right', color: p.rr === null ? 'var(--text-faint)' : p.rr >= 0 ? WIN : LOSS }}>
        {p.rr === null ? '—' : fmtRr(p.rr)}
      </span>
    </div>
  );
}

function TeamMatchCard({ match }: { match: TeamMatchSummary }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{match.map}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{match.playedAtLabel}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Placar {match.score}</div>
      <div style={{ marginTop: 8 }}>
        {match.participants.map((p) => (
          <ParticipantRow key={p.userId} p={p} />
        ))}
      </div>
    </div>
  );
}

export function TeamMatches() {
  const navigate = useNavigate();
  const { teamMatches, teamMatchesError, teamMatchesLoading, loadTeamMatches } = useOutletContext<OutletContext>();

  useEffect(() => {
    if (teamMatches === null && !teamMatchesLoading) loadTeamMatches();
  }, [teamMatches, teamMatchesLoading, loadTeamMatches]);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <button
          onClick={() => navigate('/time')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 10 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar pro time
        </button>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Histórico de partidas do time</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          Só partidas com pelo menos {MIN_TEAM_MATCH_PLAYERS} membros do time juntos — os números de cada um aparecem separados.
        </div>
      </div>

      {teamMatchesError ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{teamMatchesError}</div>
          <button className="btn-secondary" onClick={loadTeamMatches}>
            Tentar de novo
          </button>
        </div>
      ) : teamMatches === null ? (
        <LoadingFill />
      ) : teamMatches.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nenhuma partida ainda com {MIN_TEAM_MATCH_PLAYERS}+ membros do time juntos.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {teamMatches.map((m) => (
            <TeamMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
