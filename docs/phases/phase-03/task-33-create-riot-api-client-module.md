# Task 3.3: Create Riot API Client Module

Implement Riot API integration with retry logic.

**Subtasks:**
- [x] Create `src/shared/riot-api.ts` file
- [x] Import axios and AWS Secrets Manager client
- [x] Implement `getRiotApiKey()` function:
  - [x] Retrieve API key from Secrets Manager
  - [x] Cache API key for subsequent calls
- [x] Implement `makeRequestWithRetry()` function:
  - [x] Add exponential backoff for 429 and 503 errors
  - [x] Implement retry logic (max 5 retries)
  - [x] Add jitter to prevent thundering herd
- [x] Implement `getMatchIds()` function with parameter object signature:
  - [x] Accept region, puuid, startTime, endTime, and count as parameters
- [x] Implement `getMatchData()` function
- [x] Implement `getMatchTimeline()` function
- [x] Implement `filterMatchData()` function:
  - [x] Extract player-specific data from match
  - [x] Filter to agent-required fields
  - [x] Structure data by analysis domain
- [x] Implement helper functions:
  - [x] `extractItemTimeline()` from timeline events
  - [x] `extractGoldPerMinute()` from participant frames

**src/shared/riot-api.ts:**
```typescript
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import axios, { type AxiosError } from "axios";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  DEFAULT_MAX_RETRIES,
  BACKOFF_BASE_MS,
  BACKOFF_MULTIPLIER,
  BACKOFF_JITTER_RANGE_MS,
  RATE_LIMIT_STATUS_CODES,
} from "./constants";
import type {
  RiotMatchResponse,
  RiotTimelineResponse,
  ItemPurchase,
  MatchData,
} from "./types";

const secretsClient = new SecretsManagerClient({});
const logger = new Logger({ serviceName: "RiotAPI" });
let cachedApiKey: string | null = null;

async function getRiotApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.RIOT_API_KEY_SECRET,
    })
  );

  if (!response.SecretString) {
    logger.error('Secret string not found in response', { secretId: process.env.RIOT_API_KEY_SECRET });
    throw new Error('Riot API key secret string not found');
  }
  
  cachedApiKey = response.SecretString;
  return cachedApiKey;
}

async function makeRequestWithRetry<T>(
  url: string,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<T> {
  const apiKey = await getRiotApiKey();
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await axios.get<T>(url, {
        headers: { 'X-Riot-Token': apiKey },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response && RATE_LIMIT_STATUS_CODES.has(axiosError.response.status)) {
        const delay = 
          Math.pow(BACKOFF_MULTIPLIER, retries) * BACKOFF_BASE_MS + 
          Math.random() * BACKOFF_JITTER_RANGE_MS;

        logger.warn('Rate limited, retrying after delay', { retries: retries + 1, maxRetries, delayMs: delay });

        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

export function getMatchIds({
  region,
  puuid,
  startTime,
  endTime,
  count = 100,
}: {
  region: string;
  puuid: string;
  startTime: number;
  endTime: number;
  count?: number;
}): Promise<string[]> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTime}&endTime=${endTime}&start=0&count=${count}`;
  return makeRequestWithRetry<string[]>(url);
}

export function getMatchData(
  region: string,
  matchId: string
): Promise<RiotMatchResponse> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  return makeRequestWithRetry<RiotMatchResponse>(url);
}

export function getMatchTimeline(
  region: string,
  matchId: string
): Promise<RiotTimelineResponse> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
  return makeRequestWithRetry<RiotTimelineResponse>(url);
}

export function filterMatchData(
  matchData: RiotMatchResponse,
  timelineData: RiotTimelineResponse,
  puuid: string
): Omit<MatchData, 'dataKey' | 'matchId' | 'puuid' | 'expiresAt'> {
  const participant = matchData.info.participants.find(
    (p) => p.puuid === puuid
  );

  if (!participant) {
    throw new Error(`Participant not found for PUUID: ${puuid}`);
  }

  return {
    build: {
      items: [
        participant.item0,
        participant.item1,
        participant.item2,
        participant.item3,
        participant.item4,
        participant.item5,
        participant.item6,
      ].filter((item) => item !== 0),
      itemTimeline: extractItemTimeline(timelineData, participant.participantId),
      goldPerMinute: extractGoldPerMinute(timelineData, participant.participantId),
    },
    combat: {
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      damageDealt: {
        physical: participant.physicalDamageDealtToChampions,
        magic: participant.magicDamageDealtToChampions,
        true: participant.trueDamageDealtToChampions,
        total: participant.totalDamageDealtToChampions,
      },
      damageReceived: {
        physical: participant.physicalDamageTaken,
        magic: participant.magicDamageTaken,
        true: participant.trueDamageTaken,
        total: participant.totalDamageTaken,
      },
    },
    vision: {
      wardsPlaced: participant.wardsPlaced,
      wardsDestroyed: participant.wardsKilled,
      visionScore: participant.visionScore,
    },
    economy: {
      totalGold: participant.goldEarned,
      csPerMinute:
        (participant.totalMinionsKilled + participant.neutralMinionsKilled) /
        (matchData.info.gameDuration / 60),
      goldEfficiency: participant.goldSpent / participant.goldEarned,
    },
    championMeta: {
      champion: participant.championName,
      role: participant.teamPosition,
      tier: "A", // Would fetch from external API or database
      winRate: 0.52, // Would fetch from external API or database
    },
  };
}

function extractItemTimeline(
  timelineData: RiotTimelineResponse,
  participantId: number
): ItemPurchase[] {
  const itemEvents: ItemPurchase[] = [];

  for (const frame of timelineData.info.frames) {
    for (const event of frame.events) {
      if (event.type === "ITEM_PURCHASED" && event.participantId === participantId) {
        itemEvents.push({
          timestamp: event.timestamp,
          itemId: event.itemId || 0,
          cost: event.cost || 0,
        });
      }
    }
  }

  return itemEvents;
}

function extractGoldPerMinute(
  timelineData: RiotTimelineResponse,
  participantId: number
): number[] {
  const goldPerMinute: number[] = [];

  for (const frame of timelineData.info.frames) {
    const participantFrame = frame.participantFrames[participantId.toString()];
    if (participantFrame) {
      goldPerMinute.push(participantFrame.totalGold);
    }
  }

  return goldPerMinute;
}
```
