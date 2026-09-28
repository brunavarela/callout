import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { resolverLado, type Competicao, type Confronto, type LadoConfronto, type Time } from '@callout/shared';
import { apiFetch } from '../lib/api';
import { LoadingFill } from '../components/Spinner';
import { useCardStyle } from '../components/statsPrimitives';
import { statusEfetivo, formatDataConfronto, calcularRodadas } from '../lib/competicoesUtil';
import { Table2 } from 'lucide-react';
import { CabecalhoCompeticao, Chaveamento } from './CompetitionDetail';

// Medidas do chaveamento de grupo (px) -- posicionamento absoluto em vez de
// flex porque as linhas de ligação (SVG) precisam bater exatamente no meio
// de cada confronto.
const COL = 148;
const CONN = 26;
const ROW = 30;
const ROW_GAP = 4;
const MATCH_H = ROW * 2 + ROW_GAP;
const MATCH_GAP = 14;
const SECAO_GAP = 26;

const STATUS_LABEL: Record<Confronto['status'], string> = {
  encerrada: 'Encerrada',
  ao_vivo: 'Ao vivo',
  agendada: 'Agendada',
};

function SlotTime({ time, rotulo, placar, perdeu }: { time: Time | null; rotulo: string; placar?: number | null; perdeu?: boolean }) {
  return (
    <div
      title={time ? time.nome : rotulo}
      style={{
        height: ROW,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 9px',
        background: 'var(--track)',
        border: '1px solid var(--surface-border)',
        borderBottom: `2px solid ${time ? time.cor : 'var(--surface-border)'}`,
        borderRadius: 6,
        opacity: perdeu ? 0.35 : 1,
      }}
    >
      {time &&
        (time.logoUrl ? (
          <img src={time.logoUrl} alt="" style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none' }} />
        ) : (
          <span style={{ width: 10, height: 10, borderRadius: 3, background: time.cor, flex: 'none' }} />
        ))}
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {time?.sigla ?? ''}
      </span>
      {placar !== undefined && placar !== null && (
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: perdeu ? 'var(--text-faint)' : 'var(--pos, #18AAB7)', flex: 'none' }}>{placar}</span>
      )}
    </div>
  );
}

