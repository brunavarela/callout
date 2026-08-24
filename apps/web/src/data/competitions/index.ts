import { competicaoSchema, type Competicao } from './types';
import { vctAmericasPlayoffs2026 } from './vct-americas-playoffs-2026';

// Mais nova primeiro. Ao encerrar uma competição, ela continua aqui — não
// apagamos (ver memória do projeto sobre isso); se a lista crescer demais
// pra caber numa tela só, aí sim vale filtrar por status na UI.
const TODAS_COMPETICOES: Competicao[] = [vctAmericasPlayoffs2026];

if (import.meta.env.DEV) {
  for (const comp of TODAS_COMPETICOES) {
    const resultado = competicaoSchema.safeParse(comp);
    if (!resultado.success) {
      console.error(`[data/competitions] "${comp.id}" com dado inválido:`, resultado.error.flatten());
    }
  }
}

export const competicoes: readonly Competicao[] = TODAS_COMPETICOES;

export * from './types';
