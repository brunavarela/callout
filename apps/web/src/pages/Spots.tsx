import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PLACEHOLDER_AGENTS, type AgentAsset, type Lado } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { compressImageToDataUrl } from '../lib/imageCompress';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

type AgentOption = { id: string; name: string; color: string };
type MapOption = { id: string; name: string };

const MAX_IMAGES = 3;

function emptyForm(defaultMapId: string, defaultAgentId: string) {
  return {
    mapId: defaultMapId,
    side: 'ATK' as Lado,
    agentId: defaultAgentId,
    descricao: '',
    imagens: [] as string[],
  };
}

function ImagePicker({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    const toProcess = Array.from(files).slice(0, room);
    setBusy(true);
    try {
      const compressed = await Promise.all(toProcess.map((f) => compressImageToDataUrl(f)));
      onChange([...images, ...compressed]);
    } catch {
      // uma imagem ilegível não deve travar as outras — falha silenciosa aqui
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {images.map((src, i) => (
        <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            onClick={() => onChange(images.filter((_, idx) => idx !== i))}
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,.65)',
              color: '#fff',
              fontSize: 11,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      ))}
      {images.length < MAX_IMAGES && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            width: 72,
            height: 72,
            borderRadius: 10,
            border: '1px dashed var(--surface-border)',
            background: 'transparent',
            color: 'var(--text-faint)',
            fontSize: 20,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? '…' : '+'}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

function CreateSpotModal({
  agents,
  maps,
  onClose,
  onCreate,
}: {
  agents: AgentOption[];
  maps: MapOption[];
  onClose: () => void;
  onCreate: ReturnType<typeof useOutletContext<OutletContext>>['createSpot'];
}) {
  const [form, setForm] = useState(() => emptyForm(maps[0]?.id ?? '', agents[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.mapId !== '' && form.agentId !== '' && form.descricao.trim() !== '';

  async function submit() {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        mapId: form.mapId,
        agentId: form.agentId,
        side: form.side,
        descricao: form.descricao.trim(),
        imagens: form.imagens,
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
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 520, maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto', padding: 22 }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17, marginBottom: 16 }}>Novo spot</div>

        {maps.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Nenhum mapa cadastrado ainda.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <select
              className="input-field"
              value={form.mapId}
              onChange={(e) => setForm((f) => ({ ...f, mapId: e.target.value }))}
              style={{ padding: '10px 13px', fontSize: 13 }}
            >
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={form.agentId}
              onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}
              style={{ padding: '10px 13px', fontSize: 13 }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
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

        <textarea
          placeholder="Descrição do spot — como jogar, onde mirar, timing…"
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          rows={4}
          className="input-field"
          style={{ width: '100%', padding: '10px 13px', fontSize: 13, marginBottom: 14, resize: 'none' }}
        />

        <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>IMAGENS (ATÉ {MAX_IMAGES})</div>
        <ImagePicker images={form.imagens} onChange={(imagens) => setForm((f) => ({ ...f, imagens }))} />

        {error && <div style={{ color: 'var(--acc, #EF4958)', fontSize: 12.5, margin: '16px 0 0' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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
  const { spots, spotsError, spotsLoading, loadSpots, createSpot, agents: realAgents, loadAgents, maps: realMaps, loadMaps } = useOutletContext<OutletContext>();
  const [query, setQuery] = useState('');
  const [filterMap, setFilterMap] = useState('Todos');
  const [filterAgent, setFilterAgent] = useState('Todos');
  const [filterSide, setFilterSide] = useState<'Todos' | Lado>('Todos');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (spots === null && !spotsLoading) loadSpots();
  }, [spots, spotsLoading, loadSpots]);

  useEffect(() => {
    if (realAgents === null) loadAgents();
  }, [realAgents, loadAgents]);

  useEffect(() => {
    if (realMaps === null) loadMaps();
  }, [realMaps, loadMaps]);

  // Cai pra paleta placeholder enquanto `agents` carrega ou se a Fase 0
  // item 4 (seed) nunca rodou nesse ambiente. Mapas não têm placeholder —
  // sem seed, o select de mapa fica vazio (ver CreateSpotModal).
  const agentOptions: AgentOption[] =
    realAgents && realAgents.length > 0
      ? realAgents.map((a: AgentAsset) => ({ id: a.uuid, name: a.nome, color: a.cor }))
      : PLACEHOLDER_AGENTS.map((a) => ({ id: a.id, name: a.name, color: a.color }));

  const mapOptions: MapOption[] = (realMaps ?? []).map((m) => ({ id: m.id, name: m.nome }));

  const mapFilterOptions = useMemo(() => (spots ? ['Todos', ...new Set(spots.map((s) => s.mapName))] : ['Todos']), [spots]);
  const agentFilterOptions = useMemo(() => (spots ? ['Todos', ...new Set(spots.map((s) => s.agent))] : ['Todos']), [spots]);

  const filtered = useMemo(() => {
    if (!spots) return [];
    const q = query.trim().toLowerCase();
    return spots.filter((s) => {
      const matchesMap = filterMap === 'Todos' || s.mapName === filterMap;
      const matchesAgent = filterAgent === 'Todos' || s.agent === filterAgent;
      const matchesSide = filterSide === 'Todos' || s.side === filterSide;
      const matchesQuery = q === '' || [s.mapName, s.agent, s.descricao].some((field) => field.toLowerCase().includes(q));
      return matchesMap && matchesAgent && matchesSide && matchesQuery;
    });
  }, [spots, query, filterMap, filterAgent, filterSide]);

  const selectStyle: React.CSSProperties = {
    padding: '9px 12px',
    background: 'var(--input-bg)',
    border: '1px solid var(--surface-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text)',
    fontSize: 12.5,
  };

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>Spots</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{spots?.length ?? 0} spots salvos pelo time</div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na descrição, mapa ou agente…"
          style={{
            marginLeft: 'auto',
            width: 300,
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

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select value={filterMap} onChange={(e) => setFilterMap(e.target.value)} style={selectStyle}>
          {mapFilterOptions.map((m) => (
            <option key={m} value={m}>
              {m === 'Todos' ? 'Todos os mapas' : m}
            </option>
          ))}
        </select>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} style={selectStyle}>
          {agentFilterOptions.map((a) => (
            <option key={a} value={a}>
              {a === 'Todos' ? 'Todos os agentes' : a}
            </option>
          ))}
        </select>
        <select value={filterSide} onChange={(e) => setFilterSide(e.target.value as 'Todos' | Lado)} style={selectStyle}>
          <option value="Todos">Ataque e defesa</option>
          <option value="ATK">Só ataque</option>
          <option value="DEF">Só defesa</option>
        </select>
      </div>

      {spotsError && !spots && (
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{spotsError}</div>
          <button className="btn-secondary" onClick={loadSpots}>
            Tentar de novo
          </button>
        </div>
      )}

      {!spots && !spotsError && <LoadingFill />}

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
              {s.imagens.length > 0 ? (
                <div style={{ display: 'flex', height: 146, borderBottom: '1px solid var(--surface-border)', gap: 1 }}>
                  {s.imagens.map((src, i) => (
                    <img key={i} src={src} alt="" style={{ flex: 1, minWidth: 0, height: '100%', objectFit: 'cover' }} />
                  ))}
                </div>
              ) : (
                <div style={{ height: 146, borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-faint)' }}>
                  Sem imagem
                </div>
              )}
              <div style={{ padding: '15px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: s.agentColor, flex: 'none' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.agent}</span>
                </div>
                {s.descricao && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {s.descricao}
                  </div>
                )}
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

      {creating && <CreateSpotModal agents={agentOptions} maps={mapOptions} onClose={() => setCreating(false)} onCreate={createSpot} />}
    </div>
  );
}
