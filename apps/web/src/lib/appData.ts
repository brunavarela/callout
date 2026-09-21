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
  Spot,
  Strategy,
  StratItem,
  SyncStatus,
  EquipePainelSummary,
  EquipeOverview,
  SeasonMatchesPage,
  SeasonOverview,
} from '@callout/shared';
import { apiFetch, ApiError } from './api';

// Querystring comum aos 4 endpoints de /dashboard* usados pelo painel
// individual (Dashboard.tsx/Matches.tsx): filtro de modo + mapa +, quando
// alguém pesquisa um RiotID (ver searchRiotId), o userId resolvido (ausente
// = o próprio usuário logado). `free=1` avisa o back que esse userId não
// precisa ser membro da equipe de quem pesquisou — decisão de produto de
// 21/09/2026, ver LAUNCH.md/memória do projeto: o painel individual virou
// "espiar qualquer jogador", diferente do painel da equipe (EquipePainel.tsx,
// que continua restrito a membro da mesma equipe e por isso NÃO manda esse
// parâmetro — ver resolveTarget em apps/api/src/routes/dashboard.ts).
function dashboardQuery(modo: MatchModeFilter, memberId: string | null, mapId: string | null, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  if (modo !== 'all') params.set('modo', modo);
  if (memberId) {
    params.set('userId', memberId);
    params.set('free', '1');
  }
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
  // true assim que o back confirma "essa pessoa não tem equipe nenhuma"
  // (404 de verdade, não falha de rede) -- criar equipe agora é opcional
  // (ver resolveOnboardingStep), então isso não é mais um estado de erro,
  // é um estado válido que a tela de Equipe usa pra mostrar o formulário de
  // criar/entrar em vez de uma mensagem de falha.
  const [equipeNaoTemNenhuma, setEquipeNaoTemNenhuma] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [seasonOverview, setSeasonOverview] = useState<SeasonOverview | null>(null);
  const [seasonOverviewError, setSeasonOverviewError] = useState<string | null>(null);
  const [seasonOverviewLoading, setSeasonOverviewLoading] = useState(true);

  const [modoFilter, setModoFilterState] = useState<MatchModeFilter>('all');
  const [matchCountFilter, setMatchCountFilterState] = useState<MatchCountFilter>(20);

  // Filtro "ver painel de outro membro" — null = o próprio usuário logado.
  // Desde 21/09/2026 esse id não é mais só de membro de equipe: pode ser
  // qualquer jogador pesquisado por RiotID (ver searchRiotId/searchedTarget
  // abaixo) — Dashboard.tsx troca a busca por RiotID, Matches.tsx segue com
  // o seletor de membro (que é um subconjunto de "qualquer usuário").
  const [selectedMemberId, setSelectedMemberIdState] = useState<string | null>(null);

  // Nome/tag de exibição de quem foi pesquisado por RiotID — só existe pra
  // popular "Espiando fulano#tag" quando o alvo não é membro da equipe (e
  // por isso não aparece em equipe.members). Null quando selectedMemberId é
  // um membro da equipe ou quando voltou pra "você".
  const [searchedTarget, setSearchedTarget] = useState<{ riotName: string; riotTag: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Filtro de mapa — null = todos os mapas. É o mapId (MapAsset), não o nome,
  // pra bater direto com a coluna Match.mapId no filtro do backend.
  const [mapFilter, setMapFilterState] = useState<string | null>(null);

  // Filtros de mapa/agente do painel "Visão do ato" — separados do
  // mapFilter do dashboard antigo (que outras telas como Matches/busca
  // global ainda usam) pra não acoplar os dois.
  const [seasonMapFilter, setSeasonMapFilterState] = useState<string | null>(null);
  const [seasonAgentFilter, setSeasonAgentFilterState] = useState<string | null>(null);
  // null = mistura só os modos com estatística de verdade (Competitivo/Sem
  // classificação/Premier); um valor = só esse modo (Match.modo bruto,
  // pode ser qualquer um, inclusive Deathmatch etc.).
  const [seasonModoFilter, setSeasonModoFilterState] = useState<string | null>(null);

  // Lista paginada (12 por página) de partidas do ato — separada do resto
  // da Visão do ato (ver buildSeasonMatchesPage): trocar de página não
  // recarrega KPIs/top agentes/mapas/etc, só a própria lista.
  const [seasonMatchesPage, setSeasonMatchesPage] = useState<SeasonMatchesPage | null>(null);
  const [seasonMatchesError, setSeasonMatchesError] = useState<string | null>(null);
  const [seasonMatchesLoading, setSeasonMatchesLoading] = useState(true);
  const [seasonMatchesPageNumber, setSeasonMatchesPageNumberState] = useState(1);

  // RR ganho/perdido + as 4 análises de forma recente — volta como card
  // próprio abaixo da lista de partidas do ato (não é a mesma coisa que a
  // Visão do ato: usa modoFilter/mapFilter "antigos" e uma janela de
  // partidas 7/20, não o ato inteiro).
  const [rrHistoryCache, setRrHistoryCache] = useState<Record<string, RrHistoryResponse>>({});
  const [rrHistoryLoading, setRrHistoryLoading] = useState(true);

  const wasSyncing = useRef(false);

  const loadEquipe = useCallback(async () => {
    try {
      setEquipe(await apiFetch<EquipeOverview>('/equipe'));
      setEquipeError(null);
      setEquipeNaoTemNenhuma(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setEquipe(null);
        setEquipeError(null);
        setEquipeNaoTemNenhuma(true);
      } else {
        setEquipeError('Falha ao carregar a equipe.');
      }
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

  // RR ganho/perdido + as 4 análises de forma recente — fetch separada de
  // /dashboard (mesmo endpoint de antes, /dashboard/rr-history), trocar só
  // a janela de partidas (7/20) não deve recarregar o resto da página.
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

  // Visão do ato ("estilo tracker.gg") — depende de quem é o alvo (próprio
  // usuário ou outro membro selecionado), da janela de partidas escolhida
  // (Todas/20/7 — mesmo `matchCountFilter` que o card de RR usa, um filtro
  // só pros dois) e dos filtros de mapa/agente/modo do painel.
  const loadSeasonOverview = useCallback(
    async (memberId: string | null, matchCount: MatchCountFilter, mapId: string | null, agent: string | null, modo: string | null) => {
      setSeasonOverviewLoading(true);
      try {
        const params = new URLSearchParams();
        if (memberId) {
          params.set('userId', memberId);
          params.set('free', '1');
        }
        params.set('matches', String(matchCount));
        if (mapId) params.set('mapId', mapId);
        if (agent) params.set('agent', agent);
        if (modo) params.set('modo', modo);
        setSeasonOverview(await apiFetch<SeasonOverview>(`/dashboard/season?${params.toString()}`));
        setSeasonOverviewError(null);
      } catch {
        setSeasonOverviewError('Falha ao carregar a visão do ato.');
      } finally {
        setSeasonOverviewLoading(false);
      }
    },
    [],
  );

  // Lista paginada de partidas — separada de loadSeasonOverview de
  // propósito (ver buildSeasonMatchesPage): virar página não recalcula os
  // KPIs/top agentes/mapas de novo. De propósito NÃO manda o filtro de
  // contagem (Todas/20/7) — a lista sempre mostra o histórico completo.
  const loadSeasonMatches = useCallback(
    async (memberId: string | null, mapId: string | null, agent: string | null, modo: string | null, page: number) => {
      setSeasonMatchesLoading(true);
      try {
        const params = new URLSearchParams();
        if (memberId) {
          params.set('userId', memberId);
          params.set('free', '1');
        }
        if (mapId) params.set('mapId', mapId);
        if (agent) params.set('agent', agent);
        if (modo) params.set('modo', modo);
        params.set('page', String(page));
        setSeasonMatchesPage(await apiFetch<SeasonMatchesPage>(`/dashboard/season/matches?${params.toString()}`));
        setSeasonMatchesError(null);
      } catch {
        setSeasonMatchesError('Falha ao carregar as partidas do ato.');
      } finally {
        setSeasonMatchesLoading(false);
      }
    },
    [],
  );

  const setModoFilter = useCallback((modo: MatchModeFilter) => {
    setModoFilterState(modo);
  }, []);

  const setMatchCountFilter = useCallback((count: MatchCountFilter) => {
    setMatchCountFilterState(count);
  }, []);

  // Trocar de membro reseta o filtro de mapa — a lista de mapas filtráveis
  // vem dos mapas que ESSA pessoa jogou (mapWinrates dela), então um mapa
  // selecionado pode nem existir mais na lista de quem você acabou de trocar.
  // Reseta o mapa/agente/modo/página selecionados da Visão do ato pelo
  // mesmo motivo — a página 3 de um filtro pode nem existir no outro.
  const setSelectedMemberId = useCallback((memberId: string | null) => {
    setSelectedMemberIdState(memberId);
    setSearchedTarget(null);
    setSearchError(null);
    setMapFilterState(null);
    setSeasonMapFilterState(null);
    setSeasonAgentFilterState(null);
    setSeasonModoFilterState(null);
    setSeasonMatchesPageNumberState(1);
  }, []);

  // Busca livre por RiotID (painel individual) — resolve/cria o usuário-alvo
  // no back (POST implícito: se for a 1ª vez que alguém pesquisa esse
  // jogador, /dashboard/buscar já dispara a sincronização) e troca o alvo do
  // painel pra ele, igual escolher um membro da equipe.
  const searchRiotId = useCallback(async (riotId: string) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await apiFetch<{ userId: string; riotName: string | null; riotTag: string | null }>(
        `/dashboard/buscar?riotId=${encodeURIComponent(riotId)}`,
      );
      setSelectedMemberId(result.userId);
      setSearchedTarget(result.riotName && result.riotTag ? { riotName: result.riotName, riotTag: result.riotTag } : null);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'Falha ao pesquisar esse RiotID.');
    } finally {
      setSearchLoading(false);
    }
  }, [setSelectedMemberId]);

  const setMapFilter = useCallback((mapId: string | null) => {
    setMapFilterState(mapId);
  }, []);

  const setSeasonMapFilter = useCallback((mapId: string | null) => {
    setSeasonMapFilterState(mapId);
    setSeasonMatchesPageNumberState(1);
  }, []);

  const setSeasonAgentFilter = useCallback((agent: string | null) => {
    setSeasonAgentFilterState(agent);
    setSeasonMatchesPageNumberState(1);
  }, []);

  // Trocar o modo também volta a janela de partidas (Todas/20/7) pro padrão
  // (20) -- combinar "Todas" (até 150) com um modo filtrado (ex.: Premier,
  // bem mais raro que Competitivo/Sem classificação) não tem necessidade
  // nenhuma na prática e só deixa a query mais pesada à toa.
  const setSeasonModoFilter = useCallback((modo: string | null) => {
    setSeasonModoFilterState(modo);
    setMatchCountFilterState(20);
    setSeasonMatchesPageNumberState(1);
  }, []);

  const setSeasonMatchesPageNumber = useCallback((page: number) => {
    setSeasonMatchesPageNumberState(page);
  }, []);

  const updateEquipeMembroNota = useCallback((userId: string, note: string) => {
    setEquipe((prev) => (prev ? { ...prev, members: prev.members.map((m) => (m.userId === userId ? { ...m, note } : m)) } : prev));
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
  // Escopo já carregado em `strategies` (null = nada carregado ainda) --
  // Board.tsx compara isso com o escopo que a aba ativa pede pra saber se
  // precisa buscar de novo ou se o que já está em cache serve, evitando
  // recarregar toda vez que a página remonta com a mesma aba selecionada.
  const [strategiesScope, setStrategiesScope] = useState<'equipe' | 'individual' | null>(null);

  // Estratégias só carregam quando o Board é aberto (ninguém precisa delas
  // na sidebar/dashboard), mas ficam em cache aqui, não na página. `scope`
  // decide se lista as da equipe ou só as individuais (ver toggle
  // Equipe/Individual em Board.tsx) -- trocar de aba força um reload, não
  // dá pra filtrar client-side porque cada aba é uma query diferente no back.
  const loadStrategies = useCallback(async (scope: 'equipe' | 'individual') => {
    setStrategiesLoading(true);
    try {
      setStrategies(await apiFetch<Strategy[]>(`/strategies?scope=${scope}`));
      setStrategiesError(null);
      setStrategiesScope(scope);
    } catch (err) {
      // 404 "Você ainda não tem uma equipe." é um estado normal agora que
      // criar/entrar em equipe é opcional (ver resolveOnboardingStep) --
      // deixa a mensagem de verdade do back passar em vez do genérico "falha
      // ao carregar", que soaria como bug pra quem só não tem equipe ainda.
      setStrategiesError(err instanceof ApiError && err.status === 404 ? err.message : 'Falha ao carregar as estratégias.');
      // Marca o escopo como "tentado" mesmo em erro -- sem isso, o efeito em
      // Board.tsx (que compara strategiesScope com a aba ativa) ficaria
      // chamando loadStrategies em loop a cada vez que strategiesLoading
      // volta a false. Tentar de novo é uma ação explícita do botão de erro,
      // não algo automático.
      setStrategiesScope(scope);
    } finally {
      setStrategiesLoading(false);
    }
  }, []);

  const saveStrategy = useCallback(async (id: string, patch: { title?: string; description?: string; items?: Array<Omit<StratItem, 'id'>> }) => {
    const updated = await apiFetch<Strategy>(`/strategies/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    setStrategies((prev) => (prev ? prev.map((s) => (s.id === id ? updated : s)) : prev));
    return updated;
  }, []);

  const createStrategy = useCallback(async (input: { scope: 'equipe' | 'individual'; mapName: string; side: Lado; title: string }) => {
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
  // Mesmo esquema de strategiesScope -- ver comentário lá.
  const [spotsScope, setSpotsScope] = useState<'equipe' | 'individual' | null>(null);

  // Igual estratégias: só carrega quando a tela de Spots é aberta, fica em
  // cache aqui depois. `scope` decide equipe (compartilhado com o time) ou
  // individual (só os seus, sem equipe nenhuma envolvida).
  const loadSpots = useCallback(async (scope: 'equipe' | 'individual') => {
    setSpotsLoading(true);
    try {
      setSpots(await apiFetch<Spot[]>(`/spots?scope=${scope}`));
      setSpotsError(null);
      setSpotsScope(scope);
    } catch (err) {
      setSpotsError(err instanceof ApiError && err.status === 404 ? err.message : 'Falha ao carregar os spots.');
      setSpotsScope(scope);
    } finally {
      setSpotsLoading(false);
    }
  }, []);

  const createSpot = useCallback(
    async (input: { scope: 'equipe' | 'individual'; mapId: string; agentId: string; side: Lado; descricao: string; imagens: string[]; link?: string }) => {
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
  // sincronização em paralelo, sem precisar de nenhuma ação da pessoa —
  // quando ela termina, o efeito de "sync terminou" (mais abaixo) rebusca
  // os dados.
  useEffect(() => {
    if (!riotId) return;
    apiFetch<SyncStatus>('/sync').then((status) => {
      setSync(status);
      if (status.state !== 'syncing') startSync();
    }).catch(() => {});
    loadEquipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId]);

  // Ressincroniza sozinho a cada 30min enquanto a aba fica aberta — não
  // existe mais botão manual de "Sincronizar" (removido do Dashboard); essa
  // é a única forma de os dados se atualizarem depois da carga inicial.
  useEffect(() => {
    if (!riotId) return;
    const interval = setInterval(() => startSync(), 30 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId]);

  // Recarrega o dashboard antigo (só Matches.tsx e a busca global ainda
  // dependem dele) na carga inicial e sempre que o filtro de modo ou o mapa
  // selecionado mudar.
  useEffect(() => {
    if (!riotId) return;
    loadDashboard(modoFilter, selectedMemberId, mapFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter, selectedMemberId, mapFilter]);

  // RR + tópicos de análise: além do modo, do membro e do mapa, dependem da
  // janela de partidas (7/20). Efeito separado do de cima de propósito —
  // trocar só essa janela não pode disparar o loading do resto da página.
  useEffect(() => {
    if (!riotId) return;
    loadRrHistory(modoFilter, matchCountFilter, selectedMemberId, mapFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, modoFilter, matchCountFilter, selectedMemberId, mapFilter]);

  // Visão do ato — depende de trocar de membro, da janela de partidas
  // (Todas/20/7 — mesmo matchCountFilter do card de RR) e dos filtros de
  // mapa/agente/modo do próprio painel.
  useEffect(() => {
    if (!riotId) return;
    loadSeasonOverview(selectedMemberId, matchCountFilter, seasonMapFilter, seasonAgentFilter, seasonModoFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, selectedMemberId, matchCountFilter, seasonMapFilter, seasonAgentFilter, seasonModoFilter]);

  // Lista paginada de partidas — mesmos filtros de mapa/agente/modo da
  // Visão do ato (mas NÃO a janela de partidas — a lista sempre mostra o
  // histórico completo), mais a página. Efeito separado do de cima de
  // propósito — trocar só a página não pode recarregar KPIs/top agentes/
  // mapas de novo.
  useEffect(() => {
    if (!riotId) return;
    loadSeasonMatches(selectedMemberId, seasonMapFilter, seasonAgentFilter, seasonModoFilter, seasonMatchesPageNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riotId, selectedMemberId, seasonMapFilter, seasonAgentFilter, seasonModoFilter, seasonMatchesPageNumber]);

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
      loadEquipe();
      loadRrHistory(modoFilter, matchCountFilter, selectedMemberId, mapFilter);
      loadSeasonOverview(selectedMemberId, matchCountFilter, seasonMapFilter, seasonAgentFilter, seasonModoFilter);
      loadSeasonMatches(selectedMemberId, seasonMapFilter, seasonAgentFilter, seasonModoFilter, seasonMatchesPageNumber);
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
    seasonOverview,
    seasonOverviewError,
    seasonOverviewLoading,
    seasonMapFilter,
    setSeasonMapFilter,
    seasonAgentFilter,
    setSeasonAgentFilter,
    seasonModoFilter,
    setSeasonModoFilter,
    seasonMatchesPage,
    seasonMatchesError,
    seasonMatchesLoading,
    seasonMatchesPageNumber,
    setSeasonMatchesPageNumber,
    equipe,
    equipeError,
    equipeNaoTemNenhuma,
    reloadEquipe: loadEquipe,
    updateEquipeMembroNota,
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
    rrHistory: rrCached?.points ?? [],
    formInsights: rrCached?.formInsights ?? null,
    rrHistoryLoading,
    selectedMemberId,
    setSelectedMemberId,
    searchedTarget,
    searchError,
    searchLoading,
    searchRiotId,
    mapFilter,
    setMapFilter,
    strategies,
    strategiesError,
    strategiesLoading,
    strategiesScope,
    loadStrategies,
    saveStrategy,
    createStrategy,
    deleteStrategy,
    spots,
    spotsError,
    spotsLoading,
    spotsScope,
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
