import type { Strategy as StrategyDTO, StratItem as StratItemDTO, StratItemKind, Lado } from "@callout/shared";
import type { Strategy, StratItem, MapAsset, User } from "@prisma/client";
import { prisma } from "./prisma.js";

// Fase 0 item 4 (seed dos mapas via valorant-api.com) ainda não existe —
// esse helper garante que uma estratégia sempre tenha um MapAsset pra
// referenciar, criando um registro placeholder na primeira vez que o nome
// aparece. Quando o job de seed real existir, ele deve casar por `nome` e
// atualizar esse registro em vez de duplicar (ver PROGRESS.md).
export async function ensureMapAsset(nome: string): Promise<MapAsset> {
  const slug = nome.trim().toLowerCase().replace(/\s+/g, "-");
  return prisma.mapAsset.upsert({
    where: { uuid: `placeholder-${slug}` },
    update: {},
    create: {
      uuid: `placeholder-${slug}`,
      nome,
      displayIcon: null,
      xMultiplier: 0,
      yMultiplier: 0,
      xScalar: 0,
      yScalar: 0,
      callouts: [],
    },
  });
}

interface StratItemPayload {
  label?: string;
  color?: string;
  points?: Array<{ x: number; y: number }>;
}

function toStratItemDTO(item: StratItem): StratItemDTO {
  const payload = (item.payload as StratItemPayload | null) ?? {};
  return {
    id: item.id,
    kind: item.tipo as StratItemKind,
    label: payload.label ?? "",
    x: item.x,
    y: item.y,
    color: payload.color ?? "#EF4958",
    agentId: item.agentUuid ?? undefined,
    points: payload.points,
  };
}

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatUpdatedAt(date: Date, now = new Date()): string {
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return `EDITADA HOJE · ${time}`;
  if (diffDays === 1) return `EDITADA ONTEM · ${time}`;
  if (diffDays < 7) return `EDITADA ${WEEKDAY_LABELS[date.getDay()]!.toUpperCase()}`;
  return `EDITADA ${date.toLocaleDateString("pt-BR")}`;
}

type StrategyWithRelations = Strategy & { items: StratItem[]; map: MapAsset; criadoPor: User };

export function toStrategyDTO(strategy: StrategyWithRelations): StrategyDTO {
  return {
    id: strategy.id,
    teamId: strategy.teamId,
    mapId: strategy.mapId,
    mapName: strategy.map.nome,
    side: strategy.lado as Lado,
    title: strategy.titulo,
    description: strategy.descricao,
    createdBy: strategy.criadoPor.riotName ?? strategy.criadoPor.discordUsername,
    updatedAtLabel: formatUpdatedAt(strategy.updatedAt),
    // Contagem de usos e winrate por estratégia dependem de ligar partida ↔
    // estratégia, o que ainda não existe (nenhum schema de "essa partida usou
    // essa estratégia") — honesto em 0 até essa peça ser construída.
    usageCount: 0,
    winratePercent: 0,
    items: strategy.items.map(toStratItemDTO),
    comments: [],
  };
}
