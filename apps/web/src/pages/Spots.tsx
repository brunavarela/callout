import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PLACEHOLDER_AGENTS, type AgentAsset, type Lado } from '@callout/shared';
import { MapSchematic } from '../components/MapSchematic';
import type { OutletContext } from '../components/AppShell';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

type Point = { x: number; y: number };
type AgentOption = { id: string; name: string; color: string };

function SpotPreview({
  origin,
  target,
  color,
  mapDisplayIcon,
  interactive,
  onPick,
}: {
  origin: Point | null;
  target: Point | null;
  color: string;
  mapDisplayIcon?: string | null;
  interactive?: boolean;
  onPick?: (p: Point) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent) {
    if (!interactive || !onPick || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
    onPick({ x, y });
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{ position: 'relative', width: '100%', height: '100%', cursor: interactive ? 'crosshair' : 'default', overflow: 'hidden' }}
    >
      {mapDisplayIcon ? (
        <img
          src={mapDisplayIcon}
          alt=""
          style={{ position: 'absolute', top: '6%', bottom: '6%', left: '10%', right: '10%', width: '80%', height: '88%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      ) : (
        <MapSchematic fill="var(--pos08, rgba(24,170,183,.08))" preserveAspectRatio="none" rounded style={{ position: 'absolute', top: '6%', bottom: '6%', left: '10%', right: '10%' }} />
      )}
      {origin && target && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <line x1={`${origin.x}%`} y1={`${origin.y}%`} x2={`${target.x}%`} y2={`${target.y}%`} stroke={color} strokeWidth={2} strokeDasharray="6 5" />
        </svg>
      )}
      {origin && (
        <div
          style={{
            position: 'absolute',
            left: `${origin.x}%`,
            top: `${origin.y}%`,
            transform: 'translate(-50%,-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
            border: '2px solid rgba(255,255,255,.5)',
          }}
        />
      )}
      {target && (
        <div
          style={{
            position: 'absolute',
            left: `${target.x}%`,
            top: `${target.y}%`,
            transform: 'translate(-50%,-50%)',
            width: 12,
            height: 12,
            borderRadius: 4,
            border: `2px solid ${color}`,
          }}
        />
      )}
      {interactive && !origin && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, letterSpacing: '.1em', color: 'var(--text-faint)', pointerEvents: 'none' }}>
          CLIQUE PRA MARCAR A ORIGEM
        </div>
      )}
      {interactive && origin && !target && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, letterSpacing: '.1em', color: 'var(--text-faint)', pointerEvents: 'none' }}>
          CLIQUE PRA MARCAR O ALVO
        </div>
      )}
    </div>
  );
}

function emptyForm(defaultAgentId: string) {
  return {
    mapName: '',
    side: 'ATK' as Lado,
    agentId: defaultAgentId,
    habilidade: '',
    notas: '',
    videoUrl: '',
    origin: null as Point | null,
    target: null as Point | null,
  };
}

