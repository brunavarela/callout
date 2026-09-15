import type { Confronto } from '@callout/shared';

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
