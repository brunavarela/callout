import { useMemo, useState } from 'react';
import { competicoes, resolverLado, type CategoriaCompeticao, type Competicao, type Confronto, type Time } from '../data/competitions';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const WIN = 'var(--pos, #18AAB7)';

const FILTROS: Array<{ key: CategoriaCompeticao; label: string }> = [
  { key: 'mista', label: 'Mistas' },
  { key: 'inclusiva', label: 'Inclusivas' },
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

function YoutubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M62.603 16.596a8.06 8.06 0 0 0-5.669-5.669C51.964 9.57 31.96 9.57 31.96 9.57s-20.005.04-24.976 1.397a8.06 8.06 0 0 0-5.669 5.669C0 21.607 0 32 0 32s0 10.393 1.356 15.404a8.06 8.06 0 0 0 5.669 5.669C11.995 54.43 32 54.43 32 54.43s20.005 0 24.976-1.356a8.06 8.06 0 0 0 5.669-5.669C64 42.434 64 32 64 32s-.04-10.393-1.397-15.404z"
        fill="#FF0000"
      />
      <path d="M25.592 41.612L42.187 32l-16.596-9.612z" fill="#fff" />
    </svg>
  );
}

function TwitchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size * 2} height={size} viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M71.06 3.683l-1.194 3.88.027 17.9h4.45v2.388h2.388l2.388-2.388h4.18l7.76-7.76V3.683h-20zm17.9 12.836l-3.284 3.284h-5.373l-2.985 2.985v-2.985H72.85V5.772h16.12V16.52zm-5.373-6.866h2.1v5.97h-2.1v-5.97zm-5.373 0h2.1v5.97h-2.1v-5.97zm25.373 27.76v14.03l-7.76 5.373H91.06V54.43l-3.582 2.388H83.3V54.43l-2.687 2.388h-7.76l-2.388-2.388-.597 2.388-6.85-.018-2.7-2.37-.3 2.388-7.76-.018-.3-2.37-2.1 2.37-11.94.018-2.388-1.194v1.194H28.97l-7.164-4.478-4.478-4.478v-19.7h9.254l4.478 4.478H51.36V28.16h16.716v4.478h4.18v2.388l2.388-2.388h5.075l4.478-4.478h9.552v4.478h5.075zM28.97 34.728h-4.18V30.25H19.42v16.716l3.284 3.582h6.27v-5.672h-4.18V40.1h4.18v-5.373zm22.388 0h-5.373v10.15h-2.1v-10.15h-5.075v10.15h-2.1v-10.15H31.06v15.82h16.716l3.582-3.582v-12.24zm7.164 0H53.45v15.82h5.075v-15.82zm0-4.478H53.45v2.388h5.075V30.25zm11.642 4.478h-4.18V30.25h-5.373v16.716l3.284 3.582h6.27v-5.672h-4.18V40.1h4.18v-5.373zm13.73 0h-8.358l-3.284 3.284v8.955l3.582 3.582h8.06v-5.672h-5.97V40.1h5.97v-5.373zm17.612 3.284l-3.582-3.284h-6.27V30.25h-5.672v20.298h5.672V40.1h4.18v10.448h5.672V38.01z"
        fill="#6441a4"
        fillRule="evenodd"
      />
    </svg>
  );
}

function AssistaLinks({ competicao }: { competicao: Competicao }) {
  if (!competicao.linkTwitch && !competicao.linkYoutube) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--text-faint)' }}>ASSISTIR</span>
      {competicao.linkTwitch && (
        <a href={competicao.linkTwitch} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ width: 30, height: 30 }} title="Assistir na Twitch">
          <TwitchIcon size={14} />
        </a>
      )}
      {competicao.linkYoutube && (
        <a href={competicao.linkYoutube} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ width: 30, height: 30 }} title="Assistir no YouTube">
          <YoutubeIcon size={16} />
        </a>
      )}
    </div>
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
        <AssistaLinks competicao={competicao} />
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

function FiltroCategorias({ filtro, setFiltro }: { filtro: CategoriaCompeticao; setFiltro: (f: CategoriaCompeticao) => void }) {
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
  const [filtro, setFiltro] = useState<CategoriaCompeticao>('mista');
  const filtradas = useMemo(() => competicoes.filter((c) => c.categorias.includes(filtro)), [filtro]);

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
