// "Cobrinha" girando — arco com gradiente que esmaece da cor de ação do
// tema até transparente, mascarado em anel e rotacionando (reaproveita a
// keyframe `spin` já usada no ícone de sync do AppShell).
export function SnakeSpinner({ size = 44, color = 'var(--acc, #EF4958)' }: { size?: number; color?: string }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(from 0deg, transparent 0deg, ${color} 300deg, transparent 360deg)`,
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))',
        animation: 'spin 900ms linear infinite',
      }}
    />
  );
}

// Centralizado nos dois eixos dentro do espaço de conteúdo (abaixo do
// header, que fica fixo) — minHeight aproxima a altura que a página
// carregada ocupa, pra centralizar de verdade e não só no topo.
export function LoadingFill() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 260px)' }}>
      <SnakeSpinner />
    </div>
  );
}
