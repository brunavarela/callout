/**
 * Schemas Zod para as respostas da HenrikDev API (não-oficial).
 *
 * Verificado contra docs.henrikdev.xyz em 2026-08-21 (doc v4.5.0). Os campos
 * marcados "formato não detalhado na doc" vieram como `unknown`/`passthrough`
 * de propósito — a doc não descreve a estrutura interna deles. Antes de
 * depender de um desses campos, confirme com uma resposta real da API e
 * apure o schema aqui (é o motivo deste arquivo existir, ver context.md §5.2).
 *
 * Toda chamada à HenrikDev deve passar a resposta por um destes `.parse()`
 * antes de tocar no resto do código — nunca `as` num JSON cru de API externa.
 */
import { z } from "zod";

const apiErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  status: z.number(),
  details: z.unknown().optional(),
});

export const henrikErrorResponseSchema = z.object({
  errors: z.array(apiErrorSchema),
});
export type HenrikErrorResponse = z.infer<typeof henrikErrorResponseSchema>;

// --- Conta (GET /valorant/v2/account/{name}/{tag} e /v2/by-puuid/account/{puuid}) ---

export const accountV2DataSchema = z.object({
  puuid: z.string(),
  region: z.string(),
  account_level: z.number(),
  name: z.string(),
  tag: z.string(),
  card: z.string(),
  title: z.string(),
  platforms: z.array(z.string()),
  updated_at: z.string(),
});
export type AccountV2Data = z.infer<typeof accountV2DataSchema>;

export const accountV2ResponseSchema = z.object({
  status: z.number(),
  data: accountV2DataSchema,
});
export type AccountV2Response = z.infer<typeof accountV2ResponseSchema>;

// --- MMR (GET /valorant/v2/by-puuid/mmr/{affinity}/{platform}/{puuid} e -history) ---

const mmrImagesSchema = z.object({
  small: z.string(),
  large: z.string(),
  triangle_down: z.string(),
  triangle_up: z.string(),
});

const mmrCurrentDataSchema = z.object({
  currenttier: z.number(),
  currenttierpatched: z.string(),
  elo: z.number(),
  ranking_in_tier: z.number(), // RR dentro do tier atual
  mmr_change_to_last_game: z.number(),
  games_needed_for_rating: z.number(),
  old: z.boolean(),
  images: mmrImagesSchema,
});

const mmrHighestRankSchema = z.object({
  tier: z.number(),
  patched_tier: z.string(),
  season: z.string(),
  old: z.boolean(),
});

export const mmrV2DataSchema = z.object({
  name: z.string(),
  tag: z.string(),
  puuid: z.string(),
  current_data: mmrCurrentDataSchema,
  highest_rank: mmrHighestRankSchema,
  // formato não detalhado na doc — mapa de temporada -> dados de temporada
  by_season: z.record(z.string(), z.unknown()),
});
export type MmrV2Data = z.infer<typeof mmrV2DataSchema>;

export const mmrV2ResponseSchema = z.object({
  status: z.number(),
  data: mmrV2DataSchema,
});
export type MmrV2Response = z.infer<typeof mmrV2ResponseSchema>;

// --- Histórico de MMR (GET /valorant/v2/by-puuid/mmr-history/{affinity}/{platform}/{puuid}) ---
// Schema verificado em docs.henrikdev.xyz/api-reference/valorant/get-mmr-history-by-puuid-v2
// em 2026-08-21 — a doc não traz exemplo de resposta, só o shape dos campos.

const mmrHistoryEntrySchema = z.object({
  date: z.string(),
  elo: z.number(),
  last_change: z.number(), // delta de RR daquela partida especificamente
  map: z.object({ id: z.string(), name: z.string() }),
  match_id: z.string(),
  refunded_rr: z.number(),
  rr: z.number(), // ranking_in_tier no momento dessa entrada
  season: z.object({ id: z.string(), short: z.string() }),
  tier: z.object({ id: z.number(), name: z.string() }),
  was_derank_protected: z.boolean(),
});
export type MmrHistoryEntry = z.infer<typeof mmrHistoryEntrySchema>;

export const mmrHistoryV2DataSchema = z.object({
  account: z.object({ name: z.string(), tag: z.string(), puuid: z.string() }),
  history: z.array(mmrHistoryEntrySchema),
});
export type MmrHistoryV2Data = z.infer<typeof mmrHistoryV2DataSchema>;

export const mmrHistoryV2ResponseSchema = z.object({
  status: z.number(),
  data: mmrHistoryV2DataSchema,
});
export type MmrHistoryV2Response = z.infer<typeof mmrHistoryV2ResponseSchema>;

// --- Identidade de jogador reaproveitada em vários pontos do payload de partida ---

const matchPlayerRefSchema = z.object({
  puuid: z.string(),
  name: z.string(),
  tag: z.string(),
  team: z.string().optional(),
});

const locationSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// --- Matchlist (GET /valorant/v4/by-puuid/matches/{affinity}/{platform}/{puuid}) ---
// --- Detalhe de partida (GET /valorant/v4/match/{affinity}/{match_id}) ---
// Mesmo formato de item (`MatchesV4Data`) nos dois endpoints.

