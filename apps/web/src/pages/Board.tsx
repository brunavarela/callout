import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { StratItem as StratItemDTO } from '@callout/shared';
import { MapSchematic } from '../components/MapSchematic';
import { boardArrows, boardCallouts } from '../data/mock';
import type { OutletContext } from '../components/AppShell';

const TOOLS = [
  { id: 'agente', icon: 'AG', title: 'Agente' },
  { id: 'seta', icon: '↗', title: 'Seta' },
  { id: 'linha', icon: '∕', title: 'Linha' },
  { id: 'smoke', icon: '◍', title: 'Smoke' },
  { id: 'borracha', icon: '⌫', title: 'Borracha' },
] as const;

type PieceKind = 'agent' | 'smoke' | 'flash' | 'molly';
interface Piece {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: PieceKind;
  color: string;
  agentId?: string;
}

const PIECE_KINDS: readonly PieceKind[] = ['agent', 'smoke', 'flash', 'molly'];

function itemsToPieces(items: StratItemDTO[]): Piece[] {
  return items
    .filter((item): item is StratItemDTO & { kind: PieceKind } => (PIECE_KINDS as readonly string[]).includes(item.kind))
    .map((item) => ({ id: item.id, label: item.label, x: item.x, y: item.y, kind: item.kind, color: item.color, agentId: item.agentId }));
}

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

export function Board() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { strategies, strategiesError, strategiesLoading, loadStrategies, saveStrategy, createStrategy } = useOutletContext<OutletContext>();

  useEffect(() => {
    if (strategies === null && !strategiesLoading) loadStrategies();
  }, [strategies, strategiesLoading, loadStrategies]);

  const strategy = strategies?.find((s) => s.id === id) ?? strategies?.[0] ?? null;

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [tool, setTool] = useState<(typeof TOOLS)[number]['id']>('agente');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  // Troca de estratégia (ou primeira carga): reseta o estado local pro que
  // veio do servidor.
  useEffect(() => {
    if (!strategy) return;
    setPieces(itemsToPieces(strategy.items));
    setDescription(strategy.description);
  }, [strategy?.id]);

  function onPointerDown(pieceId: string) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      dragId.current = pieceId;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100));
    const draggedId = dragId.current;
    setPieces((prev) => prev.map((p) => (p.id === draggedId ? { ...p, x, y } : p)));
  }

  function onPointerUp() {
    dragId.current = null;
  }

  async function handleSave() {
    if (!strategy) return;
    setSaving(true);
    try {
      await saveStrategy(strategy.id, {
        description,
        items: pieces.map((p) => ({ kind: p.kind, label: p.label, x: p.x, y: p.y, color: p.color, agentId: p.agentId })),
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
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await createStrategy({ mapName: 'Bind', side: 'ATK', title: 'Nova estratégia' });
      navigate(`/board/${created.id}`);
    } catch {
      // TODO: mostrar erro de criação
    } finally {
      setCreating(false);
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
    return <div style={{ padding: 26, color: 'var(--text-muted)' }}>Carregando…</div>;
  }

  if (!strategy) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          Nenhuma estratégia salva ainda.
          <button className="btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Criando…' : 'Criar a primeira estratégia'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 26, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden', background: 'var(--surface-sunken)', border: '1px solid var(--surface-border)' }}>
        <div ref={containerRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} style={{ position: 'absolute', inset: 0, touchAction: 'none' }}>
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
          <MapSchematic
            fill="var(--pos08, rgba(24,170,183,.08))"
            preserveAspectRatio="none"
            rounded
            style={{ position: 'absolute', top: '7%', bottom: '7%', left: '12%', right: '12%' }}
          />
          {boardCallouts.map((c) => (
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
          {pieces.map((p) => {
            const isAgent = p.kind === 'agent';
            return (
              <div
                key={p.id}
                onPointerDown={onPointerDown(p.id)}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%,-50%)',
                  width: isAgent ? 36 : 24,
                  height: isAgent ? 36 : 24,
                  borderRadius: isAgent ? 10 : '50%',
                  background: isAgent ? p.color : 'rgba(18,18,19,.6)',
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
                {p.label}
              </div>
            );
          })}
        </div>

        <div style={{ position: 'absolute', left: 18, top: 18, display: 'flex', gap: 5, background: 'rgba(18,18,19,.92)', border: '1px solid var(--input-border)', borderRadius: 12, padding: 6 }}>
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                title={t.title}
                onClick={() => setTool(t.id)}
                style={{
                  width: 34,
                  height: 34,
                  border: 'none',
                  borderRadius: 8,
                  background: active ? 'var(--acc, #EF4958)' : 'transparent',
                  color: active ? '#141415' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 18, bottom: 18, fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)' }}>
          {strategy.mapName.toUpperCase()} · {strategy.side === 'ATK' ? 'ATAQUE' : 'DEFESA'} · ARRASTE OS ÍCONES
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
          <button
            onClick={handleCreate}
            disabled={creating}
            title="Nova estratégia"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--acc, #EF4958)', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}
          >
            +
          </button>
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
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 3 }}>{s.mapName}</div>
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
    </div>
  );
}
