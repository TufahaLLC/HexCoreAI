/**
 * External API Client for Third-Party Data Integration
 *
 * Provides caching, rate limiting, and data normalization for external APIs
 * including Community Dragon, Data Dragon, U.GG, OP.GG, and LoLalytics.
 */

import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import axios, { type AxiosInstance } from "axios";
import type { CheerioAPI } from "cheerio";
import { load as cheerioLoad } from "cheerio";
import {
  CACHE_TTL_MULTIPLIER,
  COMMUNITY_DRAGON_PRIORITY,
  DATA_DRAGON_PRIORITY,
  DEFAULT_CHAMPION_ID,
  DEFAULT_CONFIDENCE,
  DEFAULT_PICK_RATE,
  DEFAULT_RANK_TIER,
  DEFAULT_WIN_RATE,
  DYNAMODB_TTL_DIVISOR,
  ITEM_INFINITY_EDGE,
  ITEM_RAPID_FIRECANNON,
  ITEM_STATIKK_SHIV,
  JUNGLE_JUNGLE_TIME_BENCHMARK,
  JUNGLE_ROAM_BENCHMARK,
  KEYSSTONE_PRESSOR,
  LOLALYTICS_PRIORITY,
  MAP_COVERAGE_BENCHMARK,
  MAX_JITTER_MS,
  MIDDLE_ROAM_BENCHMARK,
  OBJECTIVE_SETUP_TIME_BENCHMARK,
  OPGG_PRIORITY,
  OTHER_JUNGLE_TIME_BENCHMARK,
  OTHER_ROAM_BENCHMARK,
  PERK_LEGEND_ALACRITY,
  PERK_OVERHEAL,
  PERK_SUDDEN_IMPACT,
  PERK_TREASURE_HUNTER,
  PERK_TRIUMPH,
  RECALL_FREQUENCY_BENCHMARK,
  STAT_SHARD_ADAPTIVE,
  STAT_SHARD_MAGIC_RESIST,
  TOP_ITEMS_LIMIT,
  UGG_PRIORITY,
} from "./constants";

const logger = new Logger({ serviceName: "external-api-client" });

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// ==================== Configuration ====================
const API_CONFIG = {
  communityDragon: {
    baseUrl: "https://raw.communitydragon.org/latest",
    timeout: 5000,
    retries: 3,
  },
  dataDragon: {
    baseUrl: "https://ddragon.leagueoflegends.com/cdn",
    currentVersion: "14.20.1",
    timeout: 5000,
  },
  ugg: {
    baseUrl: "https://u.gg",
    timeout: 10_000,
    userAgent: "HexCoreAI/1.0",
  },
};

const CACHE_TTL = 86_400; // 24 hours in seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const LOCAL_MAX_RETRY_DELAY = 10_000; // 10 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
const CIRCUIT_BREAKER_TIMEOUT = 60_000; // 1 minute before attempting reset

// Regex patterns for scraping
const TIER_PATTERN = /[SABCD]/i;
const PERCENTAGE_PATTERN = /([0-9.]+)%?/;
const PATCH_VERSION_PATTERN = /([0-9]+\.[0-9]+)/;
const CHAMPION_NAME_PATTERN = /[^a-z0-9]/g;
const GOLD_DIFF_PATTERN = /([+-]?[0-9]+)/;
const NUMBER_PATTERN = /([0-9.]+)/;
const GAMES_COUNT_PATTERN = /([0-9,]+)/;

// Default scraping values
const DEFAULT_SCRAPE_WIN_RATE = 50.0;
const DEFAULT_SCRAPE_PICK_RATE = 5.0;
const DEFAULT_SCRAPE_BAN_RATE = 5.0;
const DEFAULT_SCRAPE_PATCH = "14.20";
const MAX_SKILL_ORDER_LEVELS = 5;

// ==================== Helper Functions ====================

/**
 * Extract tier from cheerio element
 */
function extractTier($: CheerioAPI, defaultTier: string): string {
  const tierElement = $(
    '.champion-ranking-stats .tier, [class*="tier"], .rank-tier'
  ).first();
  if (tierElement.length > 0) {
    const tierText = tierElement.text().trim();
    const tierMatch = tierText.match(TIER_PATTERN);
    if (tierMatch) {
      return tierMatch[0].toUpperCase();
    }
  }
  return defaultTier;
}

/**
 * Extract percentage value from cheerio element
 */
function extractPercentage(
  $: CheerioAPI,
  selector: string,
  defaultValue: number
): number {
  const element = $(selector).first();
  if (element.length > 0) {
    const text = element.text();
    const match = text.match(PERCENTAGE_PATTERN);
    if (match) {
      return Number.parseFloat(match[1]);
    }
  }
  return defaultValue;
}

