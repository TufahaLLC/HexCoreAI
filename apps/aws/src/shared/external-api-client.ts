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

const logger = new Logger({ serviceName: "external-api-client" });
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
const MAX_RETRY_DELAY = 10_000; // 10 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
const CIRCUIT_BREAKER_TIMEOUT = 60_000; // 1 minute before attempting reset

// ==================== Circuit Breaker ====================
enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly threshold: number,
    private readonly timeout: number
  ) {}

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
        const delay = Math.min(initialDelay * 2 ** attempt, MAX_RETRY_DELAY);
        const jitter = Math.random() * 200; // Add jitter to prevent thundering herd
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
    return this.circuitBreakers.get(key)!;
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
      const expiresAt = Date.now() + CACHE_TTL * 1000;

      await ddb.send(
        new PutCommand({
          TableName: this.cacheTable,
          Item: {
            cacheKey,
            data,
            metadata,
            expiresAt,
            ttl: Math.floor(expiresAt / 1000), // DynamoDB TTL
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

    logger.info("Fetching champion meta (placeholder)", {
      championName,
      role,
      rank,
    });

    // TODO: Implement actual U.GG scraping
    const metaData: ChampionMetaData = {
      source: "ugg",
      timestamp: Date.now(),
      region,
      championId: 0,
      championName,
      role,
      tier: "A",
      winRate: 51.5,
      pickRate: 8.2,
      banRate: 3.5,
      patch: "14.20",
    };

    await this.setCache(cacheKey, metaData, {
      source: "ugg",
      timestamp: Date.now(),
      region,
    });

    return metaData;
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

    logger.info("Fetching build meta (placeholder)", { championName, role });

    // TODO: Implement actual U.GG scraping
    const buildData: BuildMetaData = {
      source: "ugg",
      timestamp: Date.now(),
      championId: 0,
      role,
      coreItems: [3031, 3094, 3087], // Example: IE, RFC, Statikk
      winRate: 52.3,
      pickRate: 15.7,
      runes: {
        primary: {
          tree: "Precision",
          keystone: 8005,
          perks: [9111, 9103, 8014],
        },
        secondary: { tree: "Domination", perks: [8139, 8135] },
        statShards: [5008, 5008, 5002],
      },
      skillOrder: ["Q", "W", "E", "Q", "Q"],
    };

    await this.setCache(cacheKey, buildData, {
      source: "ugg",
      timestamp: Date.now(),
    });
    return buildData;
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
    const benchmarks = {
      averageRoamsPerGame:
        role === "JUNGLE" ? 8.5 : role === "MIDDLE" ? 3.2 : 1.5,
      averageMapCoverageScore: 72.3,
      optimalRecallFrequency: 5.2,
      timeSpentInEnemyJungle: role === "JUNGLE" ? 18.5 : 5.2,
      objectiveSetupArrivalTime: -45,
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
    .slice(0, 6)
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
      confidence: sources[0].confidence || 0.8,
    };
  }

  // Priority order: ugg > lolalytics > opgg > data_dragon > community_dragon
  const sourcePriority: Record<string, number> = {
    ugg: 5,
    lolalytics: 4,
    opgg: 3,
    data_dragon: 2,
    community_dragon: 1,
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
    confidence: winner.confidence || 0.8,
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
