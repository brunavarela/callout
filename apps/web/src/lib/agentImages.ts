// Imagens em apps/web/public/img/agents/<arquivo>.png — nomeadas com
// apelidos curtos, não o nome oficial do agente, então precisa de alguns
// aliases pros casos que não batem por normalização direta (Brimstone →
// brim, KAY/O → ko). O resto (Jett, Sage, Omen...) já bate igual.
const AVAILABLE_FILES = new Set([
  'astra', 'breach', 'brim', 'chamber', 'clove', 'cypher', 'deadlock', 'fade', 'gekko',
  'harbor', 'iso', 'jett', 'killjoy', 'ko', 'miks', 'neon', 'omen', 'phoenix', 'raze',
  'reyna', 'sage', 'skye', 'sova', 'tejo', 'veto', 'viper', 'vyse', 'waylay', 'yoru',
]);

const ALIASES: Record<string, string> = {
  brimstone: 'brim',
  kayo: 'ko',
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Retorna a URL da imagem do agente pelo nome, ou null se não achar
// (agente novo demais pra ter imagem ainda, ou nome não bate com nada).
export function agentImageUrl(name: string): string | null {
  const key = normalize(name);
  const file = AVAILABLE_FILES.has(key) ? key : ALIASES[key];
  return file ? `/img/agents/${file}.png` : null;
}
