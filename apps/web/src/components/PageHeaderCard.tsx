import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cardStyle, glassHeaderStyle } from './statsPrimitives';
import { useTheme } from '../lib/theme';

// Header padrão de página (card escuro envolvendo título/ações/filtros) —
// ver EquipePainel.tsx, onde esse formato apareceu primeiro. Um componente
// só pra manter as páginas com título+voltar+filtros consistentes entre si
// (antes cada uma tinha seu próprio header solto direto no fundo da
// página, sem o card). Bem flexível de propósito (leading/titleAdornment/
// subtitle/actions/filters todos opcionais) -- páginas bem diferentes
// (lista com filtro, perfil de equipe com avatar, tela de configurações
// sem nada disso) usam o mesmo visual sem forçar a mesma estrutura.
export function PageHeaderCard({
  backTo,
  backLabel = 'Voltar',
  leading,
  title,
  titleAdornment,
  subtitle,
  actions,
  filters,
  resultCount,
}: {
  backTo?: string;
  backLabel?: string;
  leading?: ReactNode;
  title: ReactNode;
  titleAdornment?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  resultCount?: ReactNode;
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const hasFilterRow = !!filters || !!resultCount;

  return (
    // position+zIndex aqui é necessário: com "Cards transparentes" ligado,
    // o backdrop-filter cria um novo stacking context nesse próprio div, e
    // sem isso o painel de opções do Select (position:absolute lá dentro)
    // ficava preso atrás do conteúdo da página que vem depois no DOM
    // (cards do painel etc.), mesmo com z-index alto -- o z-index dele só
    // valia dentro desse contexto, nunca contra os irmãos do header.
    <div style={{ ...cardStyle, ...(theme.glassCards ? glassHeaderStyle : {}), padding: '14px 20px', position: 'relative', zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', gap: 14, flexWrap: 'wrap' }}>
        {backTo && (
          <button onClick={() => navigate(backTo)} title={backLabel} className="btn-icon" style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none' }}>
            <ArrowLeft size={15} strokeWidth={1.75} />
          </button>
        )}
        {leading}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '-.02em', margin: 0, whiteSpace: 'nowrap' }}>{title}</h1>
            {titleAdornment}
          </div>
          {subtitle}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>{actions}</div>}
      </div>

      {hasFilterRow && (
        <div className="dashboard-header-actions" style={{ marginLeft: 0, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--divider)' }}>
          {filters}
          {resultCount && <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--text-muted)', flex: 'none' }}>{resultCount}</span>}
        </div>
      )}
    </div>
  );
}

// Chip compacto de estatísticas ao lado do título (partidas · V-D · WR) —
// mesmo formato do painel da equipe/individual, extraído pra reuso.
export function StatsPill({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--track)', borderRadius: 999, padding: '5px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
      {children}
    </div>
  );
}

// Texto simples abaixo do título, pras páginas que não usam StatsPill.
export function HeaderSubtitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{children}</div>;
}
