import { competicaoSchema, type Competicao } from "@callout/shared";
import { prisma } from "../lib/prisma.js";
import { vctAmericasPlayoffs2026 } from "../data/competicoes-seed/vct-americas-playoffs-2026.js";
import { gameChangersBrasilEtapaFinal2026 } from "../data/competicoes-seed/game-changers-brasil-etapa-final-2026.js";

// Idempotente — pode rodar de novo em qualquer ambiente (dev/prod) sem
// duplicar nada; upsert por id lógico. Só popula na primeira vez ou se um
// confronto/time novo for adicionado aqui; NÃO sobrescreve placar/status já
// editados pelo admin (ver updateCompeticao abaixo).
const SEED: Competicao[] = [vctAmericasPlayoffs2026, gameChangersBrasilEtapaFinal2026];

async function seedCompeticao(comp: Competicao) {
  const parsed = competicaoSchema.safeParse(comp);
  if (!parsed.success) {
    console.error(`"${comp.id}" com dado inválido, pulando:`, parsed.error.flatten());
    return;
  }

  await prisma.competicao.upsert({
    where: { id: comp.id },
    update: {
      nome: comp.nome,
      formato: comp.formato,
      categorias: comp.categorias,
      fase: comp.fase,
      status: comp.status,
      linkTwitch: comp.linkTwitch,
      linkYoutube: comp.linkYoutube,
    },
    create: {
      id: comp.id,
      nome: comp.nome,
      formato: comp.formato,
      categorias: comp.categorias,
      fase: comp.fase,
      status: comp.status,
      linkTwitch: comp.linkTwitch,
      linkYoutube: comp.linkYoutube,
    },
  });

  for (const time of comp.times) {
    await prisma.competicaoTime.upsert({
      where: { competicaoId_timeId: { competicaoId: comp.id, timeId: time.id } },
      update: { nome: time.nome, sigla: time.sigla, cor: time.cor },
      create: { competicaoId: comp.id, timeId: time.id, nome: time.nome, sigla: time.sigla, cor: time.cor },
    });
  }

  for (const confronto of comp.confrontos) {
    const existing = await prisma.confronto.findUnique({
      where: { competicaoId_confrontoId: { competicaoId: comp.id, confrontoId: confronto.id } },
    });
    // Confronto já existe no banco = já pode ter sido editado pelo admin.
    // Não pisa em cima do placar/status real com o valor "de fábrica" do
    // arquivo de seed — só cria o que ainda não existe.
    if (existing) continue;

    await prisma.confronto.create({
      data: {
        competicaoId: comp.id,
        confrontoId: confronto.id,
        chave: confronto.chave,
        data: confronto.data,
        status: confronto.status,
        ladoA: confronto.ladoA,
        ladoB: confronto.ladoB,
        placarA: confronto.placarA,
        placarB: confronto.placarB,
      },
    });
  }

  console.log(`"${comp.id}" seedado (${comp.times.length} times, ${comp.confrontos.length} confrontos).`);
}

for (const comp of SEED) {
  await seedCompeticao(comp);
}
process.exit(0);
