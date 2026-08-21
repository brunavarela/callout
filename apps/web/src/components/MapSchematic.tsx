// Planta esquemática de Bind, usada como placeholder até a implementação real
// consumir o minimapa vindo da valorant-api.com (ver CONTEXT.md §5.3/§5.4).
// Mantém o mesmo tratamento visual em todo lugar: traço fino teal, preenchimento
// quase transparente, grid atrás.

export const BIND_RECTS: readonly [number, number, number, number][] = [
  [40, 40, 110, 70],
  [40, 150, 70, 110],
  [150, 120, 100, 90],
  [250, 60, 110, 90],
  [290, 200, 70, 70],
  [120, 250, 130, 60],
  [60, 300, 60, 60],
  [200, 330, 120, 40],
];

interface MapSchematicProps {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
  rects?: readonly [number, number, number, number][];
  preserveAspectRatio?: string;
  showAccentPoint?: boolean;
}

export function MapSchematic({
  stroke = '#18AAB7',
  fill = 'none',
  strokeWidth = 1.5,
  style,
  className,
  rects = BIND_RECTS,
  preserveAspectRatio,
  showAccentPoint = false,
}: MapSchematicProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      style={{ stroke, fill, strokeWidth, ...style }}
    >
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} />
      ))}
      {showAccentPoint && (
        <rect x={170} y={180} width={18} height={18} style={{ fill: 'var(--action)', stroke: 'none' }} />
      )}
    </svg>
  );
}
