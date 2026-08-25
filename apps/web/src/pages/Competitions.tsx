import { useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { resolverLado, type CategoriaCompeticao, type Competicao, type Confronto, type Time } from '@callout/shared';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/session';
import { LoadingFill } from '../components/Spinner';

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

type PatchConfronto = { status: Confronto['status']; placarA: number | null; placarB: number | null };

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
      <span style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap' }}>Opções pra assistir:</span>
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

const scoreInputStyle: React.CSSProperties = {
  width: 42,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 12,
  padding: '4px 2px',
  textAlign: 'center',
};

function EdicaoConfronto({
  confronto,
  ladoA,
  ladoB,
  onCancelar,
  onSalvar,
}: {
  confronto: Confronto;
  ladoA: { time: Time | null; rotulo: string };
  ladoB: { time: Time | null; rotulo: string };
  onCancelar: () => void;
  onSalvar: (patch: PatchConfronto) => Promise<void>;
}) {
  const [placarA, setPlacarA] = useState(confronto.placarA);
  const [placarB, setPlacarB] = useState(confronto.placarB);
  const [status, setStatus] = useState(confronto.status);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await onSalvar({ status, placarA, placarB });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TimeChip time={ladoA.time} rotulo={ladoA.rotulo} />
        <input
          type="number"
          value={placarA ?? ''}
          onChange={(e) => setPlacarA(e.target.value === '' ? null : Number(e.target.value))}
          style={scoreInputStyle}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TimeChip time={ladoB.time} rotulo={ladoB.rotulo} />
        <input
          type="number"
          value={placarB ?? ''}
          onChange={(e) => setPlacarB(e.target.value === '' ? null : Number(e.target.value))}
          style={scoreInputStyle}
        />
      </div>
      <select value={status} onChange={(e) => setStatus(e.target.value as Confronto['status'])} className="input-field" style={{ fontSize: 11, padding: '6px 8px' }}>
        <option value="agendada">Agendada</option>
        <option value="ao_vivo">Ao vivo</option>
        <option value="encerrada">Encerrada</option>
      </select>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancelar} disabled={salvando} className="btn-secondary" style={{ flex: 1, padding: '5px 8px', fontSize: 11, justifyContent: 'center' }}>
          Cancelar
        </button>
        <button onClick={salvar} disabled={salvando} className="btn-primary" style={{ flex: 1, padding: '5px 8px', fontSize: 11, justifyContent: 'center' }}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function MatchCard({
  confronto,
  competicao,
  editavel,
  onSalvar,
}: {
  confronto: Confronto;
  competicao: Competicao;
  editavel: boolean;
  onSalvar?: (confrontoId: string, patch: PatchConfronto) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: confronto.status === 'ao_vivo' ? 'var(--acc, #EF4958)' : 'var(--text-faint)', fontWeight: confronto.status === 'ao_vivo' ? 700 : 400 }}>
            {STATUS_LABEL[confronto.status]}
          </span>
          {editavel && !editando && (
            <button onClick={() => setEditando(true)} title="Editar placar" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Pencil size={11} />
            </button>
          )}
        </span>
      </div>
      {editando ? (
        <EdicaoConfronto
          confronto={confronto}
          ladoA={a}
          ladoB={b}
          onCancelar={() => setEditando(false)}
          onSalvar={async (patch) => {
            await onSalvar?.(confronto.id, patch);
            setEditando(false);
          }}
        />
      ) : (
        <div>
          <LadoRow lado={a} placar={confronto.placarA} destaque={aVenceu} />
          <div style={{ borderTop: '1px solid var(--divider)' }} />
          <LadoRow lado={b} placar={confronto.placarB} destaque={bVenceu} />
        </div>
      )}
    </div>
  );
}

function Banda({
  titulo,
  cor,
  confrontos,
  rodadaDe,
  maxRodada,
  competicao,
  editavel,
  onSalvar,
}: {
  titulo: string;
  cor: string;
  confrontos: Confronto[];
  rodadaDe: Map<string, number>;
  maxRodada: number;
  competicao: Competicao;
  editavel: boolean;
  onSalvar?: (confrontoId: string, patch: PatchConfronto) => Promise<void>;
}) {
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
            <MatchCard key={c.id} confronto={c} competicao={competicao} editavel={editavel} onSalvar={onSalvar} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Chaveamento({
  competicao,
  editavel,
  onSalvar,
}: {
  competicao: Competicao;
  editavel: boolean;
  onSalvar?: (confrontoId: string, patch: PatchConfronto) => Promise<void>;
}) {
  const rodadaDe = useMemo(() => calcularRodadas(competicao.confrontos), [competicao]);
  const superior = competicao.confrontos.filter((c) => c.chave === 'superior');
  const inferior = competicao.confrontos.filter((c) => c.chave === 'inferior');
  const final = competicao.confrontos.find((c) => c.chave === 'final');
  const maxRodada = Math.max(1, ...[...superior, ...inferior].map((c) => rodadaDe.get(c.id) ?? 1));

  return (
    <div style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 24, overflowX: 'auto' }}>
      <Banda titulo="CHAVE SUPERIOR" cor="var(--acc, #EF4958)" confrontos={superior} rodadaDe={rodadaDe} maxRodada={maxRodada} competicao={competicao} editavel={editavel} onSalvar={onSalvar} />
      {superior.length > 0 && inferior.length > 0 && <div style={{ borderTop: '1px solid var(--divider)' }} />}
      <Banda titulo="CHAVE INFERIOR" cor="var(--text-muted)" confrontos={inferior} rodadaDe={rodadaDe} maxRodada={maxRodada} competicao={competicao} editavel={editavel} onSalvar={onSalvar} />
      {final && (
        <>
          <div style={{ borderTop: '1px solid var(--divider)' }} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 210 }}>
              <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--acc, #EF4958)', textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>GRANDE FINAL</div>
              <MatchCard confronto={final} competicao={competicao} editavel={editavel} onSalvar={onSalvar} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <AssistaLinks competicao={competicao} />
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
  const { adminMode } = useSession();
  const [filtro, setFiltro] = useState<CategoriaCompeticao>('mista');
  const [dados, setDados] = useState<Competicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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

  const filtradas = useMemo(() => (dados ?? []).filter((c) => c.categorias.includes(filtro)), [dados, filtro]);

  async function salvarConfronto(competicaoId: string, confrontoId: string, patch: PatchConfronto) {
    const atualizado = await apiFetch<Confronto>(`/competicoes/${competicaoId}/confrontos/${confrontoId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setDados((prev) =>
      prev?.map((c) => (c.id !== competicaoId ? c : { ...c, confrontos: c.confrontos.map((cf) => (cf.id === confrontoId ? atualizado : cf)) })) ?? prev,
    );
  }

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

      {erro ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{erro}</div>
      ) : dados === null ? (
        <LoadingFill />
      ) : filtradas.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Nenhuma competição nessa categoria ainda.</div>
      ) : (
        filtradas.map((competicao) => (
          <div key={competicao.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ResumoCompeticao competicao={competicao} />
            <Chaveamento
              competicao={competicao}
              editavel={adminMode}
              onSalvar={(confrontoId, patch) => salvarConfronto(competicao.id, confrontoId, patch)}
            />
          </div>
        ))
      )}
    </div>
  );
}
