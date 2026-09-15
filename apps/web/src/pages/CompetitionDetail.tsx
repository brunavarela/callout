import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { resolverLado, type Competicao, type Confronto, type Time } from '@callout/shared';
import { apiFetch } from '../lib/api';
import { useSession } from '../lib/session';
import { LoadingFill } from '../components/Spinner';
import { Select } from '../components/Select';
import { statusEfetivo, formatDataConfronto, calcularRodadas } from '../lib/competicoesUtil';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };
const WIN = 'var(--pos, #18AAB7)';

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

function TimeChip({ time, rotulo }: { time: Time | null; rotulo: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {time?.logoUrl ? (
        <img src={time.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 6, objectFit: 'contain', background: 'var(--track)', flex: 'none' }} />
      ) : (
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
      )}
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
  const [status, setStatus] = useState(statusEfetivo(confronto));
  const [salvando, setSalvando] = useState(false);

  // Placar decisivo (os dois preenchidos e diferentes) já significa que a
  // partida acabou — não depende de lembrar de trocar o status também, o
  // que já causou dado inconsistente (placar salvo, status "agendada").
  const decidido = placarA !== null && placarB !== null && placarA !== placarB;
  const statusFinal = decidido ? 'encerrada' : status;

  async function salvar() {
    setSalvando(true);
    try {
      await onSalvar({ status: statusFinal, placarA, placarB });
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
      {decidido ? (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 1px' }}>Encerrada automaticamente — placar decisivo.</div>
      ) : (
        <Select
          value={status}
          onChange={(v) => setStatus(v as Confronto['status'])}
          options={[
            { value: 'agendada', label: 'Agendada' },
            { value: 'ao_vivo', label: 'Ao vivo' },
            { value: 'encerrada', label: 'Encerrada' },
          ]}
          style={{ fontSize: 11, padding: '6px 8px' }}
        />
      )}
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
          <span style={{ color: statusEfetivo(confronto) === 'ao_vivo' ? 'var(--acc, #EF4958)' : 'var(--text-faint)', fontWeight: statusEfetivo(confronto) === 'ao_vivo' ? 700 : 400 }}>
            {STATUS_LABEL[statusEfetivo(confronto)]}
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

// Times de um grupo = quem aparece como lado "time" direto nos confrontos
// dele (só os 2 confrontos de abertura têm isso — os outros 3 referenciam
// vencedor/perdedor de outro confronto do próprio grupo).
function timesDoGrupo(confrontosDoGrupo: Confronto[], times: Time[]): Time[] {
  const ids = new Set<string>();
  for (const c of confrontosDoGrupo) {
    for (const lado of [c.ladoA, c.ladoB]) {
      if (lado.tipo === 'time') ids.add(lado.timeId);
    }
  }
  return times.filter((t) => ids.has(t.id));
}

// V/D por time dentro do grupo, a partir dos confrontos já decididos —
// resolve cada lado (mesmo quando é vencedor/perdedor de outro confronto
// do grupo) pra contar no time de verdade, não no rótulo pendente.
function classificacaoGrupo(timesGrupo: Time[], confrontosGrupo: Confronto[], todosConfrontos: readonly Confronto[], todosTimes: readonly Time[]) {
  const stats = new Map(timesGrupo.map((t) => [t.id, { time: t, vitorias: 0, derrotas: 0 }]));
  for (const c of confrontosGrupo) {
    if (c.placarA === null || c.placarB === null || c.placarA === c.placarB) continue;
    const ladoVencedor = c.placarA > c.placarB ? c.ladoA : c.ladoB;
    const ladoPerdedor = c.placarA > c.placarB ? c.ladoB : c.ladoA;
    const vencedor = resolverLado(ladoVencedor, todosConfrontos, todosTimes).time;
    const perdedor = resolverLado(ladoPerdedor, todosConfrontos, todosTimes).time;
    if (vencedor && stats.has(vencedor.id)) stats.get(vencedor.id)!.vitorias++;
    if (perdedor && stats.has(perdedor.id)) stats.get(perdedor.id)!.derrotas++;
  }
  return [...stats.values()].sort((a, b) => b.vitorias - a.vitorias || a.derrotas - b.derrotas);
}

function GrupoCard({
  nome,
  confrontos,
  competicao,
  editavel,
  onSalvar,
}: {
  nome: string;
  confrontos: Confronto[];
  competicao: Competicao;
  editavel: boolean;
  onSalvar?: (confrontoId: string, patch: PatchConfronto) => Promise<void>;
}) {
  const ordenados = [...confrontos].sort((a, b) => a.id.localeCompare(b.id));
  const timesGrupo = timesDoGrupo(confrontos, competicao.times);
  const classificacao = classificacaoGrupo(timesGrupo, confrontos, competicao.confrontos, competicao.times);

  return (
    <div style={{ ...cardStyle, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '.04em', color: 'var(--acc, #EF4958)' }}>GRUPO {nome}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {classificacao.map((c, i) => (
          <div key={c.time.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderTop: i > 0 ? '1px solid var(--divider)' : 'none' }}>
            <span style={{ width: 14, fontSize: 11, color: i < 2 ? WIN : 'var(--text-faint)', fontWeight: 700, flex: 'none' }}>{i + 1}º</span>
            <TimeChip time={c.time} rotulo={c.time.nome} />
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-faint)', flex: 'none' }}>
              {c.vitorias}V–{c.derrotas}D
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {ordenados.map((c) => (
          <MatchCard key={c.id} confronto={c} competicao={competicao} editavel={editavel} onSalvar={onSalvar} />
        ))}
      </div>
    </div>
  );
}

function FaseDeGrupos({
  competicao,
  editavel,
  onSalvar,
}: {
  competicao: Competicao;
  editavel: boolean;
  onSalvar?: (confrontoId: string, patch: PatchConfronto) => Promise<void>;
}) {
  const porGrupo = useMemo(() => {
    const map = new Map<string, Confronto[]>();
    for (const c of competicao.confrontos) {
      if (c.chave !== 'grupos' || !c.grupo) continue;
      const lista = map.get(c.grupo) ?? [];
      lista.push(c);
      map.set(c.grupo, lista);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [competicao]);

  if (porGrupo.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Fase de grupos</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {porGrupo.map(([nome, confrontos]) => (
          <GrupoCard key={nome} nome={nome} confrontos={confrontos} competicao={competicao} editavel={editavel} onSalvar={onSalvar} />
        ))}
      </div>
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

// Página de uma competição específica (chaveamento completo) -- chegada
// pelo card de seleção em Competitions.tsx. Sem endpoint de item único
// ainda (GET /competicoes só lista tudo, dataset pequeno o bastante pra
// não importar) -- refaz o fetch da lista e acha pelo :id da rota.
export function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adminMode } = useSession();
  const [dados, setDados] = useState<Competicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiFetch<Competicao[]>('/competicoes')
      .then((r) => {
        if (!cancelado) setDados(r);
      })
      .catch(() => {
        if (!cancelado) setErro('Não deu pra carregar essa competição. Tenta recarregar a página.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const competicao = dados?.find((c) => c.id === id) ?? null;

  async function salvarConfronto(confrontoId: string, patch: PatchConfronto) {
    if (!competicao) return;
    const atualizado = await apiFetch<Confronto>(`/competicoes/${competicao.id}/confrontos/${confrontoId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setDados((prev) =>
      prev?.map((c) => (c.id !== competicao.id ? c : { ...c, confrontos: c.confrontos.map((cf) => (cf.id === confrontoId ? atualizado : cf)) })) ?? prev,
    );
  }

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        onClick={() => navigate('/competicoes')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Competições
      </button>

      {erro ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{erro}</div>
      ) : dados === null ? (
        <LoadingFill />
      ) : !competicao ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Essa competição não existe (ou não tá mais disponível).</div>
      ) : (
        <>
          <ResumoCompeticao competicao={competicao} />
          <FaseDeGrupos competicao={competicao} editavel={adminMode} onSalvar={salvarConfronto} />
          {competicao.confrontos.some((c) => c.chave !== 'grupos') && (
            <Chaveamento competicao={competicao} editavel={adminMode} onSalvar={salvarConfronto} />
          )}
        </>
      )}
    </div>
  );
}
