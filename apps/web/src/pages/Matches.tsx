import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { MatchDetail, RecentMatchSummary } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { AgentAvatar } from '../components/AgentAvatar';
import { apiFetch } from '../lib/api';
import { cardStyle, WIN, LOSS, DRAW } from '../components/statsPrimitives';

const RESULT_LABEL: Record<RecentMatchSummary['result'], string> = { V: 'VITÓRIA', D: 'DERROTA', E: 'EMPATE' };

function resultColor(result: RecentMatchSummary['result']): string {
  return result === 'V' ? WIN : result === 'D' ? LOSS : DRAW;
}

function fmtRr(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return String(abs);
}

const SCORE_COLUMNS = '1fr 100px 54px 42px 42px 42px 54px';

// Detalhe de uma partida — carregado sob demanda no primeiro expandir de
// cada linha (MatchCard abaixo). ADR/first bloods/clutches/plants não têm
// onde entrar na linha compacta (nem no histórico do time), então ficam
// aqui em cima da tabela cheia de jogadores, junto com a barra de rounds.
function MatchDetailPanel({ detail }: { detail: MatchDetail }) {
  const myStats = [
    { label: 'ADR', value: String(detail.myStats.adr) },
    { label: 'First bloods', value: String(detail.myStats.firstBloods) },
    { label: 'Clutches', value: `${detail.myStats.clutchesWon}/${detail.myStats.clutchesPlayed}` },
    { label: 'Plants', value: String(detail.myStats.plants) },
  ];

  return (
    <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '14px 0 12px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {myStats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 12, borderLeft: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{s.label}</span>
              <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{s.value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {detail.rounds.map((r) => (
            <div key={r.number} style={{ width: 7, borderRadius: 2, height: 18, background: r.wonBySelf ? WIN : 'var(--bar-dim)' }} />
          ))}
        </div>
      </div>

      <div className="scroll-x-mobile">
        <div style={{ display: 'grid', gridTemplateColumns: SCORE_COLUMNS, gap: 8, padding: '4px 0 6px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
          <span>JOGADOR · AGENTE</span>
          <span />
          <span style={{ textAlign: 'right' }}>ACS</span>
          <span style={{ textAlign: 'right' }}>K</span>
          <span style={{ textAlign: 'right' }}>D</span>
          <span style={{ textAlign: 'right' }}>A</span>
          <span style={{ textAlign: 'right' }}>HS%</span>
        </div>
        {detail.players.map((p) => (
          <div
            key={p.puuid}
            style={{
              display: 'grid',
              gridTemplateColumns: SCORE_COLUMNS,
              gap: 8,
              alignItems: 'center',
              padding: '8px 0',
              borderTop: '1px solid var(--divider)',
              fontSize: 12.5,
              background: p.isSelf ? 'color-mix(in srgb, var(--acc, #EF4958) 9%, transparent)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: p.side === 'own' ? 'var(--acc, #EF4958)' : 'var(--text-faint)', flex: 'none' }} />
              <AgentAvatar agent={p.agent} size={22} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.side === 'own' ? 'var(--text)' : 'var(--text-muted)', fontWeight: p.isSelf ? 600 : 400 }}>
                {p.name}
                <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-faint)' }}>{p.tag}</span>
              </span>
            </div>
            <span />
            <div style={{ textAlign: 'right' }}>{p.acs}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.kills}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.deaths}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.assists}</div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.hsPercent}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cada partida é uma linha só, clicável — igual o histórico de partidas do
// time. O detalhe completo (10 jogadores, ADR, clutches etc.) só é buscado
// na primeira vez que a linha expande, e fica em cache no estado do
// componente pra não refazer a chamada ao recolher/expandir de novo.
function MatchCard({ m }: { m: RecentMatchSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color = resultColor(m.result);

  function toggle() {
    setExpanded((v) => !v);
    if (!detail && !loading) {
      setLoading(true);
      setError(null);
      apiFetch<MatchDetail>(`/matches/${m.id}`)
        .then(setDetail)
        .catch(() => setError('Não foi possível carregar essa partida.'))
        .finally(() => setLoading(false));
    }
  }

  return (
    <div style={{ ...cardStyle, border: `1px solid color-mix(in srgb, ${color} 50%, var(--surface-border))`, overflow: 'hidden' }}>
      <button
        onClick={toggle}
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
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color, flex: 'none' }}>{RESULT_LABEL[m.result]}</span>
        <AgentAvatar agent={m.agent} size={26} />
        <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>{m.map}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Placar {m.score}</span>
        {m.mvp && (
          <span style={{ fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', color: '#E8B339', background: 'color-mix(in srgb, #E8B339 18%, transparent)', flex: 'none' }}>
            MVP
          </span>
        )}
        {m.ace && (
          <span style={{ fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', color: '#A78BFA', background: 'color-mix(in srgb, #A78BFA 18%, transparent)', flex: 'none' }}>
            ACE
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flex: 'none' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: m.rr === null ? 'var(--text-faint)' : m.rr >= 0 ? WIN : LOSS }}>{m.rr === null ? '—' : fmtRr(m.rr)}</span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m.playedAtLabel}</span>
        </span>
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
          {loading ? (
            <div style={{ padding: '16px 18px', fontSize: 12.5, color: 'var(--text-faint)', borderTop: '1px solid var(--divider)' }}>Carregando…</div>
          ) : error ? (
            <div style={{ padding: '16px 18px', fontSize: 12.5, color: 'var(--text-3)', borderTop: '1px solid var(--divider)' }}>{error}</div>
          ) : detail ? (
            <MatchDetailPanel detail={detail} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Lista das últimas 7 partidas — reaproveita o mesmo /dashboard já
// carregado pelo AppShell (recentMatches), sem fetch próprio. Cada linha
// expande no lugar (MatchCard acima), sem navegar pra outra página.
export function Matches() {
  const { dashboard: data, dashboardError: error, dashboardLoading: loading, reloadDashboard } = useOutletContext<OutletContext>();

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Partidas</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>Suas últimas partidas — clique numa pra ver os detalhes</div>
      </div>

      {loading ? (
        <LoadingFill />
      ) : error && !data ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{error}</div>
          <button className="btn-secondary" onClick={reloadDashboard}>
            Tentar de novo
          </button>
        </div>
      ) : !data || data.recentMatches.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Nenhuma partida sincronizada ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.recentMatches.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
