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
  EARLY_GAME_TIME_MINUTES,
  LATE_GAME_TIME_MINUTES,
  MID_GAME_TIME_MINUTES,
  RATE_LIMIT_STATUS_CODES,
  RIOT_MAX_MATCH_COUNT,
  RIOT_UNAUTHORIZED_STATUS_CODES,
  TIMESTAMP_MULTIPLIER,
} from "./constants";
import type {
  ItemPurchase,
  MatchData,
  RiotAccountResponse,
  RiotLeagueEntry,
  RiotMatchResponse,
  RiotSummonerResponse,
  RiotTimelineResponse,
} from "./types";

// Simple participant type for type safety
type RiotParticipant = {
  teamId: number;
  puuid: string;
  championName: string;
  teamPosition: string;
};

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
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const apiKey = await getRiotApiKey();
      logger.debug("Calling Riot API", { url });

      const response = await axios.get<T>(url, {
        headers: {
          "X-Riot-Token": apiKey,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      const statusCode = axiosError.response?.status;
      if (!statusCode) {
        throw error;
      }

      if (RIOT_UNAUTHORIZED_STATUS_CODES.has(statusCode)) {
        logger.warn(
          "Riot API returned unauthorized response, refreshing secret",
          {
            statusCode,
            url,
            attempt: retries + 1,
          }
        );
        cachedApiKey = null;
        retries++;
        continue;
      }

      if (!RATE_LIMIT_STATUS_CODES.has(statusCode)) {
        logger.error("Riot API request failed", {
          url,
          statusCode,
          responseData: axiosError.response?.data,
        });
        throw error;
      }

      // Rate limit or service unavailable - exponential backoff
      const exponentialDelay = BACKOFF_MULTIPLIER ** retries * BACKOFF_BASE_MS;
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
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

export function getMatchIds({
  region,
  puuid,
  startTime,
  endTime,
  count = RIOT_MAX_MATCH_COUNT,
  queue,
}: {
  region: string;
  puuid: string;
  startTime: number;
  endTime: number;
  count?: number;
  queue?: number;
}): Promise<string[]> {
  let url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTime}&endTime=${endTime}&start=0&count=${count}`;

  // Add queue filter if specified (e.g., 420 for Ranked Solo/Duo)
  if (queue !== undefined) {
    url += `&queue=${queue}`;
  }

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

/**
 * Get summoner data by PUUID
 */
export function getSummonerByPuuid(
  region: string,
  puuid: string
): Promise<RiotSummonerResponse> {
  const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return makeRequestWithRetry<RiotSummonerResponse>(url);
}

/**
 * Get account data (including PUUID) by Riot ID (gameName and tagLine)
 */
export function getAccountByRiotId(
  region: string,
  gameName: string,
  tagLine: string
): Promise<RiotAccountResponse> {
  const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return makeRequestWithRetry<RiotAccountResponse>(url);
}

/**
 * Fetch summoner rank data from Riot API
 */
export async function getSummonerRank(region: string, puuid: string) {
  const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  const entries: RiotLeagueEntry[] = await makeRequestWithRetry(url);

  // Find ranked solo/duo entry
  const rankedEntry = entries.find(
    (entry) => entry.queueType === "RANKED_SOLO_5x5"
  );

  if (!rankedEntry) {
    return {
      tier: "UNRANKED",
      rank: "",
      leaguePoints: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
  }

  return {
    tier: rankedEntry.tier,
    rank: rankedEntry.rank,
    leaguePoints: rankedEntry.leaguePoints,
    wins: rankedEntry.wins,
    losses: rankedEntry.losses,
    winRate: rankedEntry.wins / (rankedEntry.wins + rankedEntry.losses),
  };
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

  // Calculate game duration in seconds
  const gameDurationSeconds = matchData.info.gameDuration;
  const gameDurationMinutes = gameDurationSeconds / 60;

  // Filter to agent-required fields
  return {
    // Game metadata
    gameInfo: {
      gameDuration: gameDurationSeconds,
      gameDurationMinutes,
      gameMode: matchData.info.gameMode,
      gameType: matchData.info.gameType,
      queueId: matchData.info.queueId,
      gameVersion: matchData.info.gameVersion,
      platformId: matchData.info.platformId,
    },

    // Player outcome
    playerInfo: {
      participantId: participant.participantId,
      teamId: participant.teamId,
      win: participant.win,
      summonerName: participant.summonerName || participant.riotIdGameName,
      championLevel: participant.champLevel,
    },

    build: {
      items: [
        participant.item0,
        participant.item1,
        participant.item2,
        participant.item3,
        participant.item4,
        participant.item5,
        participant.item6,
      ].filter((item: number) => item !== 0),
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
      largestKillingSpree: participant.largestKillingSpree,
      largestMultiKill: participant.largestMultiKill,
      doubleKills: participant.doubleKills,
      tripleKills: participant.tripleKills,
      quadraKills: participant.quadraKills,
      pentaKills: participant.pentaKills,
    },

    vision: {
      wardsPlaced: participant.wardsPlaced,
      wardsDestroyed: participant.wardsKilled,
      visionScore: participant.visionScore,
      visionScorePerMinute: participant.visionScore / gameDurationMinutes,
      controlWardsBought: participant.visionWardsBoughtInGame || 0,
    },

    economy: {
      totalGold: participant.goldEarned,
      goldSpent: participant.goldSpent,
      csPerMinute:
        (participant.totalMinionsKilled + participant.neutralMinionsKilled) /
        gameDurationMinutes,
      goldEfficiency: participant.goldSpent / participant.goldEarned,
      goldPerMinute: participant.goldEarned / gameDurationMinutes,
      totalMinionsKilled: participant.totalMinionsKilled,
      neutralMinionsKilled: participant.neutralMinionsKilled,
      csAtEnd:
        participant.totalMinionsKilled + participant.neutralMinionsKilled,
    },

    championMeta: {
      champion: participant.championName,
      championId: participant.championId,
      role: participant.teamPosition,
      tier: "A", // Would fetch from external API or database
      winRate: 0.52, // Would fetch from external API or database
    },

    // Team composition for BuildAgent recommendations
    teamComposition: {
      allies: matchData.info.participants
        .filter(
          (p: RiotParticipant) =>
            p.teamId === participant.teamId && p.puuid !== puuid
        )
        .map((p: RiotParticipant) => ({
          championName: p.championName,
          role: p.teamPosition,
        })),
      enemies: matchData.info.participants
        .filter((p: RiotParticipant) => p.teamId !== participant.teamId)
        .map((p: RiotParticipant) => ({
          championName: p.championName,
          role: p.teamPosition,
        })),
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

// ==================== Timeline Extraction Helpers ====================

/**
 * Extract position timeline from match timeline data
 */
export function extractPositionTimeline(
  timelineData: RiotTimelineResponse,
  participantId: number
): Array<{ timestamp: number; x: number; y: number }> {
  const positions: Array<{ timestamp: number; x: number; y: number }> = [];

  for (const frame of timelineData.info.frames) {
    const participantFrame = frame.participantFrames[participantId];
    if (participantFrame?.position) {
      positions.push({
        timestamp: frame.timestamp,
        x: participantFrame.position.x,
        y: participantFrame.position.y,
      });
    }
  }

  return positions;
}

/**
 * Extract CS (creep score) at specific time intervals
 */
export function extractCSAtTime(
  timelineData: RiotTimelineResponse,
  participantId: number,
  timeMinutes: number
): number {
  const targetTimestamp = timeMinutes * TIMESTAMP_MULTIPLIER; // Convert to milliseconds

  for (const frame of timelineData.info.frames) {
    if (frame.timestamp >= targetTimestamp) {
      const participantFrame = frame.participantFrames[participantId];
      if (participantFrame) {
        return (
          (participantFrame.minionsKilled || 0) +
          (participantFrame.jungleMinionsKilled || 0)
        );
      }
    }
  }

  return 0;
}

/**
 * Extract gold at specific time intervals
 */
export function extractGoldAtTime(
  timelineData: RiotTimelineResponse,
  participantId: number,
  timeMinutes: number
): number {
  const targetTimestamp = timeMinutes * TIMESTAMP_MULTIPLIER;

  for (const frame of timelineData.info.frames) {
    if (frame.timestamp >= targetTimestamp) {
      const participantFrame = frame.participantFrames[participantId];
      if (participantFrame) {
        return participantFrame.totalGold;
      }
    }
  }

  return 0;
}

/**
 * Extract level progression over time
 */
export function extractLevelProgression(
  timelineData: RiotTimelineResponse,
  participantId: number
): Array<{ timestamp: number; level: number }> {
  const levels: Array<{ timestamp: number; level: number }> = [];

  for (const frame of timelineData.info.frames) {
    const participantFrame = frame.participantFrames[participantId];
    if (participantFrame) {
      levels.push({
        timestamp: frame.timestamp,
        level: participantFrame.level,
      });
    }
  }

  return levels;
}

/**
 * Extract damage events from timeline
 */
export function extractDamageEvents(
  timelineData: RiotTimelineResponse,
  participantId: number
): Array<{ timestamp: number; damageDealt: number; damageTaken: number }> {
  const damageEvents: Array<{
    timestamp: number;
    damageDealt: number;
    damageTaken: number;
  }> = [];

  for (const frame of timelineData.info.frames) {
    const participantFrame = frame.participantFrames[participantId];
    if (participantFrame) {
      damageEvents.push({
        timestamp: frame.timestamp,
        damageDealt:
          participantFrame.damageStats?.totalDamageDoneToChampions || 0,
        damageTaken: participantFrame.damageStats?.totalDamageTaken || 0,
      });
    }
  }

  return damageEvents;
}

/**
 * Extract objective events (dragon, baron, herald, tower kills)
 */
export function extractObjectiveEvents(
  timelineData: RiotTimelineResponse,
  teamId: number
): Array<{ type: string; timestamp: number; killer?: number }> {
  const objectives: Array<{
    type: string;
    timestamp: number;
    killer?: number;
  }> = [];

  for (const frame of timelineData.info.frames) {
    if (frame.events) {
      for (const event of frame.events) {
        if (
          (event.type === "ELITE_MONSTER_KILL" ||
            event.type === "BUILDING_KILL") &&
          (event.teamId === teamId || event.killerTeamId === teamId)
        ) {
          objectives.push({
            type: event.monsterType || event.buildingType || "UNKNOWN",
            timestamp: event.timestamp,
            killer: event.killerId,
          });
        }
      }
    }
  }

  return objectives;
}

/**
 * Calculate performance by game phase
 */
export function calculatePhasePerformance(
  timelineData: RiotTimelineResponse,
  participantId: number
): {
  earlyGame: { cs: number; gold: number; level: number };
  midGame: { cs: number; gold: number; level: number };
  lateGame: { cs: number; gold: number; level: number };
} {
  return {
    earlyGame: {
      cs: extractCSAtTime(timelineData, participantId, EARLY_GAME_TIME_MINUTES),
      gold: extractGoldAtTime(
        timelineData,
        participantId,
        EARLY_GAME_TIME_MINUTES
      ),
      level: extractLevelAtTime(
        timelineData,
        participantId,
        EARLY_GAME_TIME_MINUTES
      ),
    },
    midGame: {
      cs: extractCSAtTime(timelineData, participantId, MID_GAME_TIME_MINUTES),
      gold: extractGoldAtTime(
        timelineData,
        participantId,
        MID_GAME_TIME_MINUTES
      ),
      level: extractLevelAtTime(
        timelineData,
        participantId,
        MID_GAME_TIME_MINUTES
      ),
    },
    lateGame: {
      cs: extractCSAtTime(timelineData, participantId, LATE_GAME_TIME_MINUTES),
      gold: extractGoldAtTime(
        timelineData,
        participantId,
        LATE_GAME_TIME_MINUTES
      ),
      level: extractLevelAtTime(
        timelineData,
        participantId,
        LATE_GAME_TIME_MINUTES
      ),
    },
  };
}

function extractLevelAtTime(
  timelineData: RiotTimelineResponse,
  participantId: number,
  timeMinutes: number
): number {
  const targetTimestamp = timeMinutes * TIMESTAMP_MULTIPLIER;

  for (const frame of timelineData.info.frames) {
    if (frame.timestamp >= targetTimestamp) {
      const participantFrame = frame.participantFrames[participantId];
      if (participantFrame) {
        return participantFrame.level;
      }
    }
  }

  return 1;
}
