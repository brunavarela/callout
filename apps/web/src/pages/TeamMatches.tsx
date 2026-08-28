import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, BarChart3, ChevronRight } from 'lucide-react';
import type { TeamMatchParticipant, TeamMatchSummary } from '@callout/shared';
import { MIN_TEAM_MATCH_PLAYERS } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { AgentAvatar } from '../components/AgentAvatar';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';

// Colunas compartilhadas pelo cabeçalho e pelas linhas — dá bastante espaço
// pra cada estatística respirar em vez de ficarem todas espremidas na
// borda direita (o nome do jogador é a única coluna flexível).
const PARTICIPANT_COLUMNS = '28px minmax(140px, 1fr) 110px 90px 90px 70px';

const RESULT_LABEL: Record<TeamMatchParticipant['result'], string> = { V: 'VITÓRIA', D: 'DERROTA', E: 'EMPATE' };

function resultColor(result: TeamMatchParticipant['result']): string {
  return result === 'V' ? WIN : result === 'D' ? LOSS : DRAW;
}

function fmtRr(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return String(abs);
}

function ParticipantHeader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: PARTICIPANT_COLUMNS, gap: 20, padding: '4px 0 6px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
      <span />
      <span>JOGADOR · AGENTE</span>
      <span style={{ textAlign: 'right' }}>K/D/A</span>
      <span style={{ textAlign: 'right' }}>ACS</span>
      <span style={{ textAlign: 'right' }}>HS%</span>
      <span style={{ textAlign: 'right' }}>RR</span>
    </div>
  );
}

function ParticipantRow({ p }: { p: TeamMatchParticipant }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: PARTICIPANT_COLUMNS, gap: 20, alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--divider)', fontSize: 12.5 }}>
      <AgentAvatar agent={p.agent} size={26} />
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
      <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{p.kda}</span>
      <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{p.acs}</span>
      <span style={{ color: 'var(--text-2)', textAlign: 'right' }}>{p.hsPercent}%</span>
      <span style={{ fontWeight: 600, textAlign: 'right', color: p.rr === null ? 'var(--text-faint)' : p.rr >= 0 ? WIN : LOSS }}>
        {p.rr === null ? '—' : fmtRr(p.rr)}
      </span>
    </div>
  );
}

// Cada partida é uma linha só (mapa + placar + data), clicável — expande
// pra mostrar os números de cada um, recolhe de novo no segundo clique.
function TeamMatchCard({ match }: { match: TeamMatchSummary }) {
  const [expanded, setExpanded] = useState(false);
  // Todo mundo rastreado nessa partida é do mesmo lado (é assim que a
  // partida qualifica pro histórico do time), então o resultado do
  // primeiro participante já vale pra partida inteira.
  const result = match.participants[0]?.result ?? 'E';
  const color = resultColor(result);

  return (
    <div style={{ ...cardStyle, border: `1px solid color-mix(in srgb, ${color} 50%, var(--surface-border))`, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <ChevronRight size={15} strokeWidth={2} style={{ flex: 'none', color: 'var(--text-faint)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color }}>{RESULT_LABEL[result]}</span>
        <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{match.map}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Placar {match.score}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-dim)', flex: 'none' }}>{match.playedAtLabel}</span>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transition: 'grid-template-rows .28s ease, opacity .22s ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--divider)' }}>
            <ParticipantHeader />
            {match.participants.map((p) => (
              <ParticipantRow key={p.userId} p={p} />
            ))}
          </div>
        </div>
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
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
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/time/painel')}>
          <BarChart3 size={15} strokeWidth={1.75} />
          Painel do time
        </button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {teamMatches.map((m) => (
            <TeamMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
