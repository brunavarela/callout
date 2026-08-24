import { useMemo, useState } from 'react';
import { competicoes, resolverLado, type CategoriaCompeticao, type Competicao, type Confronto, type Time } from '../data/competitions';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const WIN = 'var(--pos, #18AAB7)';

const FILTROS: Array<{ key: CategoriaCompeticao | 'todas'; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'mista', label: 'Mistas' },
  { key: 'inclusiva', label: 'Inclusivas' },
  { key: 'feminina', label: 'Femininas' },
  { key: 'aberta', label: 'Abertas' },
];

const STATUS_LABEL: Record<Confronto['status'], string> = {
  encerrada: 'ENCERRADA',
  ao_vivo: 'AO VIVO',
  agendada: 'AGENDADA',
};

const STATUS_COMPETICAO_LABEL: Record<Competicao['status'], string> = {
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
};

function formatDataConfronto(iso: string): string {
  const d = new Date(iso);
  const hora = d.getHours().toString().padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1} · ${hora}h`;
}

// Rodada = 1 + a maior rodada entre os confrontos que esse aqui referencia
// via vencedor/perdedor. Times fixos não contam. Isso posiciona cada
// confronto na coluna certa do chaveamento sem precisar declarar isso à
// mão pra cada competição.
function calcularRodadas(confrontos: readonly Confronto[]): Map<string, number> {
  const memo = new Map<string, number>();
  function rodadaDe(id: string): number {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    memo.set(id, 1); // guarda contra ciclo acidental nos dados
    const confronto = confrontos.find((c) => c.id === id);
    const deps = confronto ? [confronto.ladoA, confronto.ladoB].filter((l) => l.tipo !== 'time') : [];
    const r = deps.length === 0 ? 1 : 1 + Math.max(...deps.map((d) => rodadaDe((d as { confrontoId: string }).confrontoId)));
    memo.set(id, r);
    return r;
  }
  for (const c of confrontos) rodadaDe(c.id);
  return memo;
}

function TimeChip({ time, rotulo }: { time: Time | null; rotulo: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8.5,
          fontWeight: 700,
          background: time ? time.cor : 'var(--track)',
          color: time ? '#141415' : 'var(--text-faint)',
        }}
      >
        {time ? time.sigla.slice(0, 3) : ''}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: time ? 600 : 400, color: time ? 'var(--text-2)' : 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {rotulo}
      </span>
    </span>
  );
}

function LadoRow({ lado, placar, destaque }: { lado: { time: Time | null; rotulo: string }; placar: number | null; destaque: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px' }}>
      <TimeChip time={lado.time} rotulo={lado.rotulo} />
      <span style={{ fontSize: 13, fontWeight: 700, color: destaque ? WIN : 'var(--text-2)', flex: 'none' }}>{placar ?? '–'}</span>
    </div>
  );
}

function MatchCard({ confronto, competicao }: { confronto: Confronto; competicao: Competicao }) {
  const a = resolverLado(confronto.ladoA, competicao.confrontos, competicao.times);
  const b = resolverLado(confronto.ladoB, competicao.confrontos, competicao.times);
  const decidido = confronto.placarA !== null && confronto.placarB !== null && confronto.placarA !== confronto.placarB;
  const aVenceu = decidido && confronto.placarA! > confronto.placarB!;
  const bVenceu = decidido && confronto.placarB! > confronto.placarA!;

  return (
    <div style={{ ...cardStyle, width: 210, flex: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid var(--divider)', fontSize: 9.5, letterSpacing: '.06em', color: 'var(--text-faint)' }}>
        <span>
          {confronto.id} · {formatDataConfronto(confronto.data)}
        </span>
        <span style={{ color: confronto.status === 'ao_vivo' ? 'var(--acc, #EF4958)' : 'var(--text-faint)', fontWeight: confronto.status === 'ao_vivo' ? 700 : 400 }}>
          {STATUS_LABEL[confronto.status]}
        </span>
      </div>
      <div>
        <LadoRow lado={a} placar={confronto.placarA} destaque={aVenceu} />
        <div style={{ borderTop: '1px solid var(--divider)' }} />
        <LadoRow lado={b} placar={confronto.placarB} destaque={bVenceu} />
      </div>
    </div>
  );
}

function Banda({ titulo, cor, confrontos, rodadaDe, maxRodada, competicao }: { titulo: string; cor: string; confrontos: Confronto[]; rodadaDe: Map<string, number>; maxRodada: number; competicao: Competicao }) {
  if (confrontos.length === 0) return null;
  const colunas: Confronto[][] = Array.from({ length: maxRodada }, (_, i) => confrontos.filter((c) => rodadaDe.get(c.id) === i + 1));

  return (
    <div style={{ display: 'flex', gap: 28 }}>
      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, letterSpacing: '.14em', color: cor, fontWeight: 700, flex: 'none' }}>
        {titulo}
      </div>
      {colunas.map((cards, i) => (
        <div key={i} style={{ width: 210, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
          {cards.map((c) => (
            <MatchCard key={c.id} confronto={c} competicao={competicao} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Chaveamento({ competicao }: { competicao: Competicao }) {
  const rodadaDe = useMemo(() => calcularRodadas(competicao.confrontos), [competicao]);
  const superior = competicao.confrontos.filter((c) => c.chave === 'superior');
  const inferior = competicao.confrontos.filter((c) => c.chave === 'inferior');
  const final = competicao.confrontos.find((c) => c.chave === 'final');
  const maxRodada = Math.max(1, ...[...superior, ...inferior].map((c) => rodadaDe.get(c.id) ?? 1));

  return (
    <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 24, overflowX: 'auto' }}>
      <Banda titulo="CHAVE SUPERIOR" cor="var(--acc, #EF4958)" confrontos={superior} rodadaDe={rodadaDe} maxRodada={maxRodada} competicao={competicao} />
      {superior.length > 0 && inferior.length > 0 && <div style={{ borderTop: '1px solid var(--divider)' }} />}
      <Banda titulo="CHAVE INFERIOR" cor="var(--text-muted)" confrontos={inferior} rodadaDe={rodadaDe} maxRodada={maxRodada} competicao={competicao} />
      {final && (
        <>
          <div style={{ borderTop: '1px solid var(--divider)' }} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 210 }}>
              <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--acc, #EF4958)', textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>GRANDE FINAL</div>
              <MatchCard confronto={final} competicao={competicao} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ResumoCompeticao({ competicao }: { competicao: Competicao }) {
  const proximo = competicao.confrontos
    .filter((c) => c.status !== 'encerrada')
    .sort((a, b) => a.data.localeCompare(b.data))[0];

  return (
    <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--avatar-bg)', flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17 }}>{competicao.nome}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>{competicao.formato}</div>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>FASE</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{competicao.fase}</div>
        </div>
        {proximo && (
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>PRÓXIMO JOGO</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: 'var(--acc, #EF4958)' }}>{formatDataConfronto(proximo.data)}</div>
          </div>
        )}
      </div>
      <span
        style={{
          padding: '6px 13px',
          borderRadius: 'var(--radius-pill)',
          fontSize: 11.5,
          fontWeight: 600,
          flex: 'none',
          background: competicao.status === 'em_andamento' ? 'var(--acc18, rgba(239,73,88,.16))' : 'var(--track)',
          color: competicao.status === 'em_andamento' ? 'var(--acc, #EF4958)' : 'var(--text-muted)',
        }}
      >
        {STATUS_COMPETICAO_LABEL[competicao.status]}
      </span>
    </div>
  );
}

function FiltroCategorias({ filtro, setFiltro }: { filtro: CategoriaCompeticao | 'todas'; setFiltro: (f: CategoriaCompeticao | 'todas') => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 40, gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: '0 4px', flex: 'none' }}>
      {FILTROS.map((f) => (
        <button
          key={f.key}
          onClick={() => setFiltro(f.key)}
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
            background: filtro === f.key ? 'var(--acc, #EF4958)' : 'transparent',
            color: filtro === f.key ? '#141415' : 'var(--text-muted)',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function Competitions() {
  const [filtro, setFiltro] = useState<CategoriaCompeticao | 'todas'>('todas');
  const filtradas = useMemo(() => (filtro === 'todas' ? competicoes : competicoes.filter((c) => c.categorias.includes(filtro))), [filtro]);

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-.025em', margin: 0 }}>Competições</h1>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>Chaveamento, resultados e próximos confrontos.</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <FiltroCategorias filtro={filtro} setFiltro={setFiltro} />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Nenhuma competição nessa categoria ainda.</div>
      ) : (
        filtradas.map((competicao) => (
          <div key={competicao.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ResumoCompeticao competicao={competicao} />
            <Chaveamento competicao={competicao} />
          </div>
        ))
      )}
    </div>
  );
}
