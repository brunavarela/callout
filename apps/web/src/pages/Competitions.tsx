import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { resolverLado, type CategoriaCompeticao, type Competicao, type Time } from '@callout/shared';
import { apiFetch } from '../lib/api';
import { LoadingFill } from '../components/Spinner';
import { PageHeaderCard, HeaderSubtitle, SegmentedTabs } from '../components/PageHeaderCard';
import { useCardStyle } from '../components/statsPrimitives';
import { statusEfetivo, statusCompeticaoEfetivo, ultimaDataCompeticao } from '../lib/competicoesUtil';

type FiltroCompeticao = CategoriaCompeticao | 'todas';

const FILTROS: Array<{ key: FiltroCompeticao; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'inclusiva', label: 'Inclusivas' },
  { key: 'mista', label: 'Mistas' },
];

type StatusExibicao = 'encerrada' | 'ao_vivo' | 'em_andamento' | 'em_breve';

const STATUS_BADGE: Record<StatusExibicao, { label: string; color: string; bg: string }> = {
  encerrada: { label: 'Encerrada', color: '#fff', bg: 'var(--neg, #EF4958)' },
  em_breve: { label: 'Em breve', color: '#fff', bg: '#3B82F6' },
  em_andamento: { label: 'Em andamento', color: '#0F0F10', bg: 'var(--pos, #18AAB7)' },
  ao_vivo: { label: 'Ao vivo', color: '#fff', bg: 'var(--acc, #EF4958)' },
};

// "Ao vivo" tem prioridade sobre "em andamento" (mesmo status "em_andamento"
// no banco) quando algum confronto tá rolando agora de verdade (ver
// statusEfetivo) -- senão toda competição em andamento ficaria com a
// mesma badge o tempo inteiro, mesmo nos intervalos entre partidas.
// statusCompeticaoEfetivo cobre o caso de a competição já ter começado mas
// continuar "agendada" no banco.
function statusExibicaoCompeticao(competicao: Competicao): StatusExibicao {
  const status = statusCompeticaoEfetivo(competicao);
  if (status === 'encerrada') return 'encerrada';
  if (status === 'agendada') return 'em_breve';
  const aoVivo = competicao.confrontos.some((c) => statusEfetivo(c) === 'ao_vivo');
  return aoVivo ? 'ao_vivo' : 'em_andamento';
}

// Intervalo de datas coberto pelos confrontos já cadastrados -- não tem
// campo próprio de período, é sempre derivado do chaveamento (ver
// competitions.ts no shared), assim nunca destoa das datas reais editadas
// pelo admin.
function periodoCompeticao(competicao: Competicao): string {
  if (competicao.confrontos.length === 0) return 'Datas a definir';
  const tempos = competicao.confrontos.map((c) => new Date(c.data).getTime()).sort((a, b) => a - b);
  const fmt = (t: number) => {
    const d = new Date(t);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const inicio = tempos[0]!;
  const fim = tempos[tempos.length - 1]!;
  return inicio === fim ? fmt(inicio) : `${fmt(inicio)} – ${fmt(fim)}`;
}

// Só dá pra saber o campeão depois que a Grande Final tiver um placar
// decisivo -- resolverLado já lida com "ainda não decidido" devolvendo
// time null, então isso naturalmente fica escondido até lá.
function vencedorCompeticao(competicao: Competicao): Time | null {
  const final = competicao.confrontos.find((c) => c.chave === 'final');
  if (!final) return null;
  return resolverLado({ tipo: 'vencedor', confrontoId: final.id }, competicao.confrontos, competicao.times).time;
}

function CompetitionCard({ competicao, onClick }: { competicao: Competicao; onClick: () => void }) {
  const cardStyle = useCardStyle();
  const badge = STATUS_BADGE[statusExibicaoCompeticao(competicao)];
  const vencedor = vencedorCompeticao(competicao);

  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Imagem ocupa só a metade de cima do card (não o card inteiro) --
          encaixa melhor com o formato das artes/logos de campeonato, que
          normalmente não são retrato o bastante pra cobrir um card alto. */}
      <div
        style={{
          height: 110,
          flex: 'none',
          backgroundImage: competicao.capaUrl ? `url(${competicao.capaUrl})` : 'linear-gradient(160deg, color-mix(in srgb, var(--acc, #EF4958) 30%, var(--surface)) 0%, var(--surface) 65%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 16, lineHeight: 1.25 }}>{competicao.nome}</div>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 10.5,
              fontWeight: 700,
              color: badge.color,
              background: badge.bg,
              flex: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {statusExibicaoCompeticao(competicao) === 'ao_vivo' && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.color, flex: 'none' }} />
            )}
            {badge.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{periodoCompeticao(competicao)}</span>
          {vencedor && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#E8B339' }}>
              {vencedor.logoUrl ? (
                <img src={vencedor.logoUrl} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none' }} />
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: 2, background: vencedor.cor, flex: 'none' }} />
              )}
              {vencedor.nome} campeã
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function FiltroCategorias({ filtro, setFiltro }: { filtro: FiltroCompeticao; setFiltro: (f: FiltroCompeticao) => void }) {
  return <SegmentedTabs value={filtro} onChange={setFiltro} options={FILTROS} />;
}

