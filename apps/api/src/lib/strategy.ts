import type { Strategy as StrategyDTO, StratItem as StratItemDTO, StratItemKind, Lado } from "@callout/shared";
import type { Strategy, StratItem, MapAsset, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { resolveDisplayName } from "./dto.js";

// Garante que uma estratégia/spot sempre tenha um MapAsset pra referenciar.
// Casa por `nome` primeiro — depois do seed (Fase 0 item 4, `npm run
// seed:assets`) isso já acha a linha real; só cria um placeholder se o mapa
// ainda não existir em nenhuma forma (nome inédito, seed não rodou pra ele
// ainda). Checar por nome antes é essencial: sem isso, um mapa cujo
// placeholder já foi trocado pelo real (uuid mudou de `placeholder-x` pro
// uuid da valorant-api.com) geraria um placeholder duplicado.
export async function ensureMapAsset(nome: string): Promise<MapAsset> {
  const existing = await prisma.mapAsset.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } } });
  if (existing) return existing;

  const slug = nome.trim().toLowerCase().replace(/\s+/g, "-");
  const uuid = `placeholder-${slug}`;
  try {
    return await prisma.mapAsset.create({
      data: {
        uuid,
        nome,
        displayIcon: null,
        xMultiplier: 0,
        yMultiplier: 0,
        xScalar: 0,
        yScalar: 0,
        callouts: [],
      },
    });
  } catch (err) {
    // Duas chamadas concorrentes pro mesmo mapa inédito geram o mesmo slug
    // (determinístico) e colidem no `uuid` único — quem perder a corrida
    // busca a linha que o vencedor acabou de criar em vez de derrubar o
    // sync/create que a chamou.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.mapAsset.findUnique({ where: { uuid } });
      if (winner) return winner;
    }
    throw err;
  }
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

export interface UsageStats {
  count: number;
  wins: number;
}

// Marcação manual de "usamos essa estratégia nessa partida" (StrategyUsage)
// — não dá pra detectar automaticamente, então o uso/winrate refletem só o
// que o time marcou depois de cada partida. Uma consulta em lote pras N
// estratégias evita N+1 quando `toStrategyDTO` roda dentro de um `.map()`.
export async function loadUsageStats(strategyIds: string[]): Promise<Map<string, UsageStats>> {
  if (strategyIds.length === 0) return new Map();
  const rows = await prisma.strategyUsage.findMany({ where: { strategyId: { in: strategyIds } }, select: { strategyId: true, won: true } });
  const map = new Map<string, UsageStats>();
  for (const r of rows) {
    const entry = map.get(r.strategyId) ?? { count: 0, wins: 0 };
    entry.count++;
    if (r.won) entry.wins++;
    map.set(r.strategyId, entry);
  }
  return map;
}

export function toStrategyDTO(strategy: StrategyWithRelations, usage?: UsageStats): StrategyDTO {
  return {
    id: strategy.id,
    equipeId: strategy.equipeId,
    mapId: strategy.mapId,
    mapName: strategy.map.nome,
    mapDisplayIcon: strategy.map.displayIcon,
    side: strategy.lado as Lado,
    title: strategy.titulo,
    description: strategy.descricao,
    createdBy: resolveDisplayName(strategy.criadoPor),
    updatedAtLabel: formatUpdatedAt(strategy.updatedAt),
    usageCount: usage?.count ?? 0,
    winratePercent: usage && usage.count > 0 ? Math.round((usage.wins / usage.count) * 100) : 0,
    items: strategy.items.map(toStratItemDTO),
    comments: [],
  };
}
