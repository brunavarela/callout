/**
 * Schemas Zod para os assets estáticos de valorant-api.com (sem key, sem
 * rate limit documentado). Usados só no job de seed — ver context.md §5.3.
 * Campos fora dos usados pelo produto (armas, skins) foram omitidos de
 * propósito; adicione conforme a necessidade real aparecer.
 */
import { z } from "zod";

export const valorantApiCalloutSchema = z.object({
  regionName: z.string(),
  superRegionName: z.string(),
  location: z.object({ x: z.number(), y: z.number() }),
});
export type ValorantApiCallout = z.infer<typeof valorantApiCalloutSchema>;

export const valorantApiMapSchema = z.object({
  uuid: z.string(),
  displayName: z.string(),
  displayIcon: z.string().nullable(),
  xMultiplier: z.number(),
  yMultiplier: z.number(),
  xScalarToAdd: z.number(),
  yScalarToAdd: z.number(),
  callouts: z.array(valorantApiCalloutSchema).nullable(),
});
export type ValorantApiMap = z.infer<typeof valorantApiMapSchema>;

export const valorantApiMapsResponseSchema = z.object({
  status: z.number(),
  data: z.array(valorantApiMapSchema),
});

export const valorantApiAgentSchema = z.object({
  uuid: z.string(),
  displayName: z.string(),
  displayIcon: z.string().nullable(),
  fullPortrait: z.string().nullable(),
  role: z.object({ displayName: z.string() }).nullable(),
  isPlayableCharacter: z.boolean(),
  // Hex8 (RRGGBBAA); o primeiro tende a ser a cor mais representativa do
  // agente — usado como `AgentAsset.cor` no seed (Fase 0 item 4).
  backgroundGradientColors: z.array(z.string()).nullable().optional(),
});
export type ValorantApiAgent = z.infer<typeof valorantApiAgentSchema>;

export const valorantApiAgentsResponseSchema = z.object({
  status: z.number(),
  data: z.array(valorantApiAgentSchema),
});

/**
 * Converte coordenada de jogo (x,y do payload de partida/kill) para posição
 * normalizada (0..1) sobre a imagem do minimapa. Ver context.md §5.4 — os
 * eixos são invertidos (y do jogo vira x do mapa). Validar com uma partida
 * real conhecida antes de confiar no resultado.
 */
export function gameLocationToMinimapPosition(
  loc: { x: number; y: number },
  map: Pick<ValorantApiMap, "xMultiplier" | "yMultiplier" | "xScalarToAdd" | "yScalarToAdd">,
): { x: number; y: number } {
  return {
    x: loc.y * map.xMultiplier + map.xScalarToAdd,
    y: loc.x * map.yMultiplier + map.yScalarToAdd,
  };
}
