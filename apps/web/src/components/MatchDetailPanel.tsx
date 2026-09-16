import type { MatchDetail } from '@callout/shared';
import { AgentAvatar } from './AgentAvatar';
import { WIN } from './statsPrimitives';

const SCORE_COLUMNS = '1fr 100px 54px 42px 42px 42px 54px';

// Detalhe completo de uma partida (10 jogadores, ADR, clutches, barra de
// rounds) — usado tanto em Matches.tsx quanto na expansão inline das linhas
// da Visão do ato (SeasonMatchesList). Só renderiza; quem chama busca o
// `MatchDetail` (fetch + cache) e controla o próprio loading/error.
export function MatchDetailPanel({ detail }: { detail: MatchDetail }) {
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
            <div key={r.number} style={{ width: 7, borderRadius: 2, height: 18, background: r.wonBySelf ? WIN : 'var(--neg, #EF4958)' }} />
          ))}
        </div>
      </div>

      <div className="scroll-x-mobile">
        <div style={{ display: 'grid', gridTemplateColumns: SCORE_COLUMNS, gap: 36, padding: '4px 12px 6px 0', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
          <span>JOGADOR · AGENTE</span>
          <span />
          <span style={{ textAlign: 'right' }}>ACS</span>
          <span style={{ textAlign: 'right' }}>K</span>
          <span style={{ textAlign: 'right' }}>D</span>
          <span style={{ textAlign: 'right' }}>A</span>
          <span style={{ textAlign: 'right' }}>HS%</span>
        </div>
        {(() => {
          const ownCount = detail.players.filter((p) => p.side === 'own').length;
          return detail.players.map((p, i) => {
            // Índice dentro do próprio time (não da lista inteira) -- os dois
            // times vêm em blocos separados (aliado primeiro, depois
            // inimigo), cada um com seu próprio zebrado.
            const sideIndex = p.side === 'own' ? i : i - ownCount;
            const zebraColor = p.side === 'own' ? 'var(--acc, #EF4958)' : 'var(--neg, #EF4958)';
            const zebraPercent = sideIndex % 2 === 0 ? 7 : 2.5;
            return (
              <div
                key={p.puuid}
                style={{
                  display: 'grid',
                  gridTemplateColumns: SCORE_COLUMNS,
                  gap: 36,
                  alignItems: 'center',
                  padding: '8px 12px 8px 0',
                  borderTop: '1px solid var(--divider)',
                  fontSize: 12.5,
                  // Zebrado por time -- tons do time aliado (cor de destaque)
                  // pro seu lado, tons da cor negativa pro time inimigo,
                  // alternando mais claro/mais escuro. A sua linha continua
                  // com um destaque mais forte, pra não se confundir com o
                  // zebrado do resto do seu time.
                  background: p.isSelf
                    ? 'color-mix(in srgb, var(--acc, #EF4958) 16%, transparent)'
                    : `color-mix(in srgb, ${zebraColor} ${zebraPercent}%, transparent)`,
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
            );
          });
        })()}
      </div>
    </div>
  );
}
