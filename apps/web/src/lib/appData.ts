import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DashboardSummary,
  Lado,
  RrHistoryPoint,
  SessionUser,
  SidesBreakdown,
  Strategy,
  StratItem,
  SyncStatus,
  TeamOverview,
} from '@callout/shared';
import { apiFetch } from './api';

export type RrRange = '7d' | '30d' | '90d';

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
  const [rrHistoryCache, setRrHistoryCache] = useState<Partial<Record<RrRange, RrHistoryPoint[]>>>({});

  const wasSyncing = useRef(false);

  const loadTeam = useCallback(async () => {
    try {
      setTeam(await apiFetch<TeamOverview>('/team'));
      setTeamError(null);
    } catch {
      setTeamError('Falha ao carregar o time.');
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      setDashboard(await apiFetch<DashboardSummary>('/dashboard'));
      setDashboardError(null);
    } catch {
      setDashboardError('Falha ao carregar o dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadSides = useCallback(async () => {
    try {
      setSides(await apiFetch<SidesBreakdown>('/dashboard/sides'));
    } catch {
      // widget secundário — falha aqui não precisa de estado de erro próprio
    }
  }, []);

  const loadRrHistory = useCallback(async (range: RrRange) => {
    try {
      const points = await apiFetch<RrHistoryPoint[]>(`/dashboard/rr-history?range=${range}`);
      setRrHistoryCache((prev) => ({ ...prev, [range]: points }));
    } catch {
      // idem — o card mostra "sem histórico" se não tiver nada em cache
    }
  }, []);

  const setRrRange = useCallback(
    (range: RrRange) => {
      setRrRangeState(range);
      setRrHistoryCache((prev) => {
        if (!prev[range]) loadRrHistory(range);
        return prev;
      });
    },
    [loadRrHistory],
  );

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

  const riotId = user?.riotId?.puuid;

  // Carga inicial — uma vez por login, não por navegação.
  useEffect(() => {
    if (!riotId) return;
    apiFetch<SyncStatus>('/sync').then(setSync).catch(() => {});
    loadTeam();
    loadDashboard();
    loadSides();
    loadRrHistory('30d');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId]);

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
      loadDashboard();
      loadSides();
      loadTeam();
      loadRrHistory(rrRange);
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
    reloadDashboard: loadDashboard,
    sides,
    rrRange,
    setRrRange,
    rrHistory: rrHistoryCache[rrRange] ?? [],
    strategies,
    strategiesError,
    strategiesLoading,
    loadStrategies,
    saveStrategy,
    createStrategy,
  };
}

export type AppData = ReturnType<typeof useAppData>;