/**
 * Extract patch version from cheerio element
 */
function extractPatchVersion($: CheerioAPI, defaultPatch: string): string {
  const patchElement = $('.patch-version, [class*="patch"], .version').first();
  if (patchElement.length > 0) {
    const patchText = patchElement.text().trim();
    const patchMatch = patchText.match(PATCH_VERSION_PATTERN);
    if (patchMatch) {
      return patchMatch[1];
    }
  }
  return defaultPatch;
}

/**
 * Extract item IDs from cheerio elements
 */
function extractItemIds($: CheerioAPI, selector: string): number[] {
  const items: number[] = [];
  $(selector).each((_i, el) => {
    const itemIdAttr = $(el).attr("data-item-id");
    const itemIdData = $(el).data("itemId");
    const itemIdStr =
      itemIdAttr || (typeof itemIdData === "string" ? itemIdData : "") || "0";
    const itemId = Number.parseInt(itemIdStr, 10);
    if (itemId > 0) {
      items.push(itemId);
    }
  });
  return items;
}

// ==================== Circuit Breaker ====================
const CircuitState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
} as const;

type CircuitState = (typeof CircuitState)[keyof typeof CircuitState];

class CircuitBreaker {
  private readonly threshold: number;
  private readonly timeout: number;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(threshold: number, timeout: number) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        logger.info("Circuit breaker transitioning to HALF_OPEN");
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN - request rejected");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount += 1;
      if (this.successCount >= 2) {
        logger.info("Circuit breaker transitioning to CLOSED");
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      logger.warn("Circuit breaker transitioning to OPEN", {
        failureCount: this.failureCount,
        threshold: this.threshold,
      });
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// ==================== Types ====================
export type ExternalDataSource = {
  source: "community_dragon" | "data_dragon" | "ugg" | "opgg" | "lolalytics";
  timestamp: number;
  version?: string;
  region?: string;
};

export type CachedExternalData<T> = {
  data: T;
  metadata: ExternalDataSource;
  expiresAt: number;
};

export interface ChampionMetaData extends ExternalDataSource {
  championId: number;
  championName: string;
  role: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  patch: string;
}

export interface BuildMetaData extends ExternalDataSource {
  championId: number;
  role: string;
  coreItems: number[];
  winRate: number;
  pickRate: number;
  runes: {
    primary: { tree: string; keystone: number; perks: number[] };
    secondary: { tree: string; perks: number[] };
    statShards: number[];
  };
  skillOrder: string[];
}

export interface PlayerBenchmark extends ExternalDataSource {
  metric: string;
  value: number;
  percentile: number;
  rank: string;
  role: string;
}

export interface MatchupData extends ExternalDataSource {
  championId: number;
  role: string;
  vsChampionId: number;
  winRate: number;
  laneWinRate: number;
  goldDiffAt15: number;
  csPerMinute: number;
  games: number;
}

// ==================== Retry Logic ====================
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  initialDelay = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * 2 ** attempt,
          LOCAL_MAX_RETRY_DELAY
        );
        const jitter = Math.random() * MAX_JITTER_MS; // Add jitter to prevent thundering herd
        const totalDelay = delay + jitter;

        logger.warn("Retry attempt", {
          attempt: attempt + 1,
          maxRetries,
          delayMs: Math.round(totalDelay),
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// ==================== External API Client ====================
export class ExternalAPIClient {
  private readonly cdnAxios: AxiosInstance;
  private readonly ddAxios: AxiosInstance;
  private readonly scrapingAxios: AxiosInstance;
  private readonly cacheTable: string;
  private readonly circuitBreakers: Map<string, CircuitBreaker>;

  constructor() {
    this.cacheTable =
      process.env.EXTERNAL_DATA_CACHE_TABLE || "HexCore-ExternalDataCache";
    this.circuitBreakers = new Map();

    // Community Dragon client
    this.cdnAxios = axios.create({
      baseURL: API_CONFIG.communityDragon.baseUrl,
      timeout: API_CONFIG.communityDragon.timeout,
      headers: { Accept: "application/json" },
    });

    // Data Dragon client
    this.ddAxios = axios.create({
      baseURL: `${API_CONFIG.dataDragon.baseUrl}/${API_CONFIG.dataDragon.currentVersion}`,
      timeout: API_CONFIG.dataDragon.timeout,
    });

    // Scraping client (with user agent)
    this.scrapingAxios = axios.create({
      timeout: 10_000,
      headers: {
        "User-Agent": API_CONFIG.ugg.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  }

  private getCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(
        key,
        new CircuitBreaker(CIRCUIT_BREAKER_THRESHOLD, CIRCUIT_BREAKER_TIMEOUT)
      );
    }
    const circuitBreaker = this.circuitBreakers.get(key);
    if (!circuitBreaker) {
      throw new Error(`Circuit breaker not found for key: ${key}`);
    }
    return circuitBreaker;
  }

  // ==================== Caching Layer ====================
  private async getFromCache<T>(
    cacheKey: string
  ): Promise<CachedExternalData<T> | null> {
    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: this.cacheTable,
          Key: { cacheKey },
        })
      );

      if (!result.Item) {
        return null;
      }

      const cached = result.Item as CachedExternalData<T> & {
        cacheKey: string;
      };

      // Check if expired
      if (cached.expiresAt < Date.now()) {
        logger.info("Cache expired", { cacheKey });
        return null;
      }

      logger.info("Cache hit", { cacheKey });
      return cached;
    } catch (error) {
      logger.warn("Cache read error", { error, cacheKey });
      return null;
    }
  }

