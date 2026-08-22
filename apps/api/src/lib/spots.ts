import type { Lado, Spot as SpotDTO } from "@callout/shared";
import { PLACEHOLDER_AGENTS } from "@callout/shared";
import type { MapAsset, Spot, User } from "@prisma/client";

type SpotWithRelations = Spot & { map: MapAsset; criadoPor: User };

// Mesmo motivo do Board: `agentUuid` não é FK de verdade (AgentAsset está
// vazia, Fase 0 item 4) — resolve pela paleta placeholder compartilhada.
export function toSpotDTO(spot: SpotWithRelations): SpotDTO {
  const agent = PLACEHOLDER_AGENTS.find((a) => a.id === spot.agentUuid);
  return {
    id: spot.id,
    mapName: spot.map.nome,
    agent: agent?.name ?? "—",
    agentColor: agent?.color ?? "#9A9DA1",
    habilidade: spot.habilidade,
    origin: { x: spot.xOrigem, y: spot.yOrigem },
    target: { x: spot.xAlvo, y: spot.yAlvo },
    mediaUrl: spot.videoUrl,
    notas: spot.notas,
    author: spot.criadoPor.riotName ?? spot.criadoPor.discordUsername,
    side: spot.side as Lado,
  };
}
