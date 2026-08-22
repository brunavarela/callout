import { valorantApiAgentsResponseSchema, valorantApiMapsResponseSchema } from "@callout/shared";
import type { ValorantApiAgent, ValorantApiMap } from "@callout/shared";
import { prisma } from "./prisma.js";

const BASE_URL = "https://valorant-api.com/v1";

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`valorant-api.com${path} respondeu ${res.status}`);
  return res.json();
}

// Mapas de minigame (Range, Skirmish, etc.) não têm callouts nem calibração
// de coordenada — só os mapas competitivos de verdade têm as duas coisas.
export async function fetchRealMaps(): Promise<ValorantApiMap[]> {
  const json = await fetchJson("/maps");
  return valorantApiMapsResponseSchema.parse(json).data.filter((m) => m.callouts !== null && m.xMultiplier !== 0);
}

export async function fetchRealAgents(): Promise<ValorantApiAgent[]> {
  const json = await fetchJson("/agents?isPlayableCharacter=true");
  return valorantApiAgentsResponseSchema.parse(json).data;
}

// Troca o registro placeholder (criado por `ensureMapAsset` antes desse seed
// existir, ver strategy.ts) pelo dado real, casando por nome — preserva o
// `id` da linha pra não quebrar `mapId` já referenciado em Match/Strategy/
// Spot (ver PROGRESS.md, Fase 0 item 4).
export async function seedMaps(): Promise<string[]> {
  const maps = await fetchRealMaps();
  const results: string[] = [];

  for (const map of maps) {
    const data = {
      uuid: map.uuid,
      nome: map.displayName,
      displayIcon: map.displayIcon,
      xMultiplier: map.xMultiplier,
      yMultiplier: map.yMultiplier,
      xScalar: map.xScalarToAdd,
      yScalar: map.yScalarToAdd,
      callouts: map.callouts ?? [],
    };

    const placeholder = await prisma.mapAsset.findFirst({
      where: { nome: { equals: map.displayName, mode: "insensitive" }, uuid: { startsWith: "placeholder-" } },
    });

    if (placeholder) {
      await prisma.mapAsset.update({ where: { id: placeholder.id }, data });
      results.push(`${map.displayName}: placeholder trocado pelo real`);
      continue;
    }

    const existing = await prisma.mapAsset.findUnique({ where: { uuid: map.uuid } });
    await prisma.mapAsset.upsert({ where: { uuid: map.uuid }, update: data, create: data });
    results.push(`${map.displayName}: ${existing ? "atualizado" : "criado"}`);
  }

  return results;
}

// Usado por dashboard.ts/matches.ts pra resolver a cor real do agente (em
// vez do cinza placeholder) sem precisar de uma segunda ida ao banco por
// linha — chame uma vez e reuse o Map.
export async function loadAgentColorsByName(): Promise<Map<string, string>> {
  const agents = await prisma.agentAsset.findMany({ select: { nome: true, cor: true } });
  return new Map(agents.filter((a) => a.cor).map((a) => [a.nome, a.cor!]));
}

// AgentAsset não tem placeholder pra trocar — `agentUuid` em StratItem/Spot
// é um campo solto (não é FK de verdade), preenchido hoje com os ids da
// paleta placeholder do front (`PLACEHOLDER_AGENTS`). Esse seed só popula a
// tabela; religar o front pra usar os uuids reais é um passo à parte.
export async function seedAgents(): Promise<string[]> {
  const agents = await fetchRealAgents();
  const results: string[] = [];

  for (const agent of agents) {
    const gradient = agent.backgroundGradientColors?.[0];
    const cor = gradient ? `#${gradient.slice(0, 6)}` : null;
    const data = {
      uuid: agent.uuid,
      nome: agent.displayName,
      funcao: agent.role?.displayName ?? null,
      displayIcon: agent.displayIcon,
      cor,
    };

    const existing = await prisma.agentAsset.findUnique({ where: { uuid: agent.uuid } });
    await prisma.agentAsset.upsert({ where: { uuid: agent.uuid }, update: data, create: data });
    results.push(`${agent.displayName}: ${existing ? "atualizado" : "criado"}`);
  }

  return results;
}
