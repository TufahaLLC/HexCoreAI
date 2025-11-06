/**
 * Temporal Analysis Action Group Tools
 *
 * Provides tools for Bedrock Temporal Analysis Agent to analyze performance trends
 * over time, power spike utilization, and game phase effectiveness.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";
import type { RiotTimelineResponse } from "../../shared/types";

const logger = new Logger({ serviceName: "hexcore-temporal-tools" });
const tracer = new Tracer({ serviceName: "hexcore-temporal-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// Temporal analysis constants
const LEVEL_2_POWER_SPIKE = 2;
const LEVEL_6_POWER_SPIKE = 6;
const LEVEL_11_POWER_SPIKE = 11;

// Phase scoring constants
const CS_NORMALIZATION_FACTOR = 100;
const CS_WEIGHT = 40;
const GOLD_NORMALIZATION_FACTOR = 10_000;
const GOLD_WEIGHT = 40;
const LEVEL_NORMALIZATION_FACTOR = 18;
const LEVEL_WEIGHT = 20;

// Benchmark values
const EARLY_CS_BENCHMARK = 80;
const EARLY_GOLD_BENCHMARK = 3500;
const EARLY_KILLS_BENCHMARK = 1.2;
const MID_CS_BENCHMARK = 160;
const MID_GOLD_BENCHMARK = 8000;
const MID_KILLS_BENCHMARK = 3.5;
const LATE_CS_BENCHMARK = 240;
const LATE_GOLD_BENCHMARK = 13_000;
const LATE_KILLS_BENCHMARK = 6.0;

/**
 * Tool: Get Performance By Game Phase
 *
 * Analyzes performance across early, mid, and late game phases.
 */
