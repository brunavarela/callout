import type { Lado, Spot as SpotDTO } from "@callout/shared";
import { PLACEHOLDER_AGENTS } from "@callout/shared";
import type { MapAsset, Spot, User } from "@prisma/client";

type SpotWithRelations = Spot & { map: MapAsset; criadoPor: User };

// `agentUuid` não é FK de verdade — o front manda o uuid real de AgentAsset
// (Spots.tsx) quando o seed já rodou, ou um id da paleta placeholder
// (`PLACEHOLDER_AGENTS`) como fallback. Resolve pelo real primeiro; cai pro
// placeholder só pra spots criados antes do seed.
export function toSpotDTO(spot: SpotWithRelations, agentsByUuid: Map<string, { nome: string; cor: string | null }>): SpotDTO {
  const real = agentsByUuid.get(spot.agentUuid);
  const placeholder = PLACEHOLDER_AGENTS.find((a) => a.id === spot.agentUuid);
  return {
    id: spot.id,
    mapId: spot.mapId,
    mapName: spot.map.nome,
    agentId: spot.agentUuid,
    agent: real?.nome ?? placeholder?.name ?? "—",
    agentColor: real?.cor ?? placeholder?.color ?? "#9A9DA1",
    descricao: spot.descricao,
    imagens: spot.imagens,
    link: spot.link,
    author: spot.criadoPor.riotName ?? spot.criadoPor.discordUsername,
    side: spot.side as Lado,
  };
}
