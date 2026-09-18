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

// Nome de exibição pro arquivo, só pros que não batem 1:1 com o nome oficial
// capitalizado (o resto -- Jett, Sage, Omen...) já sai certo só capitalizando
// o próprio arquivo.
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  brim: 'Brimstone',
  ko: 'KAY/O',
};

function capitalize(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

// Lista completa dos agentes com imagem local disponível -- usada pro
// seletor "usar um agente como foto" (ver ProfileModal.tsx), que não
// depende do catálogo AgentAsset (nem de fetch nenhum) pra existir.
export const AGENT_ICONS: Array<{ name: string; url: string }> = [...AVAILABLE_FILES]
  .map((file) => ({ name: DISPLAY_NAME_OVERRIDES[file] ?? capitalize(file), url: `/img/agents/${file}.png` }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
