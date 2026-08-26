import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import type { Lado, StratItem as StratItemDTO } from '@callout/shared';
import { PLACEHOLDER_AGENTS } from '@callout/shared';
import { MapSchematic } from '../components/MapSchematic';
import { boardArrows, boardCallouts } from '../data/mock';
import type { OutletContext } from '../components/AppShell';
import { agentImageUrl } from '../lib/agentImages';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingFill } from '../components/Spinner';
import { Select } from '../components/Select';

const TOOLS = [
  { id: 'agente', icon: 'AG', title: 'Agente' },
  { id: 'smoke', icon: '◍', title: 'Smoke', image: '/img/others/smoke.png' },
  { id: 'flash', icon: '⚡', title: 'Flash', image: '/img/others/bang.png' },
  { id: 'molly', icon: '●', title: 'Molly' },
  { id: 'spike', icon: 'SP', title: 'Spike', image: '/img/others/spike.png' },
  { id: 'seta', icon: '↗', title: 'Seta' },
  { id: 'linha', icon: '∕', title: 'Linha' },
  { id: 'borracha', icon: '⌫', title: 'Borracha' },
] as const;

type PieceKind = 'agent' | 'smoke' | 'flash' | 'molly' | 'spike';
interface Piece {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: PieceKind;
  color: string;
  agentId?: string;
}

type Point = { x: number; y: number };
type ShapeKind = 'arrow' | 'line';
interface Shape {
  id: string;
  kind: ShapeKind;
  color: string;
  points: [Point, Point];
}

const PIECE_KINDS: readonly PieceKind[] = ['agent', 'smoke', 'flash', 'molly', 'spike'];
const SHAPE_KINDS: readonly ShapeKind[] = ['arrow', 'line'];
const SHAPE_COLOR = 'var(--acc, #EF4958)';

const KIND_META: Record<Exclude<PieceKind, 'agent'>, { label: string; color: string }> = {
  smoke: { label: 'S', color: '#18AAB7' },
  flash: { label: 'F', color: '#FCFCFC' },
  molly: { label: 'M', color: '#EF4958' },
  spike: { label: 'SP', color: '#F2994A' },
};

// Ícones reais pros pieces de smoke/flash/spike (o usuário subiu esses
// PNGs em public/img/others) — molly continua só cor+letra, sem imagem
// própria ainda.
const KIND_IMAGE: Partial<Record<PieceKind, string>> = {
  smoke: '/img/others/smoke.png',
  flash: '/img/others/bang.png',
  spike: '/img/others/spike.png',
};

function itemsToPieces(items: StratItemDTO[]): Piece[] {
  return items
    .filter((item): item is StratItemDTO & { kind: PieceKind } => (PIECE_KINDS as readonly string[]).includes(item.kind))
    .map((item) => ({ id: item.id, label: item.label, x: item.x, y: item.y, kind: item.kind, color: item.color, agentId: item.agentId }));
}

function itemsToShapes(items: StratItemDTO[]): Shape[] {
  return items
    .filter((item): item is StratItemDTO & { kind: ShapeKind } => (SHAPE_KINDS as readonly string[]).includes(item.kind) && (item.points?.length ?? 0) >= 2)
    .map((item) => ({ id: item.id, kind: item.kind, color: item.color, points: [item.points![0]!, item.points![1]!] }));
}

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

