import type { HeatmapResult, MatchV4Data } from "@callout/shared";
import { gameLocationToMinimapPosition } from "@callout/shared";
import { prisma } from "./prisma.js";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// `player_locations` traz a posição de todo mundo NO MOMENTO do abate,
// exceto quem morreu ali (confirmado com dado real: o puuid da vítima
// nunca aparece nessa lista). "Kills" usa a entrada do matador em
// `player_locations`; "deaths" tem que usar o `location` solto do kill
// (que é, por eliminação, a posição de quem morreu) — buscar a vítima em
// `player_locations` sempre dá vazio.
export async function buildHeatmap(puuid: string, mapName: string, kind: "kills" | "deaths"): Promise<HeatmapResult> {
  const map = await prisma.mapAsset.findFirst({ where: { nome: { equals: mapName, mode: "insensitive" } } });
  if (!map) return { mapName, mapDisplayIcon: null, points: [] };

  // `Match.mapId` nunca foi preenchido pelo sync (fica null) — filtra pelo
  // nome do mapa dentro do `rawJson`, igual `dashboard.ts` já faz.
  const rows = await prisma.matchPlayer.findMany({ where: { puuid }, include: { match: true } });

  const calibration = {
    xMultiplier: map.xMultiplier,
    yMultiplier: map.yMultiplier,
    xScalarToAdd: map.xScalar,
    yScalarToAdd: map.yScalar,
  };

  const points: Array<{ x: number; y: number }> = [];
  for (const row of rows) {
    const raw = row.match.rawJson as unknown as MatchV4Data;
    if (raw.metadata.map.name.toLowerCase() !== map.nome.toLowerCase()) continue;
    for (const kill of raw.kills) {
      const targetPuuid = kind === "kills" ? kill.killer.puuid : kill.victim.puuid;
      if (targetPuuid !== puuid) continue;

      const loc = kind === "kills" ? kill.player_locations.find((pl) => pl.player.puuid === targetPuuid)?.location : kill.location;
      if (!loc) continue;

      const pos = gameLocationToMinimapPosition(loc, calibration);
      points.push({ x: clamp01(pos.x), y: clamp01(pos.y) });
    }
  }

  return { mapName: map.nome, mapDisplayIcon: map.displayIcon, points };
}