function CreateSpotModal({
  agents,
  onClose,
  onCreate,
}: {
  agents: AgentOption[];
  onClose: () => void;
  onCreate: ReturnType<typeof useOutletContext<OutletContext>>['createSpot'];
}) {
  const [form, setForm] = useState(() => emptyForm(agents[0]!.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agent = agents.find((a) => a.id === form.agentId)!;
  const canSubmit = form.mapName.trim() !== '' && form.habilidade.trim() !== '' && !!form.origin && !!form.target;

  function pick(p: Point) {
    setForm((f) => {
      if (!f.origin) return { ...f, origin: p };
      if (!f.target) return { ...f, target: p };
      return { ...f, origin: p, target: null };
    });
  }

  async function submit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        mapName: form.mapName.trim(),
        side: form.side,
        agentId: form.agentId,
        habilidade: form.habilidade.trim(),
        origin: form.origin!,
        target: form.target!,
        videoUrl: form.videoUrl.trim() || undefined,
        notas: form.notas.trim() || undefined,
      });
      onClose();
    } catch {
      setError('Não foi possível salvar o spot.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 640, maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto', padding: 22 }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17, marginBottom: 16 }}>Novo spot</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <input
            className="input-field"
            placeholder="Mapa (ex.: Bind)"
            value={form.mapName}
            onChange={(e) => setForm((f) => ({ ...f, mapName: e.target.value }))}
            style={{ padding: '10px 13px', fontSize: 13 }}
          />
          <input
            className="input-field"
            placeholder="Habilidade (ex.: Snake Bite)"
            value={form.habilidade}
            onChange={(e) => setForm((f) => ({ ...f, habilidade: e.target.value }))}
            style={{ padding: '10px 13px', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['ATK', 'DEF'] as Lado[]).map((side) => (
            <button
              key={side}
              onClick={() => setForm((f) => ({ ...f, side }))}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${form.side === side ? 'var(--acc25, rgba(239,73,88,.25))' : 'var(--surface-border)'}`,
                background: form.side === side ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                color: form.side === side ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {side === 'ATK' ? 'Ataque' : 'Defesa'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {agents.map((a) => {
            const active = a.id === form.agentId;
            return (
              <button
                key={a.id}
                title={a.name}
                onClick={() => setForm((f) => ({ ...f, agentId: a.id }))}
                style={{ width: 30, height: 30, borderRadius: 9, border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,.22)', background: a.color }}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--text-dim)' }}>ORIGEM → ALVO</span>
          {(form.origin || form.target) && (
            <button
              onClick={() => setForm((f) => ({ ...f, origin: null, target: null }))}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 11.5, cursor: 'pointer' }}
            >
              Limpar pontos
            </button>
          )}
        </div>
        <div style={{ height: 220, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)', border: '1px solid var(--surface-border)', marginBottom: 14 }}>
          <SpotPreview origin={form.origin} target={form.target} color={agent.color} interactive onPick={pick} />
        </div>

        <textarea
          placeholder="Notas (opcional)"
          value={form.notas}
          onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          rows={2}
          className="input-field"
          style={{ width: '100%', padding: '10px 13px', fontSize: 13, marginBottom: 12, resize: 'none' }}
        />
        <input
          className="input-field"
          placeholder="Link do clipe (opcional)"
          value={form.videoUrl}
          onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
          style={{ width: '100%', padding: '10px 13px', fontSize: 13, marginBottom: 16 }}
        />

        {error && <div style={{ color: 'var(--acc, #EF4958)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1, padding: 11, justifyContent: 'center', fontSize: 13 }} onClick={submit} disabled={!canSubmit || saving}>
            {saving ? 'Salvando…' : 'Salvar spot'}
          </button>
          <button className="btn-secondary" style={{ padding: '11px 15px', color: 'var(--text-muted)' }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function Spots() {
  const { spots, spotsError, spotsLoading, loadSpots, createSpot, agents: realAgents, loadAgents } = useOutletContext<OutletContext>();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (spots === null && !spotsLoading) loadSpots();
  }, [spots, spotsLoading, loadSpots]);

  useEffect(() => {
    if (realAgents === null) loadAgents();
  }, [realAgents, loadAgents]);

  // Cai pra paleta placeholder enquanto `agents` carrega ou se a Fase 0
  // item 4 (seed) nunca rodou nesse ambiente.
  const agentOptions: AgentOption[] =
    realAgents && realAgents.length > 0
      ? realAgents.map((a: AgentAsset) => ({ id: a.uuid, name: a.nome, color: a.cor }))
      : PLACEHOLDER_AGENTS.map((a) => ({ id: a.id, name: a.name, color: a.color }));

  const filterOptions = useMemo(() => {
    if (!spots) return ['Todos'];
    const maps = [...new Set(spots.map((s) => s.mapName))];
    const agents = [...new Set(spots.map((s) => s.agent))];
    return ['Todos', ...maps, ...agents, 'Ataque'];
  }, [spots]);

  const filtered = useMemo(() => {
    if (!spots) return [];
    const q = query.trim().toLowerCase();
    return spots.filter((s) => {
      const matchesFilter = activeFilter === 'Todos' ? true : activeFilter === 'Ataque' ? s.side === 'ATK' : s.mapName === activeFilter || s.agent === activeFilter;
      const matchesQuery = q === '' || [s.mapName, s.agent, s.habilidade].some((field) => field.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [spots, query, activeFilter]);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Spots</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{spots?.length ?? 0} lineups salvos pelo time</div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por mapa, agente ou habilidade…"
          style={{
            marginLeft: 'auto',
            width: 330,
            padding: '12px 15px',
            background: 'var(--control-bg)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text)',
            fontSize: 13.5,
            outline: 'none',
          }}
        />
        <button className="btn-primary" style={{ padding: '11px 16px', fontSize: 13 }} onClick={() => setCreating(true)}>
          + Novo spot
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filterOptions.map((f) => {
          const active = f === activeFilter;
          return (
            <button
              key={f}
              className="filter-chip"
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${active ? 'var(--acc25, rgba(239,73,88,.25))' : 'var(--surface-border)'}`,
                background: active ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                color: active ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {spotsError && !spots && (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{spotsError}</div>
          <button className="btn-secondary" onClick={loadSpots}>
            Tentar de novo
          </button>
        </div>
      )}

      {!spots && !spotsError && <div style={{ color: 'var(--text-muted)' }}>Carregando…</div>}

      {spots && spots.length === 0 && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          Nenhum spot salvo ainda.
          <button className="btn-primary" onClick={() => setCreating(true)}>
            Criar o primeiro spot
          </button>
        </div>
      )}

      {spots && spots.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {filtered.map((s) => (
            <div key={s.id} className="card-hover-acc" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <div style={{ height: 146, borderBottom: '1px solid var(--surface-border)' }}>
                <SpotPreview origin={s.origin} target={s.target} color={s.agentColor} mapDisplayIcon={s.mapDisplayIcon} />
              </div>
              <div style={{ padding: '15px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: s.agentColor, flex: 'none' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {s.agent} · {s.habilidade}
                  </span>
                </div>
                {s.notas && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>{s.notas}</div>}
                <div style={{ display: 'flex', gap: 7, marginTop: 11, fontSize: 10.5, color: 'var(--text-faint)' }}>
                  <span>{s.mapName}</span>
                  <span>·</span>
                  <span>{s.side === 'ATK' ? 'ATAQUE' : 'DEFESA'}</span>
                  <span>·</span>
                  <span>{s.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <CreateSpotModal agents={agentOptions} onClose={() => setCreating(false)} onCreate={createSpot} />}
    </div>
  );
}