// Só pra saber pra qual aba (filtro) voltar quando alguém sai do detalhe
// de uma competição específica (ver CompetitionDetail -- o link do card
// passa a query string atual no state da navegação, e o breadcrumb volta
// com ela).
const FILTROS_VALIDOS = new Set<string>(FILTROS.map((f) => f.key));
function filtroDaUrl(valor: string | null): FiltroCompeticao {
  return valor && FILTROS_VALIDOS.has(valor) ? (valor as FiltroCompeticao) : 'todas';
}

export function Competitions() {
  const navigate = useNavigate();
  const location = useLocation();
  const cardStyle = useCardStyle();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtro, setFiltroState] = useState<FiltroCompeticao>(() => filtroDaUrl(searchParams.get('filtro')));
  const [dados, setDados] = useState<Competicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Guarda o filtro atual na URL (?filtro=mista) -- é assim que o
  // breadcrumb de volta em CompetitionDetail sabe pra qual aba retornar,
  // em vez de sempre cair na aba padrão.
  function setFiltro(f: FiltroCompeticao) {
    setFiltroState(f);
    setSearchParams(f === 'todas' ? {} : { filtro: f }, { replace: true });
  }

  useEffect(() => {
    let cancelado = false;
    apiFetch<Competicao[]>('/competicoes')
      .then((r) => {
        if (!cancelado) setDados(r);
      })
      .catch(() => {
        if (!cancelado) setErro('Não deu pra carregar as competições. Tenta recarregar a página.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Mais atual -> mais antiga (da esquerda pra direita, já que o grid
  // preenche nessa ordem), pela data do último confronto de cada uma.
  const filtradas = useMemo(
    () =>
      (dados ?? [])
        .filter((c) => filtro === 'todas' || c.categorias.includes(filtro))
        .sort((a, b) => ultimaDataCompeticao(b) - ultimaDataCompeticao(a)),
    [dados, filtro],
  );

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeaderCard
        title="Competições"
        subtitle={<HeaderSubtitle>Escolhe uma competição pra ver chaveamento, resultados e próximos confrontos.</HeaderSubtitle>}
        actions={<FiltroCategorias filtro={filtro} setFiltro={setFiltro} />}
      />

      {erro ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{erro}</div>
      ) : dados === null ? (
        <LoadingFill />
      ) : filtradas.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Nenhuma competição nessa categoria ainda.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtradas.map((competicao) => (
            <CompetitionCard key={competicao.id} competicao={competicao} onClick={() => navigate(`/competicoes/${competicao.id}`, { state: { voltarPara: location.search } })} />
          ))}
        </div>
      )}
    </div>
  );
}
