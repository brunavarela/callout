import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentAsset,
  DashboardSummary,
  Lado,
  MatchModeFilter,
  RrHistoryPoint,
  SessionUser,
  SidesBreakdown,
  Spot,
  Strategy,
  StratItem,
  SyncStatus,
  TeamOverview,
} from '@callout/shared';
import { apiFetch } from './api';

export type RrRange = '7d' | '30d' | '90d';

function modoQuery(modo: MatchModeFilter): string {
  return modo === 'all' ? '' : `modo=${encodeURIComponent(modo)}`;
}

// Estado do dashboard/time vive aqui, não dentro das páginas — assim ele
// sobrevive a trocar de aba e voltar (React desmonta a página, não o shell).
// Só rebusca quando a sincronização termina ou quando algo pede explicitamente.
export function useAppData(user: SessionUser | null) {
  const [sync, setSync] = useState<SyncStatus | null>(null);

  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [sides, setSides] = useState<SidesBreakdown | null>(null);

  const [rrRange, setRrRangeState] = useState<RrRange>('30d');
  const [rrHistoryCache, setRrHistoryCache] = useState<Record<string, RrHistoryPoint[]>>({});

  const [modoFilter, setModoFilterState] = useState<MatchModeFilter>('all');

  const wasSyncing = useRef(false);

  const loadTeam = useCallback(async () => {
    try {
      setTeam(await apiFetch<TeamOverview>('/team'));
      setTeamError(null);
    } catch {
      setTeamError('Falha ao carregar o time.');
    }
  }, []);

  const loadDashboard = useCallback(async (modo: MatchModeFilter) => {
    setDashboardLoading(true);
    try {
      const qs = modoQuery(modo);
      setDashboard(await apiFetch<DashboardSummary>(`/dashboard${qs ? `?${qs}` : ''}`));
      setDashboardError(null);
    } catch {
      setDashboardError('Falha ao carregar o dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadSides = useCallback(async (modo: MatchModeFilter) => {
    try {
      const qs = modoQuery(modo);
      setSides(await apiFetch<SidesBreakdown>(`/dashboard/sides${qs ? `?${qs}` : ''}`));
    } catch {
      // widget secundário — falha aqui não precisa de estado de erro próprio
    }
  }, []);

  // Cache chaveado por modo+range — filtro diferente é um dado diferente,
  // não dá pra reaproveitar o que já tava em cache pro range sozinho.
  const rrCacheKey = (range: RrRange, modo: MatchModeFilter) => `${modo}:${range}`;

  const loadRrHistory = useCallback(async (range: RrRange, modo: MatchModeFilter) => {
    try {
      const modoQs = modoQuery(modo);
      const points = await apiFetch<RrHistoryPoint[]>(`/dashboard/rr-history?range=${range}${modoQs ? `&${modoQs}` : ''}`);
      setRrHistoryCache((prev) => ({ ...prev, [rrCacheKey(range, modo)]: points }));
    } catch {
      // idem — o card mostra "sem histórico" se não tiver nada em cache
    }
  }, []);

  const setRrRange = useCallback(
    (range: RrRange) => {
      setRrRangeState(range);
      setRrHistoryCache((prev) => {
        if (!prev[rrCacheKey(range, modoFilter)]) loadRrHistory(range, modoFilter);
        return prev;
      });
    },
    [loadRrHistory, modoFilter],
  );

  const setModoFilter = useCallback((modo: MatchModeFilter) => {
    setModoFilterState(modo);
  }, []);

  const updateTeamMemberNote = useCallback((userId: string, note: string) => {
    setTeam((prev) => (prev ? { ...prev, members: prev.members.map((m) => (m.userId === userId ? { ...m, note } : m)) } : prev));
  }, []);

  const [strategies, setStrategies] = useState<Strategy[] | null>(null);
  const [strategiesError, setStrategiesError] = useState<string | null>(null);
  const [strategiesLoading, setStrategiesLoading] = useState(false);

  // Estratégias só carregam quando o Board é aberto (ninguém precisa delas
  // na sidebar/dashboard), mas ficam em cache aqui, não na página.
  const loadStrategies = useCallback(async () => {
    setStrategiesLoading(true);
    try {
      setStrategies(await apiFetch<Strategy[]>('/strategies'));
      setStrategiesError(null);
    } catch {
      setStrategiesError('Falha ao carregar as estratégias.');
    } finally {
      setStrategiesLoading(false);
    }
  }, []);

  const saveStrategy = useCallback(async (id: string, patch: { title?: string; description?: string; items?: Array<Omit<StratItem, 'id'>> }) => {
    const updated = await apiFetch<Strategy>(`/strategies/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    setStrategies((prev) => (prev ? prev.map((s) => (s.id === id ? updated : s)) : prev));
    return updated;
  }, []);

  const createStrategy = useCallback(async (input: { mapName: string; side: Lado; title: string }) => {
    const created = await apiFetch<Strategy>('/strategies', { method: 'POST', body: JSON.stringify(input) });
    setStrategies((prev) => (prev ? [created, ...prev] : [created]));
    return created;
  }, []);

  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [spotsError, setSpotsError] = useState<string | null>(null);
  const [spotsLoading, setSpotsLoading] = useState(false);

  // Igual estratégias: só carrega quando a tela de Spots é aberta, fica em
  // cache aqui depois.
  const loadSpots = useCallback(async () => {
    setSpotsLoading(true);
    try {
      setSpots(await apiFetch<Spot[]>('/spots'));
      setSpotsError(null);
    } catch {
      setSpotsError('Falha ao carregar os spots.');
    } finally {
      setSpotsLoading(false);
    }
  }, []);

  const createSpot = useCallback(
    async (input: {
      mapName: string;
      side: Lado;
      agentId: string;
      habilidade: string;
      origin: { x: number; y: number };
      target: { x: number; y: number };
      videoUrl?: string;
      notas?: string;
    }) => {
      const created = await apiFetch<Spot>('/spots', { method: 'POST', body: JSON.stringify(input) });
      setSpots((prev) => (prev ? [created, ...prev] : [created]));
      return created;
    },
    [],
  );

  const [agents, setAgents] = useState<AgentAsset[] | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Catálogo real de agentes (Fase 0 item 4) — carrega sob demanda (Board/
  // Spots são as únicas telas que precisam), fica em cache aqui.
  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      setAgents(await apiFetch<AgentAsset[]>('/agents'));
    } catch {
      // widget secundário (seletor de agente) — falha aqui não é crítica,
      // as telas caem pra paleta placeholder se `agents` continuar null
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const riotId = user?.riotId?.puuid;

  // Carga inicial — uma vez por login, não por navegação. Dispara a
  // sincronização em paralelo, sem esperar clique no botão — quando ela
  // termina, o efeito de "sync terminou" (mais abaixo) rebusca os dados.
  useEffect(() => {
    if (!riotId) return;
    apiFetch<SyncStatus>('/sync').then((status) => {
      setSync(status);
      if (status.state !== 'syncing') startSync();
    }).catch(() => {});
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId]);

  // Recarrega dashboard/sides/RR na carga inicial e sempre que o filtro de
  // modo (competitivo/sem classificação) mudar — os três endpoints dependem
  // dele.
  useEffect(() => {
    if (!riotId) return;
    loadDashboard(modoFilter);
    loadSides(modoFilter);
    loadRrHistory(rrRange, modoFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter]);

  // Poll enquanto a sincronização está rolando.
  useEffect(() => {
    if (sync?.state !== 'syncing') return;
    const interval = setInterval(async () => {
      try {
        setSync(await apiFetch<SyncStatus>('/sync'));
      } catch {
        // próxima tentativa do intervalo cobre uma falha pontual
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [sync?.state]);

  // Quando a sincronização termina, os dados derivados ficam desatualizados.
  useEffect(() => {
    if (sync?.state === 'syncing') {
      wasSyncing.current = true;
      return;
    }
    if (wasSyncing.current && sync?.state === 'idle') {
      wasSyncing.current = false;
      loadDashboard(modoFilter);
      loadSides(modoFilter);
      loadTeam();
      loadRrHistory(rrRange, modoFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync?.state]);

  const startSync = useCallback(async () => {
    try {
      setSync(await apiFetch<SyncStatus>('/sync', { method: 'POST' }));
    } catch {
      setSync({ state: 'failed', reason: 'Não deu pra iniciar a sincronização.' });
    }
  }, []);

  const reloadDashboard = useCallback(() => loadDashboard(modoFilter), [loadDashboard, modoFilter]);

  return {
    sync,
    startSync,
    team,
    teamError,
    reloadTeam: loadTeam,
    updateTeamMemberNote,
    dashboard,
    dashboardError,
    dashboardLoading,
    reloadDashboard,
    modoFilter,
    setModoFilter,
    sides,
    rrRange,
    setRrRange,
    rrHistory: rrHistoryCache[rrCacheKey(rrRange, modoFilter)] ?? [],
    strategies,
    strategiesError,
    strategiesLoading,
    loadStrategies,
    saveStrategy,
    createStrategy,
    spots,
    spotsError,
    spotsLoading,
    loadSpots,
    createSpot,
    agents,
    agentsLoading,
    loadAgents,
  };
}

export type AppData = ReturnType<typeof useAppData>;
