import { useState } from 'react';
import { Swords } from 'lucide-react';
import type { EquipeOverview, MapWinrate, SimulacaoResult } from '@callout/shared';
import { Modal, ModalHeader } from './Modal';
import { Select } from './Select';
import { SnakeSpinner } from './Spinner';
import { AgentAvatar } from './AgentAvatar';
import { InfoDot, plural } from './statsPrimitives';
import { apiFetch } from '../lib/api';

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';

const PRIORITY_EXPLAIN =
  'Quem tem o pior KDA no grupo escolhe primeiro o próprio melhor agente disponível; quem vem depois cai pra próxima opção se a de cima já tiver sido levada. Só entra agente com pelo menos 4 partidas jogadas (solo ou em equipe) nesse mapa. Sempre tenta fechar uma das 3 composições válidas (1 duelista/1 iniciador/1 controlador/2 sentinelas, 2 duelistas/1 iniciador/1 controlador/1 sentinela, ou 1 duelista/2 iniciadores/1 controlador/1 sentinela) — se não sobrar combinação possível, ignora o tipo e prioriza o KDA mesmo assim.';

const BASIS_LABEL: Record<SimulacaoResult['basis'], (n: number, map: string) => string> = {
  vitorias: (n, map) => `Baseado ${plural(n, 'vitória')} desse grupo em ${map}.`,
  derrotas: (n, map) => `Esse grupo não tem vitória registrada em ${map} ainda — baseado ${plural(n, 'derrota')}.`,
  sem_dados: (_n, map) => `Esse grupo ainda não jogou ${map} junto — sugestão baseada no histórico individual de cada um nesse mapa.`,
};

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function PlayerChip({ name, avatarUrl, selected, disabled, onClick }: { name: string; avatarUrl: string | null; selected: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      title={name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        width: 74,
        padding: '8px 4px',
        borderRadius: 10,
        border: selected ? '1.5px solid var(--acc, #EF4958)' : '1.5px solid transparent',
        background: selected ? 'color-mix(in srgb, var(--acc, #EF4958) 12%, transparent)' : 'var(--track)',
        cursor: disabled && !selected ? 'default' : 'pointer',
        opacity: disabled && !selected ? 0.4 : 1,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--avatar-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(name)}
      </div>
      <span style={{ fontSize: 11, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{name}</span>
    </button>
  );
}

export function SimularEquipeModal({
  equipe,
  topMaps,
  onClose,
}: {
  equipe: EquipeOverview | null;
  topMaps: MapWinrate[];
  onClose: () => void;
}) {
  const [mapId, setMapId] = useState<string | null>(null);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulacaoResult | null>(null);

  const players = (equipe?.members ?? []).filter((m) => m.hasRiotLinked);
  const mapOptions = topMaps.filter((m): m is MapWinrate & { mapId: string } => m.mapId !== null);

  function toggleUser(userId: string) {
    setUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : prev.length < 5 ? [...prev, userId] : prev));
  }

  async function simular() {
    if (!mapId || userIds.length !== 5) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await apiFetch<SimulacaoResult>('/equipe/painel/simular', { method: 'POST', body: JSON.stringify({ mapId, userIds }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu pra simular. Tenta de novo.');
    } finally {
      setLoading(false);
    }
  }

  function reiniciar() {
    setResult(null);
    setError(null);
  }

  return (
    <Modal onClose={onClose} width={560}>
      <ModalHeader title="Simular equipe" onClose={onClose} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '30px 0' }}>
          <SnakeSpinner />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Calculando a melhor composição…</div>
        </div>
      ) : result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
            {BASIS_LABEL[result.basis](result.matchesConsidered, result.mapName)}
            <InfoDot text={PRIORITY_EXPLAIN} align="right" />
          </div>

          {!result.compositionValid && (
            <div style={{ fontSize: 12, color: LOSS, background: 'color-mix(in srgb, var(--neg, #EF4958) 12%, transparent)', borderRadius: 8, padding: '8px 12px' }}>
              Não foi possível encaixar essa composição em nenhum dos 3 tipos válidos com os agentes elegíveis disponíveis — mostrando o melhor encaixe possível mesmo assim.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.players.map((p) => (
              <div key={p.userId} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, background: 'var(--track)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'var(--avatar-bg)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                    {p.avatarUrl ? <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(p.name)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>{p.name}</span>
                  <AgentAvatar agent={p.recommendedAgent} size={28} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 'none' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.recommendedAgent}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{p.role}</span>
                  </div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '.03em',
                      borderRadius: 5,
                      padding: '3px 8px',
                      flex: 'none',
                      color: p.changed ? LOSS : WIN,
                      background: `color-mix(in srgb, ${p.changed ? LOSS : WIN} 16%, transparent)`,
                    }}
                  >
                    {p.changed ? 'TROCA' : 'MANTÉM'}
                  </span>
                </div>
                {p.reason && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.reason}</div>}
              </div>
            ))}
          </div>

          <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={reiniciar}>
            Simular de novo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Mapa</div>
            <Select
              value={mapId ?? ''}
              onChange={setMapId}
              options={mapOptions.map((m) => ({ value: m.mapId, label: m.map }))}
              title="Mapa pra simular"
            />
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Jogadores ({userIds.length}/5)</div>
            {players.length < 5 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>A equipe precisa de pelo menos 5 membros com Riot ID vinculado pra simular.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {players.map((m) => (
                  <PlayerChip key={m.userId} name={m.name} avatarUrl={m.avatarUrl} selected={userIds.includes(m.userId)} disabled={userIds.length >= 5} onClick={() => toggleUser(m.userId)} />
                ))}
              </div>
            )}
          </div>

          {error && <div style={{ fontSize: 12.5, color: LOSS }}>{error}</div>}

          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }} disabled={!mapId || userIds.length !== 5} onClick={simular}>
            <Swords size={15} strokeWidth={1.75} />
            Iniciar simulação
          </button>
        </div>
      )}
    </Modal>
  );
}
