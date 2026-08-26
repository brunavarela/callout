import {
  accountV2ResponseSchema,
  henrikErrorResponseSchema,
  matchlistV4ResponseSchema,
  matchDetailsV4ResponseSchema,
  mmrV2ResponseSchema,
  mmrHistoryV2ResponseSchema,
  type AccountV2Data,
  type MatchV4Data,
  type MmrV2Data,
  type MmrHistoryEntry,
} from "@callout/shared";
import { env } from "./env.js";

const BASE_URL = "https://api.henrikdev.xyz";

export class HenrikDevError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HenrikDevError";
  }
}

async function henrikFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: env.HENRIKDEV_API_KEY },
  });
  const json = await res.json();

  if (!res.ok) {
    const parsedError = henrikErrorResponseSchema.safeParse(json);
    const message = parsedError.success
      ? parsedError.data.errors.map((e) => e.message).join("; ")
      : `HenrikDev respondeu ${res.status}`;
    throw new HenrikDevError(message, res.status);
  }

  return json;
}

export async function getAccountByRiotId(name: string, tag: string): Promise<AccountV2Data> {
  const json = await henrikFetch(`/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
  return accountV2ResponseSchema.parse(json).data;
}

export async function getMatchlist(affinity: string, puuid: string): Promise<MatchV4Data[]> {
  const json = await henrikFetch(`/valorant/v4/by-puuid/matches/${affinity}/pc/${puuid}?size=30`);
  return matchlistV4ResponseSchema.parse(json).data;
}

export async function getMatchDetails(affinity: string, matchId: string): Promise<MatchV4Data> {
  const json = await henrikFetch(`/valorant/v4/match/${affinity}/${matchId}`);
  return matchDetailsV4ResponseSchema.parse(json).data;
}

// Sem segmento de plataforma — diferente de mmr-history logo abaixo, essa
// rota 404 ("Route not found") se mandar /pc/ no meio (testado direto na API
// em 2026-08-26; a doc do schema em packages/shared ainda cita o formato com
// plataforma, mas não é o que a API realmente aceita hoje).
export async function getMmr(affinity: string, puuid: string): Promise<MmrV2Data> {
  const json = await henrikFetch(`/valorant/v2/by-puuid/mmr/${affinity}/${puuid}`);
  return mmrV2ResponseSchema.parse(json).data;
}

export async function getMmrHistory(affinity: string, puuid: string): Promise<MmrHistoryEntry[]> {
  const json = await henrikFetch(`/valorant/v2/by-puuid/mmr-history/${affinity}/pc/${puuid}`);
  return mmrHistoryV2ResponseSchema.parse(json).data.history;
}
