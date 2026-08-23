import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentAsset,
  DashboardSummary,
  Lado,
  MapAsset,
  MatchCountFilter,
  MatchModeFilter,
  RrHistoryResponse,
  SessionUser,
  SidesBreakdown,
  Spot,
  Strategy,
  StratItem,
  SyncStatus,
  TeamOverview,
} from '@callout/shared';
import { apiFetch } from './api';

function modoQuery(modo: MatchModeFilter): string {
  return modo === 'all' ? '' : `modo=${encodeURIComponent(modo)}`;
}

function rrCacheKey(modo: MatchModeFilter, matchCount: MatchCountFilter): string {
  return `${modo}:${matchCount}`;
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

  const [rrHistoryCache, setRrHistoryCache] = useState<Record<string, RrHistoryResponse>>({});
  const [rrHistoryLoading, setRrHistoryLoading] = useState(true);

  const [modoFilter, setModoFilterState] = useState<MatchModeFilter>('all');
  const [matchCountFilter, setMatchCountFilterState] = useState<MatchCountFilter>(20);

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

  // RR e os tópicos de análise vêm juntos de /dashboard/rr-history, numa
  // fetch separada de /dashboard — trocar só a janela de partidas (7/20)
  // não deve recarregar o resto da página, só esse card.
  const loadRrHistory = useCallback(async (modo: MatchModeFilter, matchCount: MatchCountFilter) => {
    setRrHistoryLoading(true);
    try {
      const qs = modoQuery(modo);
      const response = await apiFetch<RrHistoryResponse>(`/dashboard/rr-history?matches=${matchCount}${qs ? `&${qs}` : ''}`);
      setRrHistoryCache((prev) => ({ ...prev, [rrCacheKey(modo, matchCount)]: response }));
    } catch {
      // idem — o card mostra "sem histórico" se não tiver nada em cache
    } finally {
      setRrHistoryLoading(false);
    }
  }, []);

  const setModoFilter = useCallback((modo: MatchModeFilter) => {
    setModoFilterState(modo);
  }, []);

  const setMatchCountFilter = useCallback((count: MatchCountFilter) => {
    setMatchCountFilterState(count);
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
    async (input: { mapId: string; agentId: string; side: Lado; descricao: string; imagens: string[]; link?: string }) => {
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

  const [maps, setMaps] = useState<MapAsset[] | null>(null);
  const [mapsLoading, setMapsLoading] = useState(false);

  // Catálogo real de mapas — só Spots precisa (select de mapa no modal de
  // criação), carrega sob demanda igual agents.
  const loadMaps = useCallback(async () => {
    setMapsLoading(true);
    try {
      setMaps(await apiFetch<MapAsset[]>('/maps'));
    } catch {
      // select fica vazio — o form não deixa submeter sem mapa escolhido
    } finally {
      setMapsLoading(false);
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

  // Recarrega dashboard/sides na carga inicial e sempre que o filtro de modo
  // (competitivo/sem classificação) mudar — os dois dependem dele, mas não
  // da janela de partidas do RR (isso é só o card de RR, efeito abaixo).
  useEffect(() => {
    if (!riotId) return;
    loadDashboard(modoFilter);
    loadSides(modoFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter]);

  // RR + tópicos de análise: além do modo, dependem da janela de partidas
  // (7/20). Efeito separado do de cima de propósito — trocar só essa janela
  // não pode disparar o loading do resto da página (dashboardLoading).
  useEffect(() => {
    if (!riotId) return;
    loadRrHistory(modoFilter, matchCountFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter, matchCountFilter]);

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
      loadRrHistory(modoFilter, matchCountFilter);
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

  const rrCached = rrHistoryCache[rrCacheKey(modoFilter, matchCountFilter)];

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
    matchCountFilter,
    setMatchCountFilter,
    sides,
    rrHistory: rrCached?.points ?? [],
    formInsights: rrCached?.formInsights ?? null,
    rrHistoryLoading,
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
    maps,
    mapsLoading,
    loadMaps,
  };
}

export type AppData = ReturnType<typeof useAppData>;