app.tool<{ matchId: string; puuid: string; participantId: number }>(
  async ({ matchId, puuid, participantId }) => {
    logger.info("Analyzing performance by game phase", { matchId, puuid });

    try {
      const timelineResult = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `timeline:${matchId}` },
        })
      );

      if (!timelineResult.Item) {
        return {
          error: "Timeline data not found",
          matchId,
          puuid,
          note: "Timeline data not yet stored in DynamoDB",
        };
      }

      const { calculatePhasePerformance } = await import(
        "../../shared/riot-api"
      );
      const phasePerformance = calculatePhasePerformance(
        timelineResult.Item as RiotTimelineResponse,
        participantId
      );

      tracer.putMetadata("phasePerformance", phasePerformance);

      return {
        matchId,
        puuid,
        earlyGame: {
          csAt10: phasePerformance.earlyGame.cs,
          goldAt10: phasePerformance.earlyGame.gold,
          levelAt10: phasePerformance.earlyGame.level,
          performanceScore: calculatePhaseScore(phasePerformance.earlyGame),
        },
        midGame: {
          csAt20: phasePerformance.midGame.cs,
          goldAt20: phasePerformance.midGame.gold,
          levelAt20: phasePerformance.midGame.level,
          performanceScore: calculatePhaseScore(phasePerformance.midGame),
        },
        lateGame: {
          csAt30: phasePerformance.lateGame.cs,
          goldAt30: phasePerformance.lateGame.gold,
          levelAt30: phasePerformance.lateGame.level,
          performanceScore: calculatePhaseScore(phasePerformance.lateGame),
        },
        strongestPhase: determineStrongestPhase(phasePerformance),
      };
    } catch (error) {
      logger.error("Error analyzing performance by game phase", {
        error: error instanceof Error ? error.message : "Unknown error",
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "getPerformanceByGamePhase",
    description: "Analyze performance across early, mid, and late game phases",
  }
);

function calculatePhaseScore(phase: {
  cs: number;
  gold: number;
  level: number;
}): number {
  // Simple scoring: normalize CS and gold
  const csScore = Math.min(phase.cs / CS_NORMALIZATION_FACTOR, 1) * CS_WEIGHT;
  const goldScore =
    Math.min(phase.gold / GOLD_NORMALIZATION_FACTOR, 1) * GOLD_WEIGHT;
  const levelScore =
    Math.min(phase.level / LEVEL_NORMALIZATION_FACTOR, 1) * LEVEL_WEIGHT;
  return Math.round(csScore + goldScore + levelScore);
}

function determineStrongestPhase(performance: {
  earlyGame: { cs: number; gold: number; level: number };
  midGame: { cs: number; gold: number; level: number };
  lateGame: { cs: number; gold: number; level: number };
}): string {
  const scores = {
    early: calculatePhaseScore(performance.earlyGame),
    mid: calculatePhaseScore(performance.midGame),
    late: calculatePhaseScore(performance.lateGame),
  };

  if (scores.early >= scores.mid && scores.early >= scores.late) {
    return "Early Game";
  }
  if (scores.mid >= scores.late) {
    return "Mid Game";
  }
  return "Late Game";
}

/**
 * Tool: Analyze Power Spike Utilization
 *
 * Evaluates how well player utilized champion power spikes.
 */
app.tool<{ matchId: string; puuid: string; championName: string }>(
  async ({ matchId, puuid, championName }) => {
    logger.info("Analyzing power spike utilization", {
      matchId,
      puuid,
      championName,
    });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `timeline:${matchId}:puuid:${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: "Timeline data not found",
          matchId,
          puuid,
        };
      }

      // TODO: Implement power spike analysis
      return {
        matchId,
        puuid,
        championName,
        powerSpikes: [
          { level: LEVEL_2_POWER_SPIKE, utilized: false, impact: "Low" },
          { level: LEVEL_6_POWER_SPIKE, utilized: false, impact: "Medium" },
          { level: LEVEL_11_POWER_SPIKE, utilized: false, impact: "High" },
        ],
        itemPowerSpikes: [],
        utilizationScore: 0,
        note: "TODO: Power spike analysis pending timeline data extraction (Task 11.5)",
      };
    } catch (error) {
      logger.error("Error analyzing power spike utilization", {
        error: error instanceof Error ? error.message : "Unknown error",
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "analyzePowerSpikeUtilization",
    description: "Evaluate how well player utilized champion power spikes",
  }
);

/**
 * Tool: Get Scaling Curve Analysis
 *
 * Analyzes champion scaling and performance curve over game duration.
 */
app.tool<{ matchId: string; puuid: string; championName: string }>(
  async ({ matchId, puuid, championName }) => {
    logger.info("Analyzing scaling curve", { matchId, puuid, championName });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `timeline:${matchId}:puuid:${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: "Timeline data not found",
          matchId,
          puuid,
        };
      }

      // TODO: Implement scaling curve analysis
      return {
        matchId,
        puuid,
        championName,
        scalingType: "Unknown",
        goldCurve: [],
        damageCurve: [],
        impactCurve: [],
        peakPerformanceTime: 0,
        note: "TODO: Scaling curve analysis pending timeline data extraction (Task 11.5)",
      };
    } catch (error) {
      logger.error("Error analyzing scaling curve", {
        error: error instanceof Error ? error.message : "Unknown error",
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "getScalingCurveAnalysis",
    description:
      "Analyze champion scaling and performance curve over game duration",
  }
);

/**
 * Tool: Get Temporal Benchmarks
 *
 * Retrieves time-based performance benchmarks from external APIs.
 */
app.tool<{ championName: string; role: string; rank: string }>(
  async ({ championName, role, rank }) => {
    logger.info("Fetching temporal benchmarks", { championName, role, rank });

    try {
      // TODO: Integration with external API client pending Task 11.5
      const benchmarks = {
        championName,
        role,
        rank,
        earlyGameBenchmarks: {
          csAt10: EARLY_CS_BENCHMARK,
          goldAt10: EARLY_GOLD_BENCHMARK,
          expectedKills: EARLY_KILLS_BENCHMARK,
        },
        midGameBenchmarks: {
          csAt20: MID_CS_BENCHMARK,
          goldAt20: MID_GOLD_BENCHMARK,
          expectedKills: MID_KILLS_BENCHMARK,
        },
        lateGameBenchmarks: {
          csAt30: LATE_CS_BENCHMARK,
          goldAt30: LATE_GOLD_BENCHMARK,
          expectedKills: LATE_KILLS_BENCHMARK,
        },
        source: "placeholder",
        note: "TODO: Integration with U.GG/LoLalytics API pending (Task 11.5)",
      };

      tracer.putMetadata("temporalBenchmarks", benchmarks);
      return benchmarks;
    } catch (error) {
      logger.error("Error fetching temporal benchmarks", {
        error: error instanceof Error ? error.message : "Unknown error",
        championName,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "getTemporalBenchmarks",
    description:
      "Retrieve time-based performance benchmarks from external APIs",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
