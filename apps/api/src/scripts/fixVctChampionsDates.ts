import { vctChampionsShanghai2026 } from "../data/competicoes-seed/vct-champions-shanghai-2026.js";
import { prisma } from "../lib/prisma.js";

// seedCompeticoes.ts é idempotente de propósito -- pula confronto que já
// existe no banco pra não sobrescrever placar/status editado pelo admin (ver
// comentário lá). Isso significa que corrigir só o arquivo de seed NUNCA
// chega em produção sozinho depois que o confronto já foi criado uma vez.
// Esse script é o "patch" pontual pra isso: corrige o campo `data`
// (dia/hora) dos confrontos do VCT Champions Shanghai 2026 pro valor do
// seed (cronograma oficial, prints da Bruna de 21/09 e 29/09/2026) e, só em
// confronto ainda sem placar, também ladoA/ladoB (a correção de 29/09 trocou
// a ordem dos lados pra bater com o cronograma oficial). Nunca mexe em
// status/placarA/placarB, então não some com nenhum resultado já lançado --
// e não inverte lados de confronto que já tem placar lançado.
async function main() {
  let datas = 0;
  let lados = 0;
  for (const confronto of vctChampionsShanghai2026.confrontos) {
    const where = { competicaoId: vctChampionsShanghai2026.id, confrontoId: confronto.id };
    const result = await prisma.confronto.updateMany({
      where,
      data: { data: confronto.data },
    });
    datas += result.count;
    const ladosResult = await prisma.confronto.updateMany({
      where: { ...where, placarA: null, placarB: null },
      data: { ladoA: confronto.ladoA, ladoB: confronto.ladoB },
    });
    lados += ladosResult.count;
  }
  console.log(`${datas} confronto(s) do VCT Champions Shanghai 2026 com data corrigida, ${lados} com lados atualizados.`);
}

await main();
process.exit(0);
