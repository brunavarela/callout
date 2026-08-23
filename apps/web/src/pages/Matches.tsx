import { useOutletContext } from 'react-router-dom';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { MatchRow } from '../components/MatchRow';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

// Lista das últimas 7 partidas — reaproveita o mesmo /dashboard já
// carregado pelo AppShell (recentMatches), sem fetch próprio. Clicar numa
// linha vai pro detalhe em /partida/:id, que tem um botão de voltar pra cá.
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
        <div style={{ ...cardStyle, padding: '10px 20px 6px', maxWidth: 640 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 62px 42px', gap: 8, padding: '10px 0 6px', borderBottom: '1px solid var(--divider)', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
            <span>V/D</span>
            <span>MAPA · AGENTE</span>
            <span>PLACAR</span>
            <span style={{ textAlign: 'right' }}>RR</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.recentMatches.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
