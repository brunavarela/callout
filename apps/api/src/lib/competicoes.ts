import type { Competicao, Confronto, LadoConfronto } from "@callout/shared";
import { prisma } from "./prisma.js";

function toConfrontoDto(row: { confrontoId: string; chave: string; data: string; status: string; ladoA: unknown; ladoB: unknown; placarA: number | null; placarB: number | null }): Confronto {
  return {
    id: row.confrontoId,
    chave: row.chave as Confronto["chave"],
    data: row.data,
    status: row.status as Confronto["status"],
    ladoA: row.ladoA as LadoConfronto,
    ladoB: row.ladoB as LadoConfronto,
    placarA: row.placarA,
    placarB: row.placarB,
  };
}

export async function listCompeticoes(): Promise<Competicao[]> {
  const rows = await prisma.competicao.findMany({
    include: { times: true, confrontos: true },
    orderBy: { id: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    formato: r.formato,
    categorias: r.categorias as Competicao["categorias"],
    fase: r.fase,
    status: r.status as Competicao["status"],
    linkTwitch: r.linkTwitch ?? undefined,
    linkYoutube: r.linkYoutube ?? undefined,
    times: r.times.map((t) => ({ id: t.timeId, nome: t.nome, sigla: t.sigla, cor: t.cor })),
    confrontos: r.confrontos.map(toConfrontoDto),
  }));
}

export async function updateConfronto(
  competicaoId: string,
  confrontoId: string,
  patch: { status: Confronto["status"]; placarA: number | null; placarB: number | null },
): Promise<Confronto | null> {
  const existing = await prisma.confronto.findUnique({ where: { competicaoId_confrontoId: { competicaoId, confrontoId } } });
  if (!existing) return null;

  const updated = await prisma.confronto.update({
    where: { competicaoId_confrontoId: { competicaoId, confrontoId } },
    data: patch,
  });

  return toConfrontoDto(updated);
}
