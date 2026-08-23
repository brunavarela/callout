import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MatchDetail as MatchDetailDTO } from '@callout/shared';
import { apiFetch } from '../lib/api';
import { LoadingFill } from '../components/Spinner';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const scoreCols = '1fr 100px 62px 54px 54px 54px 62px';

function fmtKda(v: number) {
  return v.toFixed(2);
}

export function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    apiFetch<MatchDetailDTO>(`/matches/${id}`)
      .then(setMatch)
      .catch(() => setError('Não foi possível carregar essa partida.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <LoadingFill />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/partidas')}>
          ← Voltar pras partidas
        </button>
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          {error ?? 'Partida não encontrada.'}
        </div>
      </div>
    );
  }

  const myStats = [
    { label: 'ACS', value: String(match.myStats.acs) },
    { label: 'KDA', value: fmtKda(match.myStats.kda) },
    { label: 'ADR', value: String(match.myStats.adr) },
    { label: 'First bloods', value: String(match.myStats.firstBloods) },
    { label: 'Clutches', value: `${match.myStats.clutchesWon}/${match.myStats.clutchesPlayed}` },
    { label: 'Plants', value: String(match.myStats.plants) },
  ];

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/partidas')}>
        ← Voltar pras partidas
      </button>

      <div style={{ ...cardStyle, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -60,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--acc18, rgba(239,73,88,.18)) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)' }}>
            {match.mode.toUpperCase()} · {match.playedAtLabel.toUpperCase()} · {match.durationLabel.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 38, letterSpacing: '-.03em', lineHeight: 1.1, marginTop: 6 }}>{match.map}</div>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 40, fontWeight: 600, color: 'var(--pos, #18AAB7)' }}>{match.score.own}</span>
          <span style={{ fontSize: 20, color: 'var(--text-faint)' }}>—</span>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 40, fontWeight: 600, color: 'var(--text-muted-2)' }}>{match.score.opponent}</span>
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {match.rounds.map((r) => (
            <div key={r.number} style={{ width: 12, borderRadius: 3, height: 26, background: r.wonBySelf ? 'var(--pos, #18AAB7)' : 'var(--bar-dim)' }} />
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div className="scroll-x-mobile">
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: scoreCols, padding: '14px 22px', fontSize: 10.5, letterSpacing: '.12em', color: 'var(--text-dim)' }}>
              <div>JOGADOR</div>
              <div>AGENTE</div>
              <div style={{ textAlign: 'right' }}>ACS</div>
              <div style={{ textAlign: 'right' }}>K</div>
              <div style={{ textAlign: 'right' }}>D</div>
              <div style={{ textAlign: 'right' }}>A</div>
              <div style={{ textAlign: 'right' }}>HS%</div>
            </div>
            {match.players.map((p) => (
              <div
                key={p.puuid}
                style={{
                  display: 'grid',
                  gridTemplateColumns: scoreCols,
                  padding: '11px 22px',
                  borderTop: '1px solid var(--divider)',
                  fontSize: 13,
                  background: p.isSelf ? 'color-mix(in srgb, var(--acc, #EF4958) 9%, transparent)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 3, height: 16, borderRadius: 2, background: p.side === 'own' ? 'var(--acc, #EF4958)' : 'var(--text-faint)' }} />
                  <span style={{ color: p.side === 'own' ? 'var(--text)' : 'var(--text-muted)', fontWeight: p.isSelf ? 600 : 400 }}>{p.name}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{p.tag}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.agentColor, flex: 'none' }} />
                  {p.agent}
                </div>
                <div style={{ textAlign: 'right' }}>{p.acs}</div>
                <div style={{ textAlign: 'right' }}>{p.kills}</div>
                <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.deaths}</div>
                <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.assists}</div>
                <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.hsPercent}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '20px 22px' }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Meus números</div>
        <div className="grid-responsive-stats" style={{ gap: 10 }}>
          {myStats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 14, borderLeft: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 22 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
