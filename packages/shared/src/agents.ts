export interface PlaceholderAgent {
  id: string;
  name: string;
  abbrev: string;
  color: string;
}

// Sem o seed real de agentes da valorant-api.com (Fase 0 item 4), essa
// paleta fixa cobre Board e Spots com uma identidade visual consistente
// por agora. Quando o seed existir, isso deve ser substituído por um
// fetch em `AgentAsset`.
export const PLACEHOLDER_AGENTS: readonly PlaceholderAgent[] = [
  { id: "viper", name: "Viper", abbrev: "VIP", color: "#18AAB7" },
  { id: "raze", name: "Raze", abbrev: "RAZ", color: "#EF4958" },
  { id: "skye", name: "Skye", abbrev: "SKY", color: "#4C5BC4" },
  { id: "brimstone", name: "Brimstone", abbrev: "BRI", color: "#7B3FA8" },
  { id: "jett", name: "Jett", abbrev: "JET", color: "#7FD3DB" },
  { id: "omen", name: "Omen", abbrev: "OME", color: "#4F5258" },
];
