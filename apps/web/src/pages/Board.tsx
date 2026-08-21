import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapSchematic } from '../components/MapSchematic';
import { boardArrows, boardCallouts, initialPieces, strategies, type BoardPiece } from '../data/mock';

const TOOLS = [
  { id: 'agente', icon: 'AG', title: 'Agente' },
  { id: 'seta', icon: '↗', title: 'Seta' },
  { id: 'linha', icon: '∕', title: 'Linha' },
  { id: 'smoke', icon: '◍', title: 'Smoke' },
  { id: 'borracha', icon: '⌫', title: 'Borracha' },
] as const;

export function Board() {
  const navigate = useNavigate();
  const { id } = useParams();
  const strategy = strategies.find((s) => s.id === id) ?? strategies[0];

  const [pieces, setPieces] = useState<BoardPiece[]>(initialPieces);
  const [tool, setTool] = useState<(typeof TOOLS)[number]['id']>('agente');
  const [description, setDescription] = useState(strategy.description);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

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
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(3, Math.min(97, ((e.clientY - rect.top) / rect.height) * 100));
    const draggedId = dragId.current;
    setPieces((prev) => prev.map((p) => (p.id === draggedId ? { ...p, x, y } : p)));
  }

  function onPointerUp() {
    dragId.current = null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, minHeight: 0 }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface-sunken)' }}>
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <MapSchematic
            fill="var(--blueprint-fill)"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: '6%', bottom: '6%', left: '12%', right: '12%' }}
          />
          {boardCallouts.map((c) => (
            <div
              key={c.label}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                fontFamily: 'Inter,sans-serif',
                fontSize: 10,
                letterSpacing: '.12em',
                color: 'var(--positive)',
                pointerEvents: 'none',
              }}
            >
              {c.label}
            </div>
          ))}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {boardArrows.map((a, i) => (
              <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="var(--action)" strokeWidth={2} strokeDasharray="7 5" />
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
                  width: isAgent ? 34 : 22,
                  height: isAgent ? 34 : 22,
                  borderRadius: isAgent ? 'var(--radius-md)' : '50%',
                  background: isAgent ? p.color : 'transparent',
                  border: isAgent ? '1px solid rgba(255,255,255,.25)' : `2px solid ${p.color}`,
                  color: isAgent ? 'var(--bg)' : p.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Inter,sans-serif',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'grab',
                  userSelect: 'none',
                  boxShadow: isAgent ? 'var(--shadow-piece)' : 'none',
                }}
              >
                {p.label}
              </div>
            );
          })}
        </div>

        <div style={{ position: 'absolute', left: 20, top: 20, display: 'flex', gap: 6, background: 'rgba(23,23,23,.9)', border: '1px solid rgba(255,255,255,.1)', padding: 6 }}>
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
                  borderRadius: 'var(--radius-sm)',
                  background: active ? 'var(--action)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--text-muted)',
                  fontFamily: 'Inter,sans-serif',
                  fontSize: 11,
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 20, bottom: 20, fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.12em', color: 'var(--text-faint)' }}>
          BIND · ATAQUE · ARRASTE OS ÍCONES
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--divider)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 19, letterSpacing: '-.01em' }}>{strategy.name}</div>
          {strategy.savedBy && (
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              SALVA POR {strategy.savedBy} · {strategy.editedAt}
            </div>
          )}
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
        <div style={{ padding: '16px 20px 8px', fontFamily: 'Inter,sans-serif', fontSize: 10, letterSpacing: '.14em', color: 'var(--text-dim)' }}>
          ESTRATÉGIAS DO TIME · {strategies.length}
        </div>
        <div style={{ overflow: 'auto' }}>
          {strategies.map((s) => {
            const active = s.id === strategy.id;
            return (
              <div
                key={s.id}
                className="strat-item"
                onClick={() => navigate(`/board/${s.id}`)}
                style={{ padding: '12px 20px', borderTop: '1px solid var(--divider-soft)', cursor: 'pointer', background: active ? 'var(--action-tint-item-active)' : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: active ? 'var(--action)' : 'var(--text-2)' }}>{s.name}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-faint)' }}>{s.side}</span>
                </div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>{s.meta}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--divider)', display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1, padding: 11, justifyContent: 'center', fontSize: 13 }}>
            Salvar
          </button>
          <button
            className="btn-secondary"
            style={{ padding: '11px 14px', background: 'transparent', color: 'var(--text-muted)' }}
            onClick={() => setPieces(initialPieces)}
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
