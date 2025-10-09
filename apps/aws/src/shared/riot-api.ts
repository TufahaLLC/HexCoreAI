import { Logger } from "@aws-lambda-powertools/logger";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import axios, { type AxiosError } from "axios";
import {
  BACKOFF_BASE_MS,
  BACKOFF_JITTER_RANGE_MS,
  BACKOFF_MULTIPLIER,
  DEFAULT_MAX_RETRIES,
  RATE_LIMIT_STATUS_CODES,
} from "./constants";
import type {
  ItemPurchase,
  MatchData,
  RiotMatchResponse,
  RiotTimelineResponse,
} from "./types";

const secretsClient = new SecretsManagerClient({});
let cachedApiKey: string | null = null;
const logger = new Logger({ serviceName: "RiotAPI" });

async function getRiotApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.RIOT_API_KEY_SECRET,
    })
  );

  const secretValue = response.SecretString;
  if (!secretValue) {
    throw new Error("Riot API key secret string is missing");
  }

  cachedApiKey = secretValue;
  return cachedApiKey;
}

async function makeRequestWithRetry<T>(
  url: string,
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<T> {
  const apiKey = await getRiotApiKey();
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await axios.get<T>(url, {
        headers: {
          "X-Riot-Token": apiKey,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status) {
        const statusCode = axiosError.response.status;

        if (!RATE_LIMIT_STATUS_CODES.has(statusCode)) {
          throw error;
        }
        // Rate limit or service unavailable - exponential backoff
        const exponentialDelay =
          BACKOFF_MULTIPLIER ** retries * BACKOFF_BASE_MS;
        const jitter = Math.random() * BACKOFF_JITTER_RANGE_MS;
        const delay = exponentialDelay + jitter;
        logger.info("Rate limited, retrying request", {
          delay,
          attempt: retries + 1,
          maxRetries,
          url,
        });
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
): Omit<MatchData, "dataKey" | "matchId" | "puuid" | "expiresAt"> {
  // Extract player-specific data
  const participant = matchData.info.participants.find(
    (p) => p.puuid === puuid
  );

  if (!participant) {
    throw new Error(`Participant not found for PUUID: ${puuid}`);
  }

  // Filter to agent-required fields
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
      itemTimeline: extractItemTimeline(
        timelineData,
        participant.participantId
      ),
      goldPerMinute: extractGoldPerMinute(
        timelineData,
        participant.participantId
      ),
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
      if (
        event.type === "ITEM_PURCHASED" &&
        event.participantId === participantId
      ) {
        itemEvents.push({
          timestamp: event.timestamp,
          itemId: event.itemId,
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
    const participantFrame = frame.participantFrames[participantId];
    if (participantFrame) {
      goldPerMinute.push(participantFrame.totalGold);
    }
  }

  return goldPerMinute;
}
