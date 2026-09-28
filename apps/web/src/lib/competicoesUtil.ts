import type { Competicao, Confronto } from '@callout/shared';

// "Ao vivo" não precisa de admin nem de job rodando de hora em hora — é só
// comparar a hora atual do navegador com o horário do confronto. A `data`
// é sempre horário de Brasília sem timezone (ver comentário no schema),
// igual todo mundo que usa o app, então `new Date()` local já bate certo.
// Só sobrescreve pra exibição — o status salvo no banco continua
// "agendada" até o admin marcar como encerrada.
export function statusEfetivo(confronto: Confronto): Confronto['status'] {
  if (confronto.status !== 'agendada') return confronto.status;
  return new Date() >= new Date(confronto.data) ? 'ao_vivo' : 'agendada';
}

export function formatDataConfronto(iso: string): string {
  const d = new Date(iso);
  const hora = d.getHours().toString().padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1} · ${hora}h`;
}

// Rodada = 1 + a maior rodada entre os confrontos que esse aqui referencia
// via vencedor/perdedor. Times fixos não contam. Isso posiciona cada
// confronto na coluna certa do chaveamento sem precisar declarar isso à
// mão pra cada competição.
export function calcularRodadas(confrontos: readonly Confronto[]): Map<string, number> {
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

// Status da competição pra exibição. O admin nem sempre lembra de trocar o
// status salvo de "agendada" pra "em_andamento" quando o 1º jogo começa
// (aconteceu com o Champions) -- então, se algum confronto já começou
// (horário passou ou já tem placar/status diferente de agendada), trata
// como em andamento. "encerrada" continua vindo só do banco.
export function statusCompeticaoEfetivo(competicao: Competicao): Competicao['status'] {
  if (competicao.status !== 'agendada') return competicao.status;
  const comecou = competicao.confrontos.some((c) => statusEfetivo(c) !== 'agendada' || c.placarA !== null || c.placarB !== null);
  return comecou ? 'em_andamento' : 'agendada';
}

// Data do último confronto cadastrado -- usada pra ordenar as competições
// da mais atual pra mais antiga. Sem confrontos ainda = datas a definir,
// que na prática é competição futura, então vai pro topo.
export function ultimaDataCompeticao(competicao: Competicao): number {
  if (competicao.confrontos.length === 0) return Number.POSITIVE_INFINITY;
  return Math.max(...competicao.confrontos.map((c) => new Date(c.data).getTime()));
}
