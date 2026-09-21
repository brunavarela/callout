import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter } from 'lucide-react';
import { cardStyle, glassHeaderStyle } from './statsPrimitives';
import { useTheme } from '../lib/theme';
import { Modal, ModalHeader } from './Modal';

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
  centerContent,
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
  // Filtros centralizados no eixo X/Y do card inteiro (não só do espaço
  // sobrando depois do título) -- padrão novo de 21/09/2026, headerpage de
  // uma linha só (Painel individual e da equipe). `actions` continua fixo
  // no canto direito, sem competir de layout com isso (position:absolute
  // sai do fluxo normal). Página nova usa isso; `filters`/`resultCount`
  // abaixo continuam existindo só pras páginas que ainda não migraram pro
  // padrão novo (2ª linha com borda em cima).
  centerContent?: ReactNode;
  filters?: ReactNode;
  resultCount?: ReactNode;
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const hasFilterRow = !!filters || !!resultCount;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    // position+zIndex aqui é necessário: com "Cards transparentes" ligado,
    // o backdrop-filter cria um novo stacking context nesse próprio div, e
    // sem isso o painel de opções do Select (position:absolute lá dentro)
    // ficava preso atrás do conteúdo da página que vem depois no DOM
    // (cards do painel etc.), mesmo com z-index alto -- o z-index dele só
    // valia dentro desse contexto, nunca contra os irmãos do header.
    <div style={{ ...cardStyle, ...(theme.glassCards ? glassHeaderStyle : {}), padding: '14px 20px', position: 'relative', zIndex: 20 }}>
      <div className="headerpage-row" style={{ display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', gap: 14, flexWrap: 'wrap' }}>
        {backTo && (
          <button onClick={() => navigate(backTo)} title={backLabel} className="btn-icon" style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none' }}>
            <ArrowLeft size={15} strokeWidth={1.75} />
          </button>
        )}
        {leading}
        <div className="headerpage-title-block" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: '-.02em', margin: 0, whiteSpace: 'nowrap' }}>{title}</h1>
            {titleAdornment}
          </div>
          {subtitle}
        </div>
        {(actions || centerContent) && (
          <div className="headerpage-actions" style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
            {actions}
            {/* Só existe em telas estreitas (.headerpage-filters-btn no
                CSS) -- lado a lado com `actions` (ex.: "Encontre
                jogadores"). Abre num modal os mesmos filtros que, em telas
                largas, aparecem centralizados no card (.headerpage-center
                logo abaixo) -- pedido de 21/09/2026, depois de "cola tudo
                embaixo do título" ter ficado bagunçado no celular. */}
            {centerContent && (
              <button type="button" className="btn-secondary headerpage-filters-btn" onClick={() => setMobileFiltersOpen(true)}>
                <Filter size={14} strokeWidth={2} />
                Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Centralizado de verdade (position:absolute) só a partir de 769px --
          em telas estreitas some (display:none), os mesmos filtros
          aparecem só dentro do modal do botão "Filtros" acima. */}
      {centerContent && <div className="headerpage-center">{centerContent}</div>}

      {centerContent && mobileFiltersOpen && (
        // noScroll -- sem isso o Modal usa overflowY:auto, que corta o
        // painel de opções do Select (position:absolute) assim que ele
        // tenta abrir pra fora da caixa (achado em 21/09/2026, testando no
        // celular). Os filtros aqui dentro são poucos e curtos, não
        // precisam de scroll próprio mesmo. closeOnBackdrop=false -- só sai
        // pelo X ou "Aplicar" (pedido de 21/09/2026, clicar fora sem querer
        // enquanto mexe num Select por dentro fechava o modal por acidente).
        <Modal onClose={() => setMobileFiltersOpen(false)} width={380} padding={30} noScroll closeOnBackdrop={false}>
          <ModalHeader title="Filtros" onClose={() => setMobileFiltersOpen(false)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'stretch' }}>{centerContent}</div>
          <button type="button" className="btn-primary" style={{ width: '100%', marginTop: 22 }} onClick={() => setMobileFiltersOpen(false)}>
            Aplicar
          </button>
        </Modal>
      )}

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

// Switch em pílula (trilha única, aba ativa em destaque) -- visual extraído
// do filtro de categorias de Competitions.tsx (21/09/2026), reusado pra
// qualquer alternância de 2+ opções no header de uma página (ex.: Equipe/
// Individual em Spots.tsx). Vai logo abaixo do subtitle, dentro do próprio
// `subtitle` (envolve HeaderSubtitle + esse componente numa coluna).
export function SegmentedTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ key: T; label: string }> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 40, gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: '0 4px', flex: 'none' }}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            background: value === o.key ? 'var(--acc, #EF4958)' : 'transparent',
            color: value === o.key ? 'var(--acc-text, #141415)' : 'var(--text-muted)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
