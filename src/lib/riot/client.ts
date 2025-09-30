import type { MatchWorkItem } from '@/types/queue';

/**
 * Supported regional route groups for Riot API Match-V5 endpoints.
 * See https://developer.riotgames.com/apis#match-v5/GET_getMatch
 */
export type RiotRegionalRoute = 'americas' | 'europe' | 'asia' | 'sea';

const DEFAULT_REGION: RiotRegionalRoute = 'americas';

const RIOT_ACCOUNT_BASE = 'https://americas.api.riotgames.com';
const RIOT_MATCH_BASE: Record<RiotRegionalRoute, string> = {
  americas: 'https://americas.api.riotgames.com/lol/match/v5',
  europe: 'https://europe.api.riotgames.com/lol/match/v5',
  asia: 'https://asia.api.riotgames.com/lol/match/v5',
  sea: 'https://sea.api.riotgames.com/lol/match/v5',
};

const DEFAULT_MAX_RETRIES = 3;

function getApiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key || key === 'YOUR_RIOT_API_KEY_HERE') {
    throw new Error('Riot API key is not configured. Set the RIOT_API_KEY environment variable.');
  }
  return key;
}

function resolveRegion(region?: RiotRegionalRoute): RiotRegionalRoute {
  if (!region) return DEFAULT_REGION;
  return region;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type RiotFetchOptions = RequestInit & {
  allowNotFound?: boolean;
  maxRetries?: number;
};

async function riotFetch<T>(url: string, options: RiotFetchOptions = {}, attempt = 0): Promise<T | null> {
  const apiKey = getApiKey();
  const headers = new Headers(options.headers ?? {});
  headers.set('X-Riot-Token', apiKey);
  headers.set('Accept', 'application/json');

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (res.status === 429 && attempt < (options.maxRetries ?? DEFAULT_MAX_RETRIES)) {
    const retryAfterHeader = res.headers.get('retry-after');
    const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) * 1000 : (2 ** attempt) * 1000;
    await sleep(Number.isFinite(retryAfter) ? retryAfter : (2 ** attempt) * 1000);
    return riotFetch<T>(url, options, attempt + 1);
  }

  if (!res.ok) {
    if (res.status === 404 && options.allowNotFound) {
      return null;
    }
    const message = await res.text();
    throw new Error(`Riot API request failed (${res.status} ${res.statusText}): ${message}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json() as Promise<T>;
}

export interface RiotMatchIdsParams {
  puuid: string;
  startTime: number;
  endTime: number;
  start?: number;
  count?: number;
  region?: RiotRegionalRoute;
}

export async function getPUUID(gameName: string, tagLine: string): Promise<string> {
  const encodedGameName = encodeURIComponent(gameName);
  const encodedTagLine = encodeURIComponent(tagLine);
  const url = `${RIOT_ACCOUNT_BASE}/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}`;
  const data = await riotFetch<{ puuid: string }>(url);
  if (!data || typeof data.puuid !== 'string') {
    throw new Error('Unexpected response while resolving PUUID.');
  }
  return data.puuid;
}

export async function getMatchIds(params: RiotMatchIdsParams): Promise<string[]> {
  const { puuid, startTime, endTime, start = 0, count = 100, region } = params;
  const resolvedRegion = resolveRegion(region);
  const base = RIOT_MATCH_BASE[resolvedRegion];
  const url = `${base}/matches/by-puuid/${encodeURIComponent(puuid)}/ids?startTime=${startTime}&endTime=${endTime}&start=${start}&count=${count}`;
  const data = await riotFetch<string[]>(url);
  if (!data) return [];
  return data;
}

export async function getMatchDetails<T = unknown>(matchId: string, region?: RiotRegionalRoute): Promise<T> {
  const resolvedRegion = resolveRegion(region);
  const base = RIOT_MATCH_BASE[resolvedRegion];
  const url = `${base}/matches/${encodeURIComponent(matchId)}`;
  const data = await riotFetch<T>(url);
  if (!data) {
    throw new Error(`Match details unavailable for ${matchId}`);
  }
  return data;
}

export async function getMatchTimeline<T = unknown>(matchId: string, region?: RiotRegionalRoute): Promise<T | null> {
  const resolvedRegion = resolveRegion(region);
  const base = RIOT_MATCH_BASE[resolvedRegion];
  const url = `${base}/matches/${encodeURIComponent(matchId)}/timeline`;
  return riotFetch<T>(url, { allowNotFound: true });
}

export async function enqueueMatchesFromIds(
  matchIds: string[],
  workItemFactory: (matchId: string) => MatchWorkItem
): Promise<number> {
  const { enqueueMatchWorkItem } = await import('@/lib/queue/sqsClient');
  let enqueued = 0;
  for (const matchId of matchIds) {
    const workItem = workItemFactory(matchId);
    await enqueueMatchWorkItem(workItem);
    enqueued += 1;
  }
  return enqueued;
}