// Antes toda estratégia nova nascia com mapName: 'Bind' fixo no código —
// por isso só a Bind aparecia. Agora escolhe o mapa de verdade (mesmo
// catálogo que Spots usa) antes de criar.
function CreateStrategyModal({
  maps,
  onClose,
  onCreate,
}: {
  maps: Array<{ id: string; nome: string }>;
  onClose: () => void;
  onCreate: (input: { mapName: string; side: Lado; title: string }) => Promise<void>;
}) {
  const [mapName, setMapName] = useState(maps[0]?.nome ?? '');
  const [side, setSide] = useState<Lado>('ATK');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (saving || !mapName) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({ mapName, side, title: title.trim() || 'Nova estratégia' });
      onClose();
    } catch {
      setError('Não foi possível criar a estratégia.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, width: 420, maxWidth: '92vw', padding: 22 }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17, marginBottom: 16 }}>Nova estratégia</div>

        {maps.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Nenhum mapa cadastrado ainda.</div>
        ) : (
          <Select
            value={mapName}
            onChange={setMapName}
            options={maps.map((m) => ({ value: m.nome, label: m.nome }))}
            style={{ width: '100%', padding: '10px 13px', fontSize: 13, marginBottom: 12 }}
          />
        )}

        <input
          className="input-field"
          placeholder="Título (ex.: Rush A com smoke duplo)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', padding: '10px 13px', fontSize: 13, marginBottom: 12 }}
        />

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {(['ATK', 'DEF'] as Lado[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-pill)',
                border: `1px solid ${side === s ? 'var(--acc25, rgba(239,73,88,.25))' : 'var(--surface-border)'}`,
                background: side === s ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                color: side === s ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              {s === 'ATK' ? 'Ataque' : 'Defesa'}
            </button>
          ))}
        </div>

        {error && <div style={{ color: 'var(--acc, #EF4958)', fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1, padding: 11, justifyContent: 'center', fontSize: 13 }} onClick={submit} disabled={saving || !mapName}>
            {saving ? 'Criando…' : 'Criar estratégia'}
          </button>
          <button className="btn-secondary" style={{ padding: '11px 15px', color: 'var(--text-muted)' }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function Board() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { strategies, strategiesError, strategiesLoading, loadStrategies, saveStrategy, createStrategy, deleteStrategy, agents, loadAgents, maps, loadMaps } =
    useOutletContext<OutletContext>();

  useEffect(() => {
    if (strategies === null && !strategiesLoading) loadStrategies();
  }, [strategies, strategiesLoading, loadStrategies]);

  useEffect(() => {
    if (agents === null) loadAgents();
  }, [agents, loadAgents]);

  useEffect(() => {
    if (maps === null) loadMaps();
  }, [maps, loadMaps]);

  // Cai pra paleta placeholder enquanto `agents` carrega ou se a Fase 0
  // item 4 (seed) nunca rodou nesse ambiente.
  const AGENTS = agents && agents.length > 0 ? agents.map((a) => ({ id: a.uuid, name: a.nome, abbrev: a.nome.slice(0, 3).toUpperCase(), color: a.cor })) : PLACEHOLDER_AGENTS;

  // Quando o catálogo real chega, a seleção default (placeholder) não bate
  // com nenhum uuid real — realinha pro primeiro agente real.
  useEffect(() => {
    if (agents && agents.length > 0 && !agents.some((a) => a.uuid === selectedAgentId)) {
      setSelectedAgentId(agents[0]!.uuid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  const strategy = strategies?.find((s) => s.id === id) ?? strategies?.[0] ?? null;

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [pendingPoint, setPendingPoint] = useState<Point | null>(null);
  const [tool, setTool] = useState<(typeof TOOLS)[number]['id']>('agente');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(PLACEHOLDER_AGENTS[0].id);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragId = useRef<string | null>(null);

  // Retângulo (em px, relativo ao container) onde a arte do mapa é
  // efetivamente desenhada. Com object-fit:contain a imagem some com
  // letterbox cuja espessura depende da proporção do container — que muda
  // de tela pra tela. Se as peças usassem % do container inteiro, a mesma
  // posição salva cairia em pontos diferentes do mapa pra cada pessoa
  // (o "empurrado pro lado" que o usuário via). Calculando esse retângulo
  // e ancorando peças/formas nele, x/y% sempre correspondem ao mesmo ponto
  // da arte do mapa, independente do tamanho de tela de quem tá vendo.
  const [artRect, setArtRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  function recomputeArtRect() {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const insetX = cw * 0.12;
    const insetY = ch * 0.07;
    const boxW = cw - insetX * 2;
    const boxH = ch - insetY * 2;
    const img = imgRef.current;
    if (strategy?.mapDisplayIcon && img && img.naturalWidth && img.naturalHeight) {
      const imgAR = img.naturalWidth / img.naturalHeight;
      const boxAR = boxW / boxH;
      let renderW = boxW;
      let renderH = boxH;
      if (imgAR > boxAR) {
        renderH = boxW / imgAR;
      } else {
        renderW = boxH * imgAR;
      }
      setArtRect({ left: insetX + (boxW - renderW) / 2, top: insetY + (boxH - renderH) / 2, width: renderW, height: renderH });
    } else {
      setArtRect({ left: insetX, top: insetY, width: boxW, height: boxH });
    }
  }

  useLayoutEffect(() => {
    recomputeArtRect();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(recomputeArtRect);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy?.id, strategy?.mapDisplayIcon]);

  // Troca de estratégia (ou primeira carga): reseta o estado local pro que
  // veio do servidor.
  useEffect(() => {
    if (!strategy) return;
    setPieces(itemsToPieces(strategy.items));
    setShapes(itemsToShapes(strategy.items));
    setDescription(strategy.description);
  }, [strategy?.id]);

  // Trocar de ferramenta no meio de uma seta/linha (1º clique já feito)
  // cancela o ponto pendente — evita misturar intenção de duas ferramentas.
  useEffect(() => {
    if (tool !== 'seta' && tool !== 'linha') setPendingPoint(null);
  }, [tool]);

  function startDrag(pieceId: string) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (tool === 'borracha') {
        setPieces((prev) => prev.filter((p) => p.id !== pieceId));
        return;
      }
      dragId.current = pieceId;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId.current || !artRef.current) return;
    const rect = artRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100));
    const draggedId = dragId.current;
    setPieces((prev) => prev.map((p) => (p.id === draggedId ? { ...p, x, y } : p)));
  }

  function onPointerUp() {
    dragId.current = null;
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (!artRef.current) return;
    if ((e.target as HTMLElement).closest('[data-piece]')) return;
    const rect = artRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100));
    if (tool === 'agente') {
      const agent = AGENTS.find((a) => a.id === selectedAgentId);
      if (!agent) return;
      setPieces((prev) => [...prev, { id: crypto.randomUUID(), label: agent.abbrev, x, y, kind: 'agent', color: agent.color, agentId: agent.id }]);
    } else if (tool === 'smoke' || tool === 'flash' || tool === 'molly' || tool === 'spike') {
      const meta = KIND_META[tool];
      setPieces((prev) => [...prev, { id: crypto.randomUUID(), label: meta.label, x, y, kind: tool, color: meta.color }]);
    } else if (tool === 'seta' || tool === 'linha') {
      if (!pendingPoint) {
        setPendingPoint({ x, y });
      } else {
        setShapes((prev) => [...prev, { id: crypto.randomUUID(), kind: tool === 'seta' ? 'arrow' : 'line', color: SHAPE_COLOR, points: [pendingPoint, { x, y }] }]);
        setPendingPoint(null);
      }
    }
  }

  function eraseShape(shapeId: string) {
    return (e: React.PointerEvent) => {
      if (tool !== 'borracha') return;
      e.preventDefault();
      e.stopPropagation();
      setShapes((prev) => prev.filter((s) => s.id !== shapeId));
    };
  }

  async function handleSave() {
    if (!strategy) return;
    setSaving(true);
    try {
      await saveStrategy(strategy.id, {
        description,
        items: [
          ...pieces.map((p) => ({ kind: p.kind, label: p.label, x: p.x, y: p.y, color: p.color, agentId: p.agentId })),
          ...shapes.map((s) => ({ kind: s.kind, label: '', x: s.points[0].x, y: s.points[0].y, color: s.color, points: s.points })),
        ],
      });
    } catch {
      // TODO: mostrar erro de salvar — por ora falha silenciosa, os dados continuam na tela
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (!strategy) return;
    setPieces(itemsToPieces(strategy.items));
    setShapes(itemsToShapes(strategy.items));
    setPendingPoint(null);
  }

  async function handleCreate(input: { mapName: string; side: Lado; title: string }) {
    const created = await createStrategy(input);
    navigate(`/board/${created.id}`);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const wasActive = confirmDeleteId === strategy?.id;
      await deleteStrategy(confirmDeleteId);
      setConfirmDeleteId(null);
      if (wasActive) navigate('/board');
    } catch {
      setDeleteError('Não foi possível apagar essa estratégia.');
    } finally {
      setDeleting(false);
    }
  }

  if (strategiesError && !strategies) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{strategiesError}</div>
          <button className="btn-secondary" onClick={loadStrategies}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!strategies) {
    return (
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
        <LoadingFill />
      </div>
    );
  }

  if (!strategy) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          Nenhuma estratégia salva ainda.
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Criar a primeira estratégia
          </button>
        </div>
        {showCreateModal && <CreateStrategyModal maps={maps ?? []} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />}
      </div>
    );
  }

  return (
    <div className="grid-responsive-board" style={{ padding: 26, flex: 1, minHeight: 0 }}>
      <div style={{ borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden', background: 'var(--surface-sunken)', border: '1px solid var(--surface-border)' }}>
        <div
          ref={containerRef}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: 'absolute',
            inset: 0,
            touchAction: 'none',
            cursor:
              tool === 'agente' || tool === 'smoke' || tool === 'flash' || tool === 'molly' || tool === 'spike' || tool === 'seta' || tool === 'linha'
                ? 'crosshair'
                : 'default',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -200,
              left: -100,
              width: 560,
              height: 560,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--acc10, rgba(239,73,88,.1)) 0%, transparent 70%)',
            }}
          />
          <div ref={artRef} style={{ position: 'absolute', left: artRect.left, top: artRect.top, width: artRect.width, height: artRect.height }}>
            {strategy.mapDisplayIcon ? (
              <img
                ref={imgRef}
                src={strategy.mapDisplayIcon}
                alt={strategy.mapName}
                onLoad={recomputeArtRect}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            ) : (
              <MapSchematic fill="var(--pos08, rgba(24,170,183,.08))" preserveAspectRatio="none" rounded style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            )}
            {!strategy.mapDisplayIcon && boardCallouts.map((c) => (
              <div
                key={c.label}
                style={{
                  position: 'absolute',
                  left: c.x,
                  top: c.y,
                  fontSize: 10,
                  letterSpacing: '.12em',
                  color: c.label === 'HOOKAH' ? 'var(--acc, #EF4958)' : 'var(--pos, #18AAB7)',
                  pointerEvents: 'none',
                }}
              >
                {c.label}
              </div>
            ))}
            {!strategy.mapDisplayIcon && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {boardArrows.map((a, i) => (
                  <line
                    key={i}
                    x1={a.x1}
                    y1={a.y1}
                    x2={a.x2}
                    y2={a.y2}
                    stroke="var(--acc, #EF4958)"
                    strokeWidth={2.5}
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            )}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                {shapes
                  .filter((s) => s.kind === 'arrow')
                  .map((s) => (
                    <marker key={s.id} id={`arrowhead-${s.id}`} markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto">
                      <path d="M0,0 L8,4 L0,8 Z" fill={s.color} />
                    </marker>
                  ))}
              </defs>
              {shapes.map((s) => (
                <g key={s.id}>
                  <line
                    x1={`${s.points[0].x}%`}
                    y1={`${s.points[0].y}%`}
                    x2={`${s.points[1].x}%`}
                    y2={`${s.points[1].y}%`}
                    stroke={s.color}
                    strokeWidth={2.5}
                    strokeDasharray={s.kind === 'line' ? '8 6' : undefined}
                    strokeLinecap="round"
                    markerEnd={s.kind === 'arrow' ? `url(#arrowhead-${s.id})` : undefined}
                  />
                  <line
                    data-piece="true"
                    onPointerDown={eraseShape(s.id)}
                    x1={`${s.points[0].x}%`}
                    y1={`${s.points[0].y}%`}
                    x2={`${s.points[1].x}%`}
                    y2={`${s.points[1].y}%`}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ pointerEvents: tool === 'borracha' ? 'stroke' : 'none', cursor: 'pointer' }}
                  />
                </g>
              ))}
              {pendingPoint && <circle cx={`${pendingPoint.x}%`} cy={`${pendingPoint.y}%`} r={5} fill={SHAPE_COLOR} stroke="white" strokeWidth={1.5} />}
            </svg>
            {pieces.map((p) => {
              const isAgent = p.kind === 'agent';
              const agentName = isAgent ? AGENTS.find((a) => a.id === p.agentId)?.name : undefined;
              const imageUrl = isAgent ? (agentName ? agentImageUrl(agentName) : null) : (KIND_IMAGE[p.kind] ?? null);
              return (
                <div
                  key={p.id}
                  data-piece="true"
                  onPointerDown={startDrag(p.id)}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: 'translate(-50%,-50%)',
                    width: isAgent ? 36 : 24,
                    height: isAgent ? 36 : 24,
                    borderRadius: isAgent ? 10 : '50%',
                    overflow: isAgent ? 'hidden' : 'visible',
                    background: isAgent ? (imageUrl ? '#141415' : p.color) : 'rgba(18,18,19,.6)',
                    border: isAgent ? '1px solid rgba(255,255,255,.22)' : `2px solid ${p.color}`,
                    color: isAgent ? '#141415' : p.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'grab',
                    userSelect: 'none',
                    boxShadow: isAgent ? '0 8px 18px rgba(0,0,0,.5)' : 'none',
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      draggable={false}
                      style={{ width: isAgent ? '100%' : '68%', height: isAgent ? '100%' : '68%', objectFit: isAgent ? 'cover' : 'contain' }}
                    />
                  ) : (
                    p.label
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            position: 'absolute',
            right: 18,
            top: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'var(--acc, #EF4958)',
            color: '#141415',
            border: 'none',
            borderRadius: 12,
            padding: '9px 16px',
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '.01em',
            fontFamily: 'Inter,sans-serif',
            cursor: 'pointer',
            boxShadow: '0 8px 18px rgba(0,0,0,.35)',
          }}
        >
          <Plus size={15} strokeWidth={2.25} />
          Nova estratégia
        </button>
        <div style={{ position: 'absolute', left: 18, top: 18, display: 'flex', gap: 5, background: 'rgba(18,18,19,.92)', border: '1px solid var(--input-border)', borderRadius: 12, padding: 6 }}>
          {TOOLS.map((t) => {
            const active = tool === t.id;
            const image = 'image' in t ? t.image : undefined;
            return (
              <button
                key={t.id}
                title={t.title}
                onClick={() => setTool(t.id)}
                style={{
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: 8,
                  background: active ? 'var(--acc, #EF4958)' : 'transparent',
                  color: active ? '#141415' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {image ? <img src={image} alt="" draggable={false} style={{ width: 20, height: 20, objectFit: 'contain' }} /> : t.icon}
              </button>
            );
          })}
        </div>
        {tool === 'agente' && (
          <div style={{ position: 'absolute', left: 18, top: 62, right: 18, display: 'flex', flexWrap: 'wrap', gap: 5, background: 'rgba(18,18,19,.92)', border: '1px solid var(--input-border)', borderRadius: 12, padding: 6 }}>
            {AGENTS.map((a) => {
              const active = a.id === selectedAgentId;
              const imageUrl = agentImageUrl(a.name);
              return (
                <button
                  key={a.id}
                  title={a.name}
                  onClick={() => setSelectedAgentId(a.id)}
                  style={{
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,.22)',
                    background: imageUrl ? '#141415' : a.color,
                    cursor: 'pointer',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,.55)',
                    padding: 0,
                  }}
                >
                  {imageUrl ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} /> : a.abbrev.slice(0, 2)}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ position: 'absolute', left: 18, bottom: 18, fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)' }}>
          {strategy.mapName.toUpperCase()} · {strategy.side === 'ATK' ? 'ATAQUE' : 'DEFESA'} · CLIQUE PRA ADICIONAR · ARRASTE PRA MOVER
        </div>
      </div>

      <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 18, letterSpacing: '-.01em' }}>{strategy.title}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '.06em' }}>
            SALVA POR {strategy.createdBy.toUpperCase()} · {strategy.updatedAtLabel}
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva a estratégia…"
          rows={4}
          style={{
            padding: '16px 20px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-3)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--divider)',
            resize: 'none',
            outline: 'none',
            fontFamily: 'Inter,sans-serif',
          }}
        />
        <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, letterSpacing: '.14em', color: 'var(--text-dim)' }}>ESTRATÉGIAS DO TIME · {strategies.length}</span>
        </div>
        <div style={{ overflow: 'auto', padding: '0 12px' }}>
          {strategies.map((s) => {
            const active = s.id === strategy.id;
            return (
              <div
                key={s.id}
                className="strat-item"
                onClick={() => navigate(`/board/${s.id}`)}
                style={{
                  padding: '11px 12px',
                  borderRadius: 11,
                  cursor: 'pointer',
                  background: active ? 'var(--acc10, rgba(239,73,88,.1))' : 'transparent',
                  border: `1px solid ${active ? 'var(--acc25, rgba(239,73,88,.25))' : 'transparent'}`,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: active ? 'var(--acc, #EF4958)' : 'var(--text-2)' }}>{s.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)' }}>{s.side}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(s.id);
                    }}
                    title="Apagar estratégia"
                    style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex' }}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 3 }}>
                  {s.mapName}
                  {s.usageCount > 0 && ` · ${s.usageCount} uso${s.usageCount === 1 ? '' : 's'} · ${s.winratePercent}% WR`}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--divider)', display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1, padding: 11, justifyContent: 'center', fontSize: 13 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button className="btn-secondary" style={{ padding: '11px 15px', color: 'var(--text-muted)' }} onClick={handleClear}>
            Limpar
          </button>
        </div>
      </div>
      {showCreateModal && <CreateStrategyModal maps={maps ?? []} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />}
      {confirmDeleteId && (
        <ConfirmModal
          title="Apagar estratégia?"
          message={`"${strategies.find((s) => s.id === confirmDeleteId)?.title ?? ''}" será apagada pra sempre — inclusive o que tiver desenhado nela.`}
          busy={deleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmDeleteId(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
