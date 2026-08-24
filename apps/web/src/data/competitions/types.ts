import { z } from 'zod';

// Dados de competições editados à mão, um arquivo por campeonato/temporada
// (ver index.ts). Sem banco de propósito — atualização é manual, semanal,
// feita por uma pessoa só; arquivo + git já dão o histórico de graça.

export const categoriaCompeticaoSchema = z.enum(['mista', 'inclusiva', 'feminina', 'aberta']);
export type CategoriaCompeticao = z.infer<typeof categoriaCompeticaoSchema>;

export const timeSchema = z.object({
  id: z.string(),
  nome: z.string(),
  sigla: z.string().max(4),
  cor: z.string(),
});
export type Time = z.infer<typeof timeSchema>;

// Um lado de confronto tanto pode ser um time já definido quanto uma
// referência a "quem vencer/perder o confronto X" — assim, quando você
// atualiza o placar de um confronto, os confrontos seguintes que dependem
// dele resolvem sozinhos, sem precisar editar cada um.
const ladoConfrontoSchema = z.union([
  z.object({ tipo: z.literal('time'), timeId: z.string() }),
  z.object({ tipo: z.literal('vencedor'), confrontoId: z.string() }),
  z.object({ tipo: z.literal('perdedor'), confrontoId: z.string() }),
]);
export type LadoConfronto = z.infer<typeof ladoConfrontoSchema>;

export const confrontoSchema = z.object({
  id: z.string(),
  chave: z.enum(['superior', 'inferior', 'final']),
  data: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)),
  status: z.enum(['encerrada', 'ao_vivo', 'agendada']),
  ladoA: ladoConfrontoSchema,
  ladoB: ladoConfrontoSchema,
  placarA: z.number().int().nullable(),
  placarB: z.number().int().nullable(),
});
export type Confronto = z.infer<typeof confrontoSchema>;

export const competicaoSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    formato: z.string(),
    categorias: z.array(categoriaCompeticaoSchema).min(1),
    fase: z.string(),
    status: z.enum(['agendada', 'em_andamento', 'encerrada']),
    times: z.array(timeSchema),
    confrontos: z.array(confrontoSchema),
  })
  .superRefine((comp, ctx) => {
    const timeIds = new Set(comp.times.map((t) => t.id));
    const confrontoIds = new Set(comp.confrontos.map((c) => c.id));

    for (const confronto of comp.confrontos) {
      for (const [campo, lado] of [
        ['ladoA', confronto.ladoA],
        ['ladoB', confronto.ladoB],
      ] as const) {
        if (lado.tipo === 'time' && !timeIds.has(lado.timeId)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${confronto.id}.${campo} referencia timeId "${lado.timeId}" que não existe em "times"` });
        }
        if ((lado.tipo === 'vencedor' || lado.tipo === 'perdedor') && !confrontoIds.has(lado.confrontoId)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${confronto.id}.${campo} referencia confrontoId "${lado.confrontoId}" que não existe em "confrontos"` });
        }
      }
    }
  });
export type Competicao = z.infer<typeof competicaoSchema>;

/** Lê um dado literal e devolve o Time resolvido de um lado de confronto,
 * seguindo a cadeia vencedor/perdedor até achar um time ou esbarrar num
 * confronto ainda não decidido (aí devolve só o rótulo, ex. "Vencedor P1"). */
export function resolverLado(
  lado: LadoConfronto,
  confrontos: readonly Confronto[],
  times: readonly Time[],
): { time: Time | null; rotulo: string } {
  if (lado.tipo === 'time') {
    const time = times.find((t) => t.id === lado.timeId) ?? null;
    return { time, rotulo: time?.nome ?? lado.timeId };
  }

  const origem = confrontos.find((c) => c.id === lado.confrontoId);
  const rotuloPendente = `${lado.tipo === 'vencedor' ? 'Vencedor' : 'Perdedor'} ${lado.confrontoId}`;
  if (!origem || origem.placarA === null || origem.placarB === null || origem.placarA === origem.placarB) {
    return { time: null, rotulo: rotuloPendente };
  }

  const ladoVencedor = origem.placarA > origem.placarB ? origem.ladoA : origem.ladoB;
  const ladoPerdedor = origem.placarA > origem.placarB ? origem.ladoB : origem.ladoA;
  const alvo = lado.tipo === 'vencedor' ? ladoVencedor : ladoPerdedor;
  const resolvidoAlvo = resolverLado(alvo, confrontos, times);
  return resolvidoAlvo.time ? resolvidoAlvo : { time: null, rotulo: rotuloPendente };
}
