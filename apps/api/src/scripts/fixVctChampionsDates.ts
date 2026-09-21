import { vctChampionsShanghai2026 } from "../data/competicoes-seed/vct-champions-shanghai-2026.js";
import { prisma } from "../lib/prisma.js";

// seedCompeticoes.ts é idempotente de propósito -- pula confronto que já
// existe no banco pra não sobrescrever placar/status editado pelo admin (ver
// comentário lá). Isso significa que corrigir só o arquivo de seed NUNCA
// chega em produção sozinho depois que o confronto já foi criado uma vez.
// Esse script é o "patch" pontual pra isso: corrige só o campo `data`
// (dia/hora) dos confrontos do VCT Champions Shanghai 2026 pro valor
// certo achado em 21/09/2026 (print oficial da Bruna) -- não mexe em
// status/placarA/placarB, então não some com nenhum resultado já lançado.
async function main() {
  let updated = 0;
  for (const confronto of vctChampionsShanghai2026.confrontos) {
    const result = await prisma.confronto.updateMany({
      where: { competicaoId: vctChampionsShanghai2026.id, confrontoId: confronto.id },
      data: { data: confronto.data },
    });
    updated += result.count;
  }
  console.log(`${updated} confronto(s) do VCT Champions Shanghai 2026 com data corrigida.`);
}

await main();
process.exit(0);