  private async setCache<T>(
    cacheKey: string,
    data: T,
    metadata: ExternalDataSource
  ): Promise<void> {
    try {
      const expiresAt = Date.now() + CACHE_TTL * CACHE_TTL_MULTIPLIER;

      await ddb.send(
        new PutCommand({
          TableName: this.cacheTable,
          Item: {
            cacheKey,
            data,
            metadata,
            expiresAt,
            ttl: Math.floor(expiresAt / DYNAMODB_TTL_DIVISOR), // DynamoDB TTL
          },
        })
      );

      logger.info("Cache set", { cacheKey, expiresAt });
    } catch (error) {
      logger.error("Cache write error", { error, cacheKey });
    }
  }

  // ==================== Community Dragon Methods ====================
  async getChampionDataFromCommunityDragon(
    championKey: string
  ): Promise<Record<string, unknown>> {
    const cacheKey = `cdragon:champion:${championKey}`;
    const cached = await this.getFromCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Fetching from Community Dragon", { championKey });

    const circuitBreaker = this.getCircuitBreaker("community_dragon");

    try {
      const response = await circuitBreaker.execute(() =>
        retryWithBackoff(() =>
          this.cdnAxios.get(
            `/plugins/rcp-be-lol-game-data/global/default/v1/champions/${championKey}.json`
          )
        )
      );

      const metadata: ExternalDataSource = {
        source: "community_dragon",
        timestamp: Date.now(),
      };

      await this.setCache(cacheKey, response.data, metadata);
      return response.data;
    } catch (error) {
      logger.warn("Community Dragon fetch failed", { championKey, error });
      return {};
    }
  }

  async getItemsFromCommunityDragon(): Promise<Record<string, unknown>> {
    const cacheKey = "cdragon:items:all";
    const cached = await this.getFromCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    try {
      const response = await this.cdnAxios.get(
        "/plugins/rcp-be-lol-game-data/global/default/v1/items.json"
      );

      const metadata: ExternalDataSource = {
        source: "community_dragon",
        timestamp: Date.now(),
      };

      await this.setCache(cacheKey, response.data, metadata);
      return response.data;
    } catch (error) {
      logger.warn("Community Dragon items fetch failed", { error });
      return {};
    }
  }

  async getRunesFromCommunityDragon(): Promise<unknown[]> {
    const cacheKey = "cdragon:runes:all";
    const cached = await this.getFromCache<unknown[]>(cacheKey);

    if (cached) {
      return cached.data;
    }

    try {
      const response = await this.cdnAxios.get(
        "/plugins/rcp-be-lol-game-data/global/default/v1/perks.json"
      );

      const metadata: ExternalDataSource = {
        source: "community_dragon",
        timestamp: Date.now(),
      };

      await this.setCache(cacheKey, response.data, metadata);
      return response.data;
    } catch (error) {
      logger.warn("Community Dragon runes fetch failed", { error });
      return [];
    }
  }

  // ==================== Data Dragon Methods ====================
  async getChampionStatsFromDataDragon(
    championKey: string
  ): Promise<Record<string, unknown>> {
    const cacheKey = `ddragon:champion:${championKey}:${API_CONFIG.dataDragon.currentVersion}`;
    const cached = await this.getFromCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    try {
      const response = await this.ddAxios.get(
        `/data/en_US/champion/${championKey}.json`
      );

      const metadata: ExternalDataSource = {
        source: "data_dragon",
        timestamp: Date.now(),
        version: API_CONFIG.dataDragon.currentVersion,
      };

      const championData = response.data.data[championKey] || {};
      await this.setCache(cacheKey, championData, metadata);
      return championData;
    } catch (error) {
      logger.warn("Data Dragon champion fetch failed", { championKey, error });
      return {};
    }
  }