const matchMetadataSchema = z.object({
  match_id: z.string(),
  map: z.object({ id: z.string(), name: z.string() }),
  game_version: z.string(),
  game_length_in_ms: z.number(),
  started_at: z.string(),
  is_completed: z.boolean(),
  queue: z.object({
    id: z.string(),
    mode_type: z.string().nullable(),
    name: z.string().nullable(),
  }),
  season: z.object({ id: z.string(), short: z.string() }),
  platform: z.string(),
  cluster: z.string().nullable(),
  region: z.string().nullable(),
  party_rr_penaltys: z
    .array(z.object({ party_id: z.string(), penalty: z.number() }))
    .optional(),
});

const matchPlayerStatsSchema = z.object({
  score: z.number(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  headshots: z.number(),
  bodyshots: z.number(),
  legshots: z.number(),
  damage: z.object({ dealt: z.number(), received: z.number() }),
});

const matchPlayerSchema = z.object({
  puuid: z.string(),
  name: z.string(),
  tag: z.string(),
  team_id: z.string(),
  agent: z.object({ id: z.string(), name: z.string() }),
  tier: z.object({ id: z.number(), name: z.string() }),
  stats: matchPlayerStatsSchema,
  economy: z.object({
    spent: z.object({ overall: z.number(), average: z.number() }),
    loadout_value: z.object({ overall: z.number(), average: z.number() }),
  }),
  ability_casts: z
    .object({
      ability1: z.number().nullable(),
      ability2: z.number().nullable(),
      grenade: z.number().nullable(),
      ultimate: z.number().nullable(),
    })
    .nullable(),
  behavior: z.object({
    afk_rounds: z.number(),
    rounds_in_spawn: z.number(),
    friendly_fire: z.object({ incoming: z.number(), outgoing: z.number() }),
  }),
  customization: z.object({
    card: z.string(),
    title: z.string(),
    preferred_level_border: z.string().nullable(),
  }),
  account_level: z.number(),
  session_playtime_in_ms: z.number(),
  platform: z.string(),
  party_id: z.string(),
});
export type MatchPlayer = z.infer<typeof matchPlayerSchema>;

const matchTeamSchema = z.object({
  team_id: z.string(),
  won: z.boolean(),
  rounds: z.object({ won: z.number(), lost: z.number() }),
  // formato não detalhado na doc além do id/nome/tag/membros
  premier_roster: z.unknown().nullable(),
});

const roundPlantDefuseSchema = z.object({
  round_time_in_ms: z.number(),
  site: z.string().optional(),
  location: locationSchema,
  player: matchPlayerRefSchema,
  player_locations: z.array(
    z.object({
      player: matchPlayerRefSchema,
      location: locationSchema,
      view_radians: z.number(),
    }),
  ),
});

const roundStatSchema = z.object({
  player: matchPlayerRefSchema,
  stats: z.object({
    score: z.number(),
    kills: z.number(),
    headshots: z.number(),
    bodyshots: z.number(),
    legshots: z.number(),
  }),
  economy: z.object({
    loadout_value: z.number(),
    remaining: z.number(),
    weapon: z.object({ id: z.string(), name: z.string(), type: z.string() }).nullable(),
    armor: z.object({ id: z.string(), name: z.string() }).nullable(),
  }),
  ability_casts: z.object({
    ability_1: z.number().nullable(),
    ability_2: z.number().nullable(),
    grenade: z.number().nullable(),
    ultimate: z.number().nullable(),
  }),
  damage_events: z.array(
    z.object({
      player: matchPlayerRefSchema,
      damage: z.number(),
      headshots: z.number(),
      bodyshots: z.number(),
      legshots: z.number(),
    }),
  ),
  was_afk: z.boolean(),
  stayed_in_spawn: z.boolean(),
  received_penalty: z.boolean(),
});

const matchRoundSchema = z.object({
  id: z.number(),
  result: z.string(),
  winning_team: z.string(),
  ceremony: z.string(),
  plant: roundPlantDefuseSchema.nullable(),
  defuse: roundPlantDefuseSchema.nullable(),
  stats: z.array(roundStatSchema),
});
export type MatchRound = z.infer<typeof matchRoundSchema>;

const matchKillSchema = z.object({
  round: z.number(),
  time_in_round_in_ms: z.number(),
  time_in_match_in_ms: z.number(),
  killer: matchPlayerRefSchema,
  victim: matchPlayerRefSchema,
  assistants: z.array(matchPlayerRefSchema),
  weapon: z.object({ id: z.string(), name: z.string(), type: z.string() }),
  secondary_fire_mode: z.boolean(),
  location: locationSchema,
  player_locations: z.array(
    z.object({
      player: matchPlayerRefSchema,
      location: locationSchema,
      view_radians: z.number(),
    }),
  ),
});
export type MatchKill = z.infer<typeof matchKillSchema>;

export const matchV4DataSchema = z.object({
  metadata: matchMetadataSchema,
  players: z.array(matchPlayerSchema),
  teams: z.array(matchTeamSchema),
  rounds: z.array(matchRoundSchema),
  kills: z.array(matchKillSchema),
  // formato não detalhado na doc — não usados no roadmap atual (§9)
  observers: z.array(z.unknown()).optional(),
  coaches: z.array(z.unknown()).optional(),
});
export type MatchV4Data = z.infer<typeof matchV4DataSchema>;

export const matchlistV4ResponseSchema = z.object({
  status: z.number(),
  data: z.array(matchV4DataSchema),
});
export type MatchlistV4Response = z.infer<typeof matchlistV4ResponseSchema>;

export const matchDetailsV4ResponseSchema = z.object({
  status: z.number(),
  data: matchV4DataSchema,
});
export type MatchDetailsV4Response = z.infer<typeof matchDetailsV4ResponseSchema>;
