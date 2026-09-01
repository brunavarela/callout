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
  EquipePainelSummary,
  PartidaEquipeSummary,
  EquipeOverview,
} from '@callout/shared';
import { apiFetch } from './api';

// Querystring comum aos 3 endpoints de /dashboard*: filtro de modo + mapa +,
// quando alguém troca o filtro "ver painel de outro membro", o userId do
// membro selecionado (ausente = o próprio usuário logado).
function dashboardQuery(modo: MatchModeFilter, memberId: string | null, mapId: string | null, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  if (modo !== 'all') params.set('modo', modo);
  if (memberId) params.set('userId', memberId);
  if (mapId) params.set('mapId', mapId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function rrCacheKey(modo: MatchModeFilter, matchCount: MatchCountFilter, memberId: string | null, mapId: string | null): string {
  return `${modo}:${matchCount}:${memberId ?? 'self'}:${mapId ?? 'all-maps'}`;
}

// Estado do dashboard/equipe vive aqui, não dentro das páginas — assim ele
// sobrevive a trocar de aba e voltar (React desmonta a página, não o shell).
// Só rebusca quando a sincronização termina ou quando algo pede explicitamente.
export function useAppData(user: SessionUser | null) {
  const [sync, setSync] = useState<SyncStatus | null>(null);

  const [equipe, setEquipe] = useState<EquipeOverview | null>(null);
  const [equipeError, setEquipeError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [sides, setSides] = useState<SidesBreakdown | null>(null);

  const [rrHistoryCache, setRrHistoryCache] = useState<Record<string, RrHistoryResponse>>({});
  const [rrHistoryLoading, setRrHistoryLoading] = useState(true);

  const [modoFilter, setModoFilterState] = useState<MatchModeFilter>('all');
  const [matchCountFilter, setMatchCountFilterState] = useState<MatchCountFilter>(20);

  // Filtro "ver painel de outro membro" — null = o próprio usuário logado.
  const [selectedMemberId, setSelectedMemberIdState] = useState<string | null>(null);

  // Filtro de mapa — null = todos os mapas. É o mapId (MapAsset), não o nome,
  // pra bater direto com a coluna Match.mapId no filtro do backend.
  const [mapFilter, setMapFilterState] = useState<string | null>(null);

  const wasSyncing = useRef(false);

  const loadEquipe = useCallback(async () => {
    try {
      setEquipe(await apiFetch<EquipeOverview>('/equipe'));
      setEquipeError(null);
    } catch {
      setEquipeError('Falha ao carregar a equipe.');
    }
  }, []);

  const loadDashboard = useCallback(async (modo: MatchModeFilter, memberId: string | null, mapId: string | null) => {
    setDashboardLoading(true);
    try {
      setDashboard(await apiFetch<DashboardSummary>(`/dashboard${dashboardQuery(modo, memberId, mapId)}`));
      setDashboardError(null);
    } catch {
      setDashboardError('Falha ao carregar o dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadSides = useCallback(async (modo: MatchModeFilter, memberId: string | null, mapId: string | null) => {
    try {
      setSides(await apiFetch<SidesBreakdown>(`/dashboard/sides${dashboardQuery(modo, memberId, mapId)}`));
    } catch {
      // widget secundário — falha aqui não precisa de estado de erro próprio
    }
  }, []);

  // RR e os tópicos de análise vêm juntos de /dashboard/rr-history, numa
  // fetch separada de /dashboard — trocar só a janela de partidas (7/20)
  // não deve recarregar o resto da página, só esse card.
  const loadRrHistory = useCallback(async (modo: MatchModeFilter, matchCount: MatchCountFilter, memberId: string | null, mapId: string | null) => {
    setRrHistoryLoading(true);
    try {
      const response = await apiFetch<RrHistoryResponse>(`/dashboard/rr-history${dashboardQuery(modo, memberId, mapId, { matches: String(matchCount) })}`);
      setRrHistoryCache((prev) => ({ ...prev, [rrCacheKey(modo, matchCount, memberId, mapId)]: response }));
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

  // Trocar de membro reseta o filtro de mapa — a lista de mapas filtráveis
  // vem dos mapas que ESSA pessoa jogou (mapWinrates dela), então um mapa
  // selecionado pode nem existir mais na lista de quem você acabou de trocar.
  const setSelectedMemberId = useCallback((memberId: string | null) => {
    setSelectedMemberIdState(memberId);
    setMapFilterState(null);
  }, []);

  const setMapFilter = useCallback((mapId: string | null) => {
    setMapFilterState(mapId);
  }, []);

  const updateEquipeMembroNota = useCallback((userId: string, note: string) => {
    setEquipe((prev) => (prev ? { ...prev, members: prev.members.map((m) => (m.userId === userId ? { ...m, note } : m)) } : prev));
  }, []);

  const [equipePartidas, setEquipePartidas] = useState<PartidaEquipeSummary[] | null>(null);
  const [equipePartidasError, setEquipePartidasError] = useState<string | null>(null);
  const [equipePartidasLoading, setEquipePartidasLoading] = useState(false);

  // Histórico completo (>=5 da equipe juntos) — carrega sob demanda, só
  // quando a tela de histórico da equipe é aberta (pode envolver bastante
  // chamada à HenrikDev pra resolver RR de cada membro).
  const loadEquipePartidas = useCallback(async () => {
    setEquipePartidasLoading(true);
    try {
      setEquipePartidas(await apiFetch<PartidaEquipeSummary[]>('/equipe/partidas'));
      setEquipePartidasError(null);
    } catch {
      setEquipePartidasError('Falha ao carregar o histórico de partidas da equipe.');
    } finally {
      setEquipePartidasLoading(false);
    }
  }, []);

  const [equipePainel, setEquipePainel] = useState<EquipePainelSummary | null>(null);
  const [equipePainelError, setEquipePainelError] = useState<string | null>(null);
  const [equipePainelLoading, setEquipePainelLoading] = useState(false);

  // Igual equipePartidas: carrega sob demanda só quando a tela "Painel da
  // equipe" é aberta, fica em cache aqui.
  const loadEquipePainel = useCallback(async () => {
    setEquipePainelLoading(true);
    try {
      setEquipePainel(await apiFetch<EquipePainelSummary>('/equipe/painel'));
      setEquipePainelError(null);
    } catch {
      setEquipePainelError('Falha ao carregar o painel da equipe.');
    } finally {
      setEquipePainelLoading(false);
    }
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

  const deleteStrategy = useCallback(async (id: string) => {
    await apiFetch<void>(`/strategies/${id}`, { method: 'DELETE' });
    setStrategies((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
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

  const deleteSpot = useCallback(async (id: string) => {
    await apiFetch<void>(`/spots/${id}`, { method: 'DELETE' });
    setSpots((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
  }, []);

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
    loadEquipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId]);

  // Recarrega dashboard/sides na carga inicial e sempre que o filtro de modo
  // (competitivo/sem classificação), o membro ou o mapa selecionado mudar —
  // os três dependem deles, mas não da janela de partidas do RR (isso é só
  // o card de RR, efeito abaixo).
  useEffect(() => {
    if (!riotId) return;
    loadDashboard(modoFilter, selectedMemberId, mapFilter);
    loadSides(modoFilter, selectedMemberId, mapFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter, selectedMemberId, mapFilter]);

  // RR + tópicos de análise: além do modo, do membro e do mapa, dependem da
  // janela de partidas (7/20). Efeito separado do de cima de propósito —
  // trocar só essa janela não pode disparar o loading do resto da página
  // (dashboardLoading).
  useEffect(() => {
    if (!riotId) return;
    loadRrHistory(modoFilter, matchCountFilter, selectedMemberId, mapFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter, matchCountFilter, selectedMemberId, mapFilter]);

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
      loadDashboard(modoFilter, selectedMemberId, mapFilter);
      loadSides(modoFilter, selectedMemberId, mapFilter);
      loadEquipe();
      loadRrHistory(modoFilter, matchCountFilter, selectedMemberId, mapFilter);
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

  const reloadDashboard = useCallback(
    () => loadDashboard(modoFilter, selectedMemberId, mapFilter),
    [loadDashboard, modoFilter, selectedMemberId, mapFilter],
  );

  const rrCached = rrHistoryCache[rrCacheKey(modoFilter, matchCountFilter, selectedMemberId, mapFilter)];

  return {
    sync,
    startSync,
    equipe,
    equipeError,
    reloadEquipe: loadEquipe,
    updateEquipeMembroNota,
    equipePartidas,
    equipePartidasError,
    equipePartidasLoading,
    loadEquipePartidas,
    equipePainel,
    equipePainelError,
    equipePainelLoading,
    loadEquipePainel,
    dashboard,
    dashboardError,
    dashboardLoading,
    reloadDashboard,
    modoFilter,
    setModoFilter,
    matchCountFilter,
    setMatchCountFilter,
    selectedMemberId,
    setSelectedMemberId,
    mapFilter,
    setMapFilter,
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
    deleteStrategy,
    spots,
    spotsError,
    spotsLoading,
    loadSpots,
    createSpot,
    deleteSpot,
    agents,
    agentsLoading,
    loadAgents,
    maps,
    mapsLoading,
    loadMaps,
  };
}

export type AppData = ReturnType<typeof useAppData>;
