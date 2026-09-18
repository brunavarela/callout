import { useEffect, useState } from 'react';
import type { EquipePainelSummary, LineupComboMatch } from '@callout/shared';
import { Modal, ModalHeader } from './Modal';
import { Select } from './Select';
import { SnakeSpinner } from './Spinner';
import { AgentAvatar } from './AgentAvatar';
import { RankingBlock, WIN, LOSS, DRAW, plural, type RankingRow } from './statsPrimitives';
import { apiFetch } from '../lib/api';

const MATCHES_PER_PAGE = 5;

// Mesmo tamanho dos outros filtros do painel da equipe (ver FILTER_STYLE em
// EquipePainel.tsx) -- sem isso o Select cresce pro tamanho do texto mais
// longo dentre as opções (ex.: nomes de formação), ficando bem maior que o
// resto dos filtros da tela.
const FILTER_STYLE: React.CSSProperties = { width: 'auto', height: 40, padding: '0 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 };

function comboResultColor(result: LineupComboMatch['result']): string {
  return result === 'V' ? WIN : result === 'D' ? LOSS : DRAW;
}

function ComboMatchRow({ m }: { m: LineupComboMatch }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--divider)' }}>
      <span style={{ width: 16, flex: 'none', fontSize: 11, fontWeight: 700, textAlign: 'center', color: comboResultColor(m.result) }}>{m.result}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{m.map}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.score}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{m.playedAtLabel}</span>
      <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', flex: 'none' }}>
        {m.agents.map((a) => (
          <AgentAvatar key={a.userId} agent={a.agent} size={22} title={a.name} />
        ))}
      </div>
    </div>
  );
}

export function EquipeRankingModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<EquipePainelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [comboKey, setComboKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (mapId) params.set('mapId', mapId);
    apiFetch<EquipePainelSummary>(`/equipe/painel${params.toString() ? `?${params}` : ''}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch(() => {
        if (!cancelled) setError('Não deu pra carregar o ranking da equipe.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  // Trocar mapa pode mudar (ou zerar) as formações disponíveis -- mais
  // seguro voltar pra "todas as formações" do que manter selecionada uma
  // que não existe mais (ou existe com outros números) nesse mapa.
  function changeMap(v: string | null) {
    setMapId(v);
    setComboKey(null);
    setPage(1);
  }

  function changeCombo(v: string | null) {
    setComboKey(v);
    setPage(1);
  }

  const mapOptions = data?.mapWinrates.filter((m) => m.mapId !== null) ?? [];
  const combo = comboKey ? (data?.lineupCombos.find((c) => c.comboKey === comboKey) ?? null) : null;

  const acsRows: RankingRow[] = (data?.acsRanking ?? []).map((r) => ({ key: r.userId, name: r.name, value: String(r.value), caption: `(${plural(r.matchesPlayed, 'partida')})` }));
  const mvpRows: RankingRow[] = (data?.mvpRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: `${r.value} ${r.value === 1 ? 'vez' : 'vezes'}`,
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const assistRows: RankingRow[] = (data?.assistRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: String(r.value),
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const clutchRows: RankingRow[] = (data?.clutchRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: `${r.clutchesWon} de ${r.clutchesPlayed}`,
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const firstBloodRows: RankingRow[] = (data?.firstBloodRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: String(r.value),
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const firstDeathRows: RankingRow[] = (data?.firstDeathRanking ?? []).map((r) => ({
    key: r.userId,
    name: r.name,
    value: String(r.value),
    caption: `(${plural(r.matchesPlayed, 'partida')})`,
  }));
  const totalPages = combo ? Math.max(1, Math.ceil(combo.matches.length / MATCHES_PER_PAGE)) : 1;
  const pageMatches = combo ? combo.matches.slice((page - 1) * MATCHES_PER_PAGE, page * MATCHES_PER_PAGE) : [];

  return (
    <Modal onClose={onClose} width={1480} closeOnBackdrop={false} noScroll>
      <ModalHeader title="Ranking da equipe" onClose={onClose} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <Select
          value={mapId ?? 'all'}
          onChange={(v) => changeMap(v === 'all' ? null : v)}
          options={[{ value: 'all', label: 'Todos os mapas' }, ...mapOptions.map((m) => ({ value: m.mapId as string, label: m.map }))]}
          title="Filtrar por mapa"
          style={{ ...FILTER_STYLE, width: 170 }}
        />
        <Select
          value={comboKey ?? 'all'}
          onChange={(v) => changeCombo(v === 'all' ? null : v)}
          options={[
            { value: 'all', label: 'Todas as formações' },
            ...(data?.lineupCombos ?? []).map((c) => ({ value: c.comboKey, label: c.members.map((m) => m.name).join(', ') })),
          ]}
          title="Filtrar por variação de equipe"
          style={{ ...FILTER_STYLE, width: 220 }}
          panelClassName="fit-trigger"
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '30px 0' }}>
          <SnakeSpinner />
        </div>
      ) : error ? (
        <div style={{ fontSize: 13, color: LOSS }}>{error}</div>
      ) : !data || data.qualifyingMatchCount === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>Nenhuma partida encontrada com esses filtros.</div>
      ) : combo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
            <span style={{ color: WIN, fontWeight: 600 }}>{combo.wins}V</span>
            <span style={{ color: LOSS, fontWeight: 600 }}>{combo.losses}D</span>
            <span style={{ color: DRAW, fontWeight: 600 }}>{combo.draws}E</span>
            <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{combo.winratePercent}% de aproveitamento</span>
            <span style={{ color: 'var(--text-faint)' }}>{plural(combo.total, 'partida')} juntos</span>
          </div>

          <div>
            {pageMatches.map((m) => (
              <ComboMatchRow key={m.matchId} m={m} />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 6 }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Página {page} de {totalPages}
              </span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <RankingBlock title="Ranking de ACS" sub="Média de ACS nas partidas da equipe" rows={acsRows} />
          <RankingBlock title="Ranking de MVP" sub="Maior ACS da equipe na partida" rows={mvpRows} />
          <RankingBlock title="Ranking de assistências" sub="Total de assistências nas partidas da equipe" rows={assistRows} />
          <RankingBlock title="Ranking de clutches" sub="Rounds ganhos sozinho contra a vantagem numérica" rows={clutchRows} />
          <RankingBlock title="Ranking de first bloods" sub="Primeira eliminação do round" rows={firstBloodRows} />
          <RankingBlock title="Ranking de primeira morte" sub="Primeiro a morrer no round" rows={firstDeathRows} />
        </div>
      )}
    </Modal>
  );
}
