import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import type { SeasonMatchesPage, SeasonOverview } from '@callout/shared';
import { MIN_TEAM_MATCH_PLAYERS } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { SeasonMatchesList } from '../components/SeasonMatchesList';
import { cardStyle } from '../components/statsPrimitives';
import { apiFetch } from '../lib/api';

// Histórico completo de partidas da equipe (5+ membros juntos na mesma
// partida) -- mesmo design/componente da página de Partidas individual
// (SeasonMatchesList), sem filtro de ato (sempre o histórico mais recente,
// igual à individual). Ao vir do painel da equipe com "?expand=<id>", essa
// partida já abre expandida no lugar em vez de precisar clicar de novo.
export function EquipePartidas() {
  const navigate = useNavigate();
  useOutletContext<OutletContext>();
  const [searchParams] = useSearchParams();
  const expandMatchId = searchParams.get('expand');

  const [matchesPage, setMatchesPage] = useState<SeasonMatchesPage | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Só pra mapIcons/agentIcons (mesmas listas de ícones que a Visão do ato
  // já resolve) -- o painel da equipe já tem isso em cache, mas essa página
  // pode abrir direto (link/refresh) sem passar por lá.
  const [icons, setIcons] = useState<{ mapIcons: Record<string, string>; agentIcons: Record<string, string> }>({ mapIcons: {}, agentIcons: {} });

  const loadMatches = useCallback(async (p: number) => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      setMatchesPage(await apiFetch<SeasonMatchesPage>(`/equipe/painel/season/matches?page=${p}`));
    } catch {
      setMatchesError('Falha ao carregar o histórico de partidas da equipe.');
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches(page);
  }, [loadMatches, page]);

  useEffect(() => {
    apiFetch<SeasonOverview>('/equipe/painel/season')
      .then((data) => setIcons({ mapIcons: data.mapIcons, agentIcons: data.agentIcons }))
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <button
            onClick={() => navigate('/equipe')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, marginBottom: 10 }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Voltar pra equipe
          </button>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Partidas da equipe</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            Partidas com pelo menos {MIN_TEAM_MATCH_PLAYERS} membros da equipe juntos — clique numa pra ver os detalhes
          </div>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/equipe/painel')}>
          <BarChart3 size={15} strokeWidth={1.75} />
          Painel da equipe
        </button>
      </div>

      {matchesLoading && !matchesPage ? (
        <LoadingFill />
      ) : matchesError && !matchesPage ? (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{matchesError}</div>
        </div>
      ) : (
        <SeasonMatchesList
          matchesPage={matchesPage}
          loading={matchesLoading}
          error={matchesError}
          mapIcons={icons.mapIcons}
          agentIcons={icons.agentIcons}
          setPage={setPage}
          expandable
          autoExpandMatchId={expandMatchId}
          basePath="/equipe/partidas"
        />
      )}
    </div>
  );
}