  async getItemsFromDataDragon(): Promise<Record<string, unknown>> {
    const cacheKey = `ddragon:items:${API_CONFIG.dataDragon.currentVersion}`;
    const cached = await this.getFromCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    try {
      const response = await this.ddAxios.get("/data/en_US/item.json");

      const metadata: ExternalDataSource = {
        source: "data_dragon",
        timestamp: Date.now(),
        version: API_CONFIG.dataDragon.currentVersion,
      };

      await this.setCache(cacheKey, response.data.data, metadata);
      return response.data.data;
    } catch (error) {
      logger.warn("Data Dragon items fetch failed", { error });
      return {};
    }
  }

  // ==================== Placeholder Methods ====================
  // These return mock data until actual scraping/API integration is implemented

  async getChampionMetaFromUGG(
    championName: string,
    role: string,
    rank = "platinum_plus",
    region = "world"
  ): Promise<ChampionMetaData> {
    const cacheKey = `ugg:meta:${championName}:${role}:${rank}:${region}`;
    const cached = await this.getFromCache<ChampionMetaData>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Scraping U.GG champion meta", {
      championName,
      role,
      rank,
      region,
    });

    const circuitBreaker = this.getCircuitBreaker("ugg");

    try {
      // Normalize champion name for URL (lowercase, no spaces/special chars)
      const urlChampionName = championName
        .toLowerCase()
        .replace(CHAMPION_NAME_PATTERN, "");
      const url = `${API_CONFIG.ugg.baseUrl}/lol/champions/${urlChampionName}/build?rank=${rank}&region=${region}&role=${role.toLowerCase()}`;

      const response = await circuitBreaker.execute(() =>
        retryWithBackoff(() => this.scrapingAxios.get(url))
      );

      const $ = cheerioLoad(response.data);

      // Extract data using helper functions
      const tier = extractTier($, DEFAULT_RANK_TIER);
      const winRate = extractPercentage(
        $,
        '.champion-ranking-stats .win-rate, [class*="win-rate"], [class*="winrate"]',
        DEFAULT_SCRAPE_WIN_RATE
      );
      const pickRate = extractPercentage(
        $,
        '.champion-ranking-stats .pick-rate, [class*="pick-rate"], [class*="pickrate"]',
        DEFAULT_SCRAPE_PICK_RATE
      );
      const banRate = extractPercentage(
        $,
        '.champion-ranking-stats .ban-rate, [class*="ban-rate"], [class*="banrate"]',
        DEFAULT_SCRAPE_BAN_RATE
      );
      const patch = extractPatchVersion($, DEFAULT_SCRAPE_PATCH);

      const metaData: ChampionMetaData = {
        source: "ugg",
        timestamp: Date.now(),
        region,
        championId: DEFAULT_CHAMPION_ID, // Would need champion name to ID mapping
        championName,
        role,
        tier,
        winRate,
        pickRate,
        banRate,
        patch,
      };

      await this.setCache(cacheKey, metaData, {
        source: "ugg",
        timestamp: Date.now(),
        region,
      });

      logger.info("U.GG champion meta scraped successfully", {
        championName,
        tier,
        winRate,
      });

      return metaData;
    } catch (error) {
      logger.warn("U.GG scraping failed, returning defaults", {
        championName,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Return default data on failure
      return {
        source: "ugg",
        timestamp: Date.now(),
        region,
        championId: DEFAULT_CHAMPION_ID,
        championName,
        role,
        tier: DEFAULT_RANK_TIER,
        winRate: DEFAULT_SCRAPE_WIN_RATE,
        pickRate: DEFAULT_SCRAPE_PICK_RATE,
        banRate: DEFAULT_SCRAPE_BAN_RATE,
        patch: DEFAULT_SCRAPE_PATCH,
      };
    }
  }

  async getBuildMetaFromUGG(
    championName: string,
    role: string,
    rank = "platinum_plus"
  ): Promise<BuildMetaData> {
    const cacheKey = `ugg:build:${championName}:${role}:${rank}`;
    const cached = await this.getFromCache<BuildMetaData>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Scraping U.GG build meta", { championName, role, rank });

    const circuitBreaker = this.getCircuitBreaker("ugg");

    try {
      const urlChampionName = championName
        .toLowerCase()
        .replace(CHAMPION_NAME_PATTERN, "");
      const url = `${API_CONFIG.ugg.baseUrl}/lol/champions/${urlChampionName}/build?rank=${rank}&role=${role.toLowerCase()}`;

      const response = await circuitBreaker.execute(() =>
        retryWithBackoff(() => this.scrapingAxios.get(url))
      );

      const $ = cheerioLoad(response.data);

      // Extract core items
      const coreItems = extractItemIds(
        $,
        ".core-items .item, [class*=core-item], .recommended-build .item"
      );

      // Extract win rate and pick rate for this build
      const winRate = extractPercentage(
        $,
        ".build-stats .win-rate, [class*=build-win]",
        DEFAULT_WIN_RATE
      );
      const pickRate = extractPercentage(
        $,
        ".build-stats .pick-rate, [class*=build-pick]",
        DEFAULT_PICK_RATE
      );

      // Extract skill order (simplified - just first 5 levels)
      const skillOrder: string[] = [];
      $(".skill-order .skill, [class*=skill-priority]")
        .slice(0, MAX_SKILL_ORDER_LEVELS)
        .each((_i, el) => {
          const skill = $(el).text().trim().toUpperCase();
          if (["Q", "W", "E", "R"].includes(skill)) {
            skillOrder.push(skill);
          }
        });

      // Default skill order if scraping fails
      if (skillOrder.length === 0) {
        skillOrder.push("Q", "W", "E", "Q", "Q");
      }

      const buildData: BuildMetaData = {
        source: "ugg",
        timestamp: Date.now(),
        championId: DEFAULT_CHAMPION_ID,
        role,
        coreItems:
          coreItems.length > 0
            ? coreItems
            : [ITEM_INFINITY_EDGE, ITEM_RAPID_FIRECANNON, ITEM_STATIKK_SHIV],
        winRate,
        pickRate,
        runes: {
          primary: {
            tree: "Precision",
            keystone: KEYSSTONE_PRESSOR,
            perks: [PERK_OVERHEAL, PERK_TRIUMPH, PERK_LEGEND_ALACRITY],
          },
          secondary: {
            tree: "Domination",
            perks: [PERK_SUDDEN_IMPACT, PERK_TREASURE_HUNTER],
          },
          statShards: [
            STAT_SHARD_ADAPTIVE,
            STAT_SHARD_ADAPTIVE,
            STAT_SHARD_MAGIC_RESIST,
          ],
        },
        skillOrder,
      };

      await this.setCache(cacheKey, buildData, {
        source: "ugg",
        timestamp: Date.now(),
      });

      logger.info("U.GG build meta scraped successfully", {
        championName,
        itemCount: coreItems.length,
      });

      return buildData;
    } catch (error) {
      logger.warn("U.GG build scraping failed, returning defaults", {
        championName,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Return default data on failure
      return {
        source: "ugg",
        timestamp: Date.now(),
        championId: DEFAULT_CHAMPION_ID,
        role,
        coreItems: [
          ITEM_INFINITY_EDGE,
          ITEM_RAPID_FIRECANNON,
          ITEM_STATIKK_SHIV,
        ],
        winRate: DEFAULT_WIN_RATE,
        pickRate: DEFAULT_PICK_RATE,
        runes: {
          primary: {
            tree: "Precision",
            keystone: KEYSSTONE_PRESSOR,
            perks: [PERK_OVERHEAL, PERK_TRIUMPH, PERK_LEGEND_ALACRITY],
          },
          secondary: {
            tree: "Domination",
            perks: [PERK_SUDDEN_IMPACT, PERK_TREASURE_HUNTER],
          },
          statShards: [
            STAT_SHARD_ADAPTIVE,
            STAT_SHARD_ADAPTIVE,
            STAT_SHARD_MAGIC_RESIST,
          ],
        },
        skillOrder: ["Q", "W", "E", "Q", "Q"],
      };
    }
  }

  async getPlayerBenchmarkFromUGG(
    metric: string,
    value: number,
    role: string,
    rank: string
  ): Promise<PlayerBenchmark> {
    logger.info("Calculating player benchmark (placeholder)", {
      metric,
      value,
      role,
      rank,
    });

    // TODO: Implement actual percentile calculation based on scraped distribution data
    const benchmark: PlayerBenchmark = {
      source: "ugg",
      timestamp: Date.now(),
      metric,
      value,
      percentile: 65, // Placeholder
      rank,
      role,
    };

    return benchmark;
  }

  async getMapPressureBenchmarks(
    role: string,
    rank: string
  ): Promise<Record<string, number>> {
    const cacheKey = `ugg:map-pressure:${role}:${rank}`;
    const cached = await this.getFromCache<Record<string, number>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Fetching map pressure benchmarks (placeholder)", {
      role,
      rank,
    });

    // TODO: Implement actual data fetching
    let averageRoamsPerGame: number;
    if (role === "JUNGLE") {
      averageRoamsPerGame = JUNGLE_ROAM_BENCHMARK;
    } else if (role === "MIDDLE") {
      averageRoamsPerGame = MIDDLE_ROAM_BENCHMARK;
    } else {
      averageRoamsPerGame = OTHER_ROAM_BENCHMARK;
    }

    const benchmarks = {
      averageRoamsPerGame,
      averageMapCoverageScore: MAP_COVERAGE_BENCHMARK,
      optimalRecallFrequency: RECALL_FREQUENCY_BENCHMARK,
      timeSpentInEnemyJungle:
        role === "JUNGLE"
          ? JUNGLE_JUNGLE_TIME_BENCHMARK
          : OTHER_JUNGLE_TIME_BENCHMARK,
      objectiveSetupArrivalTime: OBJECTIVE_SETUP_TIME_BENCHMARK,
    };

    await this.setCache(cacheKey, benchmarks, {
      source: "ugg",
      timestamp: Date.now(),
    });
    return benchmarks;
  }

  async getTemporalBenchmarks(
    championName: string,
    role: string,
    rank: string
  ): Promise<Record<string, unknown>> {
    const cacheKey = `ugg:temporal:${championName}:${role}:${rank}`;
    const cached = await this.getFromCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Fetching temporal benchmarks (placeholder)", {
      championName,
      role,
      rank,
    });

    // TODO: Implement actual data fetching
    const benchmarks = {
      earlyGameBenchmarks: {
        csAt10: 80,
        goldAt10: 3500,
        expectedKills: 1.2,
      },
      midGameBenchmarks: {
        csAt20: 160,
        goldAt20: 8000,
        expectedKills: 3.5,
      },
      lateGameBenchmarks: {
        csAt30: 240,
        goldAt30: 13_000,
        expectedKills: 6.0,
      },
    };

    await this.setCache(cacheKey, benchmarks, {
      source: "ugg",
      timestamp: Date.now(),
    });
    return benchmarks;
  }

  // ==================== OP.GG Scraping Methods ====================

  async getMatchupDataFromOPGG(
    championName: string,
    role: string,
    vsChampionName: string
  ): Promise<MatchupData> {
    const cacheKey = `opgg:matchup:${championName}:${role}:${vsChampionName}`;
    const cached = await this.getFromCache<MatchupData>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Scraping OP.GG matchup data", {
      championName,
      vsChampionName,
      role,
    });

    const circuitBreaker = this.getCircuitBreaker("opgg");

    try {
      const urlChampionName = championName
        .toLowerCase()
        .replace(CHAMPION_NAME_PATTERN, "");
      const urlVsChampionName = vsChampionName
        .toLowerCase()
        .replace(CHAMPION_NAME_PATTERN, "");
      const url = `https://www.op.gg/champions/${urlChampionName}/${role.toLowerCase()}/counters/${urlVsChampionName}`;

      const response = await circuitBreaker.execute(() =>
        retryWithBackoff(() => this.scrapingAxios.get(url))
      );

      const $ = cheerioLoad(response.data);

      // Extract matchup statistics
      const winRate = extractPercentage(
        $,
        ".matchup-stats .win-rate, [class*=matchup-win]",
        DEFAULT_SCRAPE_WIN_RATE
      );

      const laneWinRate = extractPercentage(
        $,
        ".matchup-stats .lane-win-rate, [class*=lane-win]",
        DEFAULT_SCRAPE_WIN_RATE
      );

      // Extract gold diff at 15
      let goldDiffAt15 = 0;
      const goldDiffElement = $(
        ".matchup-stats .gold-diff, [class*=gold-diff]"
      ).first();
      if (goldDiffElement.length > 0) {
        const goldDiffText = goldDiffElement.text();
        const goldDiffMatch = goldDiffText.match(GOLD_DIFF_PATTERN);
        if (goldDiffMatch) {
          goldDiffAt15 = Number.parseInt(goldDiffMatch[1], 10);
        }
      }

      // Extract CS per minute
      let csPerMinute = 0;
      const csElement = $(
        ".matchup-stats .cs-per-min, [class*=cs-min]"
      ).first();
      if (csElement.length > 0) {
        const csText = csElement.text();
        const csMatch = csText.match(NUMBER_PATTERN);
        if (csMatch) {
          csPerMinute = Number.parseFloat(csMatch[1]);
        }
      }

      // Extract games count
      let games = 1000;
      const gamesElement = $(
        ".matchup-stats .games, [class*=game-count]"
      ).first();
      if (gamesElement.length > 0) {
        const gamesText = gamesElement.text();
        const gamesMatch = gamesText.match(GAMES_COUNT_PATTERN);
        if (gamesMatch) {
          games = Number.parseInt(gamesMatch[1].replace(/,/g, ""), 10);
        }
      }

      const matchupData: MatchupData = {
        source: "opgg",
        timestamp: Date.now(),
        championId: DEFAULT_CHAMPION_ID,
        role,
        vsChampionId: DEFAULT_CHAMPION_ID,
        winRate,
        laneWinRate,
        goldDiffAt15,
        csPerMinute,
        games,
      };

      await this.setCache(cacheKey, matchupData, {
        source: "opgg",
        timestamp: Date.now(),
      });

      logger.info("OP.GG matchup data scraped successfully", {
        championName,
        vsChampionName,
        winRate,
      });

      return matchupData;
    } catch (error) {
      logger.warn("OP.GG scraping failed, returning defaults", {
        championName,
        vsChampionName,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Return default data on failure
      return {
        source: "opgg",
        timestamp: Date.now(),
        championId: DEFAULT_CHAMPION_ID,
        role,
        vsChampionId: DEFAULT_CHAMPION_ID,
        winRate: DEFAULT_SCRAPE_WIN_RATE,
        laneWinRate: DEFAULT_SCRAPE_WIN_RATE,
        goldDiffAt15: 0,
        csPerMinute: 0,
        games: 1000,
      };
    }
  }

  // ==================== LoLalytics Scraping Methods ====================

  async getAdvancedStatsFromLoLalytics(
    championName: string,
    role: string,
    rank = "platinum_plus"
  ): Promise<Record<string, unknown>> {
    const cacheKey = `lolalytics:advanced:${championName}:${role}:${rank}`;
    const cached = await this.getFromCache<Record<string, unknown>>(cacheKey);

    if (cached) {
      return cached.data;
    }

    logger.info("Scraping LoLalytics advanced stats", {
      championName,
      role,
      rank,
    });

    const circuitBreaker = this.getCircuitBreaker("lolalytics");

    try {
      const urlChampionName = championName
        .toLowerCase()
        .replace(CHAMPION_NAME_PATTERN, "");
      const url = `https://lolalytics.com/lol/${urlChampionName}/build/?tier=${rank}&lane=${role.toLowerCase()}`;

      const response = await circuitBreaker.execute(() =>
        retryWithBackoff(() => this.scrapingAxios.get(url))
      );

      const $ = cheerioLoad(response.data);

      // Extract true win rate (adjusted)
      const trueWinRate = extractPercentage(
        $,
        ".true-winrate, [class*=adjusted-win]",
        DEFAULT_SCRAPE_WIN_RATE
      );

      // Extract depth score (champion mastery)
      let depthScore = 50;
      const depthElement = $(".depth-score, [class*=mastery-depth]").first();
      if (depthElement.length > 0) {
        const depthText = depthElement.text();
        const depthMatch = depthText.match(NUMBER_PATTERN);
        if (depthMatch) {
          depthScore = Number.parseFloat(depthMatch[1]);
        }
      }

      // Extract breadth score (champion pool diversity)
      let breadthScore = 50;
      const breadthElement = $(
        ".breadth-score, [class*=pool-diversity]"
      ).first();
      if (breadthElement.length > 0) {
        const breadthText = breadthElement.text();
        const breadthMatch = breadthText.match(NUMBER_PATTERN);
        if (breadthMatch) {
          breadthScore = Number.parseFloat(breadthMatch[1]);
        }
      }

      const advancedStats = {
        trueWinRate,
        depthScore,
        breadthScore,
        performanceByGameLength: [
          {
            durationBucket: "0-20",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 100,
          },
          {
            durationBucket: "20-30",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 200,
          },
          {
            durationBucket: "30-40",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 150,
          },
          {
            durationBucket: "40+",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 50,
          },
        ],
      };

      await this.setCache(cacheKey, advancedStats, {
        source: "lolalytics",
        timestamp: Date.now(),
      });

      logger.info("LoLalytics advanced stats scraped successfully", {
        championName,
        trueWinRate,
      });

      return advancedStats;
    } catch (error) {
      logger.warn("LoLalytics scraping failed, returning defaults", {
        championName,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Return default data on failure
      return {
        trueWinRate: DEFAULT_SCRAPE_WIN_RATE,
        depthScore: 50,
        breadthScore: 50,
        performanceByGameLength: [
          {
            durationBucket: "0-20",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 100,
          },
          {
            durationBucket: "20-30",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 200,
          },
          {
            durationBucket: "30-40",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 150,
          },
          {
            durationBucket: "40+",
            winRate: DEFAULT_SCRAPE_WIN_RATE,
            games: 50,
          },
        ],
      };
    }
  }
}

// ==================== Data Normalization Functions ====================

/**
 * Normalize champion win rate data from multiple sources
 */
export function normalizeWinRateData(
  sources: Array<{ source: string; winRate: number; sampleSize?: number }>
): number {
  if (sources.length === 0) {
    return 0;
  }
  if (sources.length === 1) {
    return sources[0].winRate;
  }

  // Weight by sample size if available, otherwise equal weight
  const totalWeight = sources.reduce((sum, s) => sum + (s.sampleSize || 1), 0);
  const weightedSum = sources.reduce(
    (sum, s) => sum + s.winRate * (s.sampleSize || 1),
    0
  );

  return weightedSum / totalWeight;
}

/**
 * Normalize build data from multiple sources
 */
export function normalizeBuildData(
  sources: Array<{
    source: string;
    items: number[];
    winRate: number;
    pickRate: number;
  }>
): { items: number[]; confidence: number } {
  if (sources.length === 0) {
    return { items: [], confidence: 0 };
  }
  if (sources.length === 1) {
    return { items: sources[0].items, confidence: 0.7 };
  }

  // Find most common items across sources
  const itemFrequency = new Map<number, number>();

  for (const source of sources) {
    for (const item of source.items) {
      itemFrequency.set(item, (itemFrequency.get(item) || 0) + 1);
    }
  }

  // Sort by frequency and take top items
  const normalizedItems = Array.from(itemFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ITEMS_LIMIT)
    .map(([item]) => item);

  // Confidence based on agreement between sources
  const avgFrequency =
    Array.from(itemFrequency.values()).reduce((a, b) => a + b, 0) /
    itemFrequency.size;
  const confidence = Math.min(avgFrequency / sources.length, 1);

  return { items: normalizedItems, confidence };
}

/**
 * Resolve conflicts when multiple sources provide different values
 */
export function resolveDataConflict<T>(
  sources: Array<{
    source: string;
    value: T;
    timestamp: number;
    confidence?: number;
  }>
): { value: T; source: string; confidence: number } {
  if (sources.length === 0) {
    throw new Error("No sources provided for conflict resolution");
  }
  if (sources.length === 1) {
    return {
      value: sources[0].value,
      source: sources[0].source,
      confidence: sources[0].confidence || DEFAULT_CONFIDENCE,
    };
  }

  // Priority order: ugg > lolalytics > opgg > data_dragon > community_dragon
  const sourcePriority: Record<string, number> = {
    ugg: UGG_PRIORITY,
    lolalytics: LOLALYTICS_PRIORITY,
    opgg: OPGG_PRIORITY,
    data_dragon: DATA_DRAGON_PRIORITY,
    community_dragon: COMMUNITY_DRAGON_PRIORITY,
  };

  // Sort by priority, then by timestamp (newer first), then by confidence
  const sorted = sources.sort((a, b) => {
    const priorityDiff =
      (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const timeDiff = b.timestamp - a.timestamp;
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (b.confidence || 0) - (a.confidence || 0);
  });

  const winner = sorted[0];
  return {
    value: winner.value,
    source: winner.source,
    confidence: winner.confidence || DEFAULT_CONFIDENCE,
  };
}

/**
 * Calculate data freshness score (0-1, where 1 is fresh)
 */
export function calculateFreshnessScore(
  timestamp: number,
  maxAgeMs = 86_400_000
): number {
  const age = Date.now() - timestamp;
  if (age <= 0) {
    return 1;
  }
  if (age >= maxAgeMs) {
    return 0;
  }
  return 1 - age / maxAgeMs;
}

/**
 * Aggregate metrics from multiple sources with confidence weighting
 */
export function aggregateMetrics(
  metrics: Array<{ value: number; source: string; confidence: number }>
): { value: number; confidence: number; sources: string[] } {
  if (metrics.length === 0) {
    return { value: 0, confidence: 0, sources: [] };
  }

  const totalConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0);
  const weightedSum = metrics.reduce(
    (sum, m) => sum + m.value * m.confidence,
    0
  );
  const avgValue = weightedSum / totalConfidence;
  const avgConfidence = totalConfidence / metrics.length;

  return {
    value: avgValue,
    confidence: Math.min(avgConfidence, 1),
    sources: metrics.map((m) => m.source),
  };
}

// Export singleton instance
export const externalAPIClient = new ExternalAPIClient();