function ConfrontoChave({ confronto, competicao }: { confronto: Confronto; competicao: Competicao }) {
  const a = resolverLado(confronto.ladoA, competicao.confrontos, competicao.times);
  const b = resolverLado(confronto.ladoB, competicao.confrontos, competicao.times);
  const decidido = confronto.placarA !== null && confronto.placarB !== null && confronto.placarA !== confronto.placarB;
  const status = statusEfetivo(confronto);

  return (
    <div
      title={`${confronto.id} · ${formatDataConfronto(confronto.data)} · ${STATUS_LABEL[status]}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: ROW_GAP,
        width: COL,
        borderRadius: 8,
        outline: status === 'ao_vivo' ? '1.5px solid var(--acc, #EF4958)' : 'none',
        outlineOffset: 2,
      }}
    >
      <SlotTime time={a.time} rotulo={a.rotulo} placar={confronto.placarA} perdeu={decidido && confronto.placarA! < confronto.placarB!} />
      <SlotTime time={b.time} rotulo={b.rotulo} placar={confronto.placarB} perdeu={decidido && confronto.placarB! < confronto.placarA!} />
    </div>
  );
}

// Formato GSL (o do Champions): 2 aberturas -> partida dos vencedores
// (quem ganha é o 1º do grupo) + partida de eliminação (perdedores das
// aberturas) -> decisiva (perdedor dos vencedores x vencedor da
// eliminação, quem ganha é o 2º). Devolve null se o grupo não bater com
// isso -- aí cai no layout genérico por rodada.
function estruturaGsl(confrontos: Confronto[]) {
  const ehTime = (l: LadoConfronto) => l.tipo === 'time';
  const aberturas = confrontos.filter((c) => ehTime(c.ladoA) && ehTime(c.ladoB)).sort((a, b) => a.id.localeCompare(b.id));
  if (aberturas.length !== 2 || confrontos.length !== 5) return null;
  const idsAbertura = new Set(aberturas.map((c) => c.id));
  const refAbertura = (l: LadoConfronto, tipo: 'vencedor' | 'perdedor') => l.tipo === tipo && idsAbertura.has(l.confrontoId);
  const vencedores = confrontos.find((c) => refAbertura(c.ladoA, 'vencedor') && refAbertura(c.ladoB, 'vencedor'));
  const eliminacao = confrontos.find((c) => refAbertura(c.ladoA, 'perdedor') && refAbertura(c.ladoB, 'perdedor'));
  const decisiva = confrontos.find((c) => !idsAbertura.has(c.id) && c !== vencedores && c !== eliminacao);
  if (!vencedores || !eliminacao || !decisiva) return null;
  return { aberturas: aberturas as [Confronto, Confronto], vencedores, eliminacao, decisiva };
}

function ChaveGsl({ gsl, competicao }: { gsl: NonNullable<ReturnType<typeof estruturaGsl>>; competicao: Competicao }) {
  const primeiro = resolverLado({ tipo: 'vencedor', confrontoId: gsl.vencedores.id }, competicao.confrontos, competicao.times);
  const segundo = resolverLado({ tipo: 'vencedor', confrontoId: gsl.decisiva.id }, competicao.confrontos, competicao.times);

  const x2 = COL + CONN;
  const x3 = 2 * COL + 2 * CONN;
  const meioConn1 = COL + CONN / 2;
  // Parte de cima: aberturas -> vencedores -> 1º colocado.
  const centroA1 = MATCH_H / 2;
  const centroA2 = MATCH_H + MATCH_GAP + MATCH_H / 2;
  const centroTopo = (centroA1 + centroA2) / 2;
  // Parte de baixo: eliminação -> decisiva -> 2º colocado.
  const topoBaixo = 2 * MATCH_H + MATCH_GAP + SECAO_GAP;
  const centroBaixo = topoBaixo + MATCH_H / 2;
  const largura = x3 + COL;
  const altura = topoBaixo + MATCH_H;

  const pos = (left: number, top: number): React.CSSProperties => ({ position: 'absolute', left, top });

  return (
    <div style={{ position: 'relative', width: largura, height: altura, flex: 'none' }}>
      <svg width={largura} height={altura} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
        <g stroke="var(--text-faint)" strokeWidth={1.25} fill="none">
          <path d={`M ${COL} ${centroA1} H ${meioConn1} V ${centroA2} H ${COL} M ${meioConn1} ${centroTopo} H ${x2}`} />
          <path d={`M ${x2 + COL} ${centroTopo} H ${x3}`} />
          <path d={`M ${COL} ${centroBaixo} H ${x2}`} />
          <path d={`M ${x2 + COL} ${centroBaixo} H ${x3}`} />
        </g>
      </svg>

      <div style={pos(0, 0)}>
        <ConfrontoChave confronto={gsl.aberturas[0]} competicao={competicao} />
      </div>
      <div style={pos(0, MATCH_H + MATCH_GAP)}>
        <ConfrontoChave confronto={gsl.aberturas[1]} competicao={competicao} />
      </div>
      <div style={pos(x2, centroTopo - MATCH_H / 2)}>
        <ConfrontoChave confronto={gsl.vencedores} competicao={competicao} />
      </div>
      <div style={{ ...pos(x3, centroTopo - ROW / 2), width: COL }}>
        <SlotTime time={primeiro.time} rotulo="1º do grupo" />
      </div>

      <div style={pos(0, topoBaixo)}>
        <ConfrontoChave confronto={gsl.eliminacao} competicao={competicao} />
      </div>
      <div style={pos(x2, topoBaixo)}>
        <ConfrontoChave confronto={gsl.decisiva} competicao={competicao} />
      </div>
      <div style={{ ...pos(x3, centroBaixo - ROW / 2), width: COL }}>
        <SlotTime time={segundo.time} rotulo="2º do grupo" />
      </div>
    </div>
  );
}

// Fallback pra grupo que não é GSL: uma coluna por rodada, sem linhas.
function ChavePorRodada({ confrontos, competicao }: { confrontos: Confronto[]; competicao: Competicao }) {
  const rodadaDe = useMemo(() => calcularRodadas(confrontos), [confrontos]);
  const maxRodada = Math.max(1, ...confrontos.map((c) => rodadaDe.get(c.id) ?? 1));
  return (
    <div style={{ display: 'flex', gap: CONN, flex: 'none' }}>
      {Array.from({ length: maxRodada }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: MATCH_GAP, justifyContent: 'center' }}>
          {confrontos
            .filter((c) => rodadaDe.get(c.id) === i + 1)
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((c) => (
              <ConfrontoChave key={c.id} confronto={c} competicao={competicao} />
            ))}
        </div>
      ))}
    </div>
  );
}

function GrupoChave({ nome, confrontos, competicao }: { nome: string; confrontos: Confronto[]; competicao: Competicao }) {
  const cardStyle = useCardStyle();
  const gsl = estruturaGsl(confrontos);
  return (
    // minWidth:0 + overflowX:auto -- em tela estreita a chave rola de lado
    // dentro do card em vez de alargar a página.
    <div style={{ ...cardStyle, padding: 18, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, overflowX: 'auto' }}>
      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '.04em', color: 'var(--acc, #EF4958)' }}>GRUPO {nome}</div>
      {gsl ? <ChaveGsl gsl={gsl} competicao={competicao} /> : <ChavePorRodada confrontos={confrontos} competicao={competicao} />}
    </div>
  );
}

// Tela de chaveamento de uma competição (botão "Chaveamento" no detalhe):
// fase de grupos em formato de chave (como a arte oficial) + mata-mata,
// se já tiver. Só leitura -- edição de placar continua no detalhe.
export function CompetitionBracket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cardStyle = useCardStyle();
  const [dados, setDados] = useState<Competicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const voltarPara = (location.state as { voltarPara?: string } | null)?.voltarPara ?? '';

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

  const porGrupo = useMemo(() => {
    const map = new Map<string, Confronto[]>();
    for (const c of competicao?.confrontos ?? []) {
      if (c.chave !== 'grupos' || !c.grupo) continue;
      map.set(c.grupo, [...(map.get(c.grupo) ?? []), c]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [competicao]);

  const titulo = (texto: string) => <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{texto}</div>;

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CabecalhoCompeticao
        competicao={competicao}
        voltarPara={voltarPara}
        acao={{
          label: 'Tabela',
          icon: <Table2 size={15} strokeWidth={2} style={{ flex: 'none' }} />,
          onClick: () => navigate(`/competicoes/${id}`, { state: { voltarPara } }),
        }}
      />

      {erro ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{erro}</div>
      ) : dados === null ? (
        <LoadingFill />
      ) : !competicao ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Essa competição não existe (ou não tá mais disponível).</div>
      ) : (
        <>
          {porGrupo.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {titulo('Fase de grupos')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 560px), 1fr))', gap: 12 }}>
                {porGrupo.map(([nome, confrontos]) => (
                  <GrupoChave key={nome} nome={nome} confrontos={confrontos} competicao={competicao} />
                ))}
              </div>
            </div>
          )}

          {competicao.confrontos.some((c) => c.chave !== 'grupos') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {titulo('Playoffs')}
              <Chaveamento competicao={competicao} editavel={false} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
