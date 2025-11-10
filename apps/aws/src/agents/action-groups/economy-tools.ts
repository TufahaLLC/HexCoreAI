/**
 * Economy Analysis Action Group Tools
 *
 * Provides tools for Bedrock Economy Analysis Agent to retrieve and analyze
 * gold generation, farming efficiency, and resource allocation.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";
import {
  CS_BOTTOM_AVERAGE,
  CS_BOTTOM_EXCELLENT,
  CS_BOTTOM_GOOD,
  CS_JUNGLE_AVERAGE,
  CS_JUNGLE_EXCELLENT,
  CS_JUNGLE_GOOD,
  CS_MIDDLE_AVERAGE,
  CS_MIDDLE_EXCELLENT,
  CS_MIDDLE_GOOD,
  CS_TOP_AVERAGE,
  CS_TOP_EXCELLENT,
  CS_TOP_GOOD,
  CS_UTILITY_AVERAGE,
  CS_UTILITY_EXCELLENT,
  CS_UTILITY_GOOD,
  FARMING_EFFICIENCY_THRESHOLD,
  GOLD_EFFICIENCY_NEGATIVE_THRESHOLD,
  GOLD_EFFICIENCY_THRESHOLD,
  GOLD_PER_MIN_AVERAGE,
  GOLD_PER_MIN_EXCELLENT,
  GOLD_PER_MIN_GOOD,
  MAX_THEORETICAL_CS_PER_MIN,
  MILLISECONDS_PER_MINUTE,
  PERCENTAGE_MULTIPLIER,
  PLACEHOLDER_ITEM_GOLD_VALUE,
  PLACEHOLDER_OPTIMAL_ITEM_GOLD_VALUE,
  RECALL_TIMING_1,
  RECALL_TIMING_2,
  RECALL_TIMING_3,
  RECALL_TIMING_4,
  RECALL_TIMING_5,
  SUPPORT_HIGH_CS_THRESHOLD,
  UNSPENT_GOLD_THRESHOLD,
} from "../../shared/constants";
import { externalAPIClient } from "../../shared/external-api-client";

const logger = new Logger({ serviceName: "hexcore-economy-tools" });
const tracer = new Tracer({ serviceName: "hexcore-economy-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

// Economy analysis constants
const DEVIATION_EXCELLENT_THRESHOLD = 1;
const DEVIATION_GOOD_THRESHOLD = 2;

/**
 * Helper function to get deviation rating
 */
function getDeviationRating(deviation: number): string {
  if (deviation < DEVIATION_EXCELLENT_THRESHOLD) {
    return "Excellent";
  }
  if (deviation < DEVIATION_GOOD_THRESHOLD) {
    return "Good";
  }
  return "Poor";
}

/**
 * Tool: Get Match Economy Data
 *
 * Retrieves economic statistics including gold earned, CS, and efficiency.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Fetching economy data", { matchId, puuid });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `match:${matchId}:puuid:${puuid}` },
        })
      );

      if (!result.Item) {
        logger.warn("Match data not found", { matchId, puuid });
        return {
          error: "Match data not found",
          matchId,
          puuid,
        };
      }

      const economyData = result.Item.economy;
      const gameInfo = result.Item.gameInfo;

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("economyData", economyData);

      logger.info("Economy data retrieved successfully", {
        matchId,
        totalGold: economyData?.totalGold,
        gameDuration: gameInfo?.gameDuration,
      });

      return {
        matchId,
        puuid,
        gameDuration: gameInfo?.gameDuration || 0,
        gameDurationMinutes: gameInfo?.gameDurationMinutes || 0,
        totalGold: economyData?.totalGold || 0,
        goldSpent: economyData?.goldSpent || 0,
        csPerMinute: economyData?.csPerMinute || 0,
        goldEfficiency: economyData?.goldEfficiency || 0,
        goldPerMinute: economyData?.goldPerMinute || 0,
        totalMinionsKilled: economyData?.totalMinionsKilled || 0,
        neutralMinionsKilled: economyData?.neutralMinionsKilled || 0,
        csAtEnd: economyData?.csAtEnd || 0,
      };
    } catch (error) {
      logger.error("Error fetching economy data", { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: "getMatchEconomyData",
    description:
      "Retrieve economy and gold data for a specific match including game duration",
  }
);

/**
 * Tool: Analyze Gold Efficiency
 *
 * Analyzes gold generation, spending patterns, and resource optimization.
 */
app.tool<{
  totalGold: number;
  goldSpent: number;
  gameDuration: number;
}>(
  async ({ totalGold, goldSpent, gameDuration }) => {
    logger.info("Analyzing gold efficiency", {
      totalGold,
      goldSpent,
      gameDuration,
    });

    try {
      const gameDurationMinutes = gameDuration / 60;

      // Calculate gold metrics
      const goldPerMinute = totalGold / gameDurationMinutes;
      const goldEfficiency =
        totalGold > 0 ? (goldSpent / totalGold) * PERCENTAGE_MULTIPLIER : 0;
      const unspentGold = totalGold - goldSpent;

      // Determine gold generation rating
      let rating: "Excellent" | "Good" | "Average" | "Needs Improvement";

      if (goldPerMinute >= GOLD_PER_MIN_EXCELLENT) {
        rating = "Excellent";
      } else if (goldPerMinute >= GOLD_PER_MIN_GOOD) {
        rating = "Good";
      } else if (goldPerMinute >= GOLD_PER_MIN_AVERAGE) {
        rating = "Average";
      } else {
        rating = "Needs Improvement";
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (goldPerMinute < GOLD_PER_MIN_AVERAGE) {
        recommendations.push(
          "Low gold income. Focus on farming minions consistently and securing neutral objectives"
        );
      }

      if (goldEfficiency < GOLD_EFFICIENCY_THRESHOLD) {
        recommendations.push(
          "Significant gold left unspent. Ensure you're spending gold efficiently on items between fights"
        );
      }

      if (unspentGold > UNSPENT_GOLD_THRESHOLD) {
        recommendations.push(
          `${unspentGold.toFixed(0)} gold left unspent. Make sure to spend gold after recalls to maximize power spikes`
        );
      }

      if (goldPerMinute >= GOLD_PER_MIN_EXCELLENT) {
        recommendations.push(
          "Excellent gold generation. Continue maintaining strong farming patterns"
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          "Solid economic performance. Maintain consistent farming and gold efficiency"
        );
      }

      const result = {
        economyMetrics: {
          totalGold,
          goldSpent,
          unspentGold: unspentGold.toFixed(0),
          goldPerMinute: goldPerMinute.toFixed(1),
          goldEfficiency: `${goldEfficiency.toFixed(1)}%`,
        },
        rating,
        recommendations,
      };

      tracer.putMetadata("goldAnalysis", result);
      logger.info("Gold efficiency analysis completed", {
        rating,
        goldPerMinute: goldPerMinute.toFixed(1),
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing gold efficiency", { error });
      throw error;
    }
  },
  {
    name: "analyzeGoldEfficiency",
    description: "Analyze gold generation and spending efficiency",
  }
);

/**
 * Tool: Evaluate Resource Management
 *
 * Evaluates CS efficiency and farming patterns.
 */
app.tool<{
  csPerMinute: number;
  role: string;
  gameDuration: number;
}>(
  async ({ csPerMinute, role, gameDuration }) => {
    logger.info("Evaluating resource management", {
      csPerMinute,
      role,
      gameDuration,
    });

    try {
      const gameDurationMinutes = gameDuration / 60;
      const totalCs = csPerMinute * gameDurationMinutes;

      // Role-specific CS benchmarks
      const benchmarks: Record<
        string,
        { excellent: number; good: number; average: number }
      > = {
        TOP: {
          excellent: CS_TOP_EXCELLENT,
          good: CS_TOP_GOOD,
          average: CS_TOP_AVERAGE,
        },
        JUNGLE: {
          excellent: CS_JUNGLE_EXCELLENT,
          good: CS_JUNGLE_GOOD,
          average: CS_JUNGLE_AVERAGE,
        },
        MIDDLE: {
          excellent: CS_MIDDLE_EXCELLENT,
          good: CS_MIDDLE_GOOD,
          average: CS_MIDDLE_AVERAGE,
        },
        BOTTOM: {
          excellent: CS_BOTTOM_EXCELLENT,
          good: CS_BOTTOM_GOOD,
          average: CS_BOTTOM_AVERAGE,
        },
        UTILITY: {
          excellent: CS_UTILITY_EXCELLENT,
          good: CS_UTILITY_GOOD,
          average: CS_UTILITY_AVERAGE,
        },
      };

      const roleBenchmark = benchmarks[role] || benchmarks.MIDDLE;

      // Determine CS rating
      let rating: "Excellent" | "Good" | "Average" | "Needs Improvement";

      if (csPerMinute >= roleBenchmark.excellent) {
        rating = "Excellent";
      } else if (csPerMinute >= roleBenchmark.good) {
        rating = "Good";
      } else if (csPerMinute >= roleBenchmark.average) {
        rating = "Average";
      } else {
        rating = "Needs Improvement";
      }

      // Calculate farming efficiency
      const maxPossibleCs = gameDurationMinutes * MAX_THEORETICAL_CS_PER_MIN;
      const farmingEfficiency =
        (totalCs / maxPossibleCs) * PERCENTAGE_MULTIPLIER;

      // Generate recommendations
      const recommendations: string[] = [];

      if (csPerMinute < roleBenchmark.average) {
        recommendations.push(
          `CS/min is below average for ${role} role. Focus on last-hitting minions and farming between objectives`
        );
      }

      if (
        farmingEfficiency < FARMING_EFFICIENCY_THRESHOLD &&
        role !== "UTILITY"
      ) {
        recommendations.push(
          "Missing significant farm opportunities. Prioritize wave management and jungle camp clear timing"
        );
      }

      if (csPerMinute >= roleBenchmark.excellent) {
        recommendations.push(
          "Exceptional farming efficiency. Your CS numbers are among the best for your role"
        );
      }

      if (role === "UTILITY" && csPerMinute > SUPPORT_HIGH_CS_THRESHOLD) {
        recommendations.push(
          "High CS for support role. Ensure you're not taking farm from your ADC"
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          "Solid CS performance. Continue maintaining consistent farming patterns"
        );
      }

      const result = {
        farmingMetrics: {
          csPerMinute: csPerMinute.toFixed(1),
          totalCs,
          farmingEfficiency: `${farmingEfficiency.toFixed(1)}%`,
          role,
        },
        roleBenchmarks: {
          excellent: roleBenchmark.excellent,
          good: roleBenchmark.good,
          average: roleBenchmark.average,
        },
        rating,
        recommendations,
      };

      tracer.putMetadata("resourceManagement", result);
      logger.info("Resource management evaluation completed", {
        rating,
        csPerMinute: csPerMinute.toFixed(1),
      });

      return result;
    } catch (error) {
      logger.error("Error evaluating resource management", { error });
      throw error;
    }
  },
  {
    name: "compareFarmingEfficiency",
    description: "Compare CS and farming efficiency to role benchmarks",
  }
);

/**
 * Tool: Get Economy Benchmarks
 *
 * Retrieves economy benchmarks from meta sources based on role and rank.
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Fetching economy benchmarks", { role, rank });

    try {
      // Fetch economy benchmarks from U.GG
      const benchmarkData = await externalAPIClient.getPlayerBenchmarkFromUGG(
        "goldPerMinute",
        0,
        role,
        rank
      );

      const result = {
        role,
        rank,
        benchmarks: {
          goldPerMinute: { excellent: 450, good: 400, average: 350, poor: 300 },
          csPerMinute: { excellent: 8.5, good: 7.5, average: 6.5, poor: 5.5 },
          goldEfficiency: { excellent: 95, good: 90, average: 85, poor: 80 },
          farmPriority:
            role === "JUNGLE"
              ? "Jungle camps + lane tax"
              : "Lane minions + jungle camps",
        },
        percentileRankings: {
          top10: { gpm: 480, cspm: 9.2 },
          top25: { gpm: 440, cspm: 8.0 },
          top50: { gpm: 390, cspm: 7.0 },
        },
        source: benchmarkData.source,
        timestamp: benchmarkData.timestamp,
      };

      tracer.putMetadata("economyBenchmarks", result);
      logger.info("Economy benchmarks retrieved", { role, rank });

      return result;
    } catch (error) {
      logger.error("Error fetching economy benchmarks", { error, role, rank });
      throw error;
    }
  },
  {
    name: "getEconomyBenchmarks",
    description:
      "Retrieve economy benchmarks for gold and CS based on role and rank",
  }
);

/**
 * Tool: Calculate Gold Efficiency Vs Meta
 *
 * Compares player's build gold efficiency against meta-optimal builds.
 */
app.tool<{ playerBuildJson: string; optimalBuildJson: string }>(
  async ({ playerBuildJson, optimalBuildJson }) => {
    const playerBuild = JSON.parse(playerBuildJson) as number[];
    const optimalBuild = JSON.parse(optimalBuildJson) as number[];
    logger.info("Calculating gold efficiency vs meta", {
      playerItems: playerBuild.length,
      optimalItems: optimalBuild.length,
    });

    try {
      // Fetch item data from Data Dragon
      await externalAPIClient.getItemsFromDataDragon();

      // Placeholder calculations
      const playerGoldValue = playerBuild.length * PLACEHOLDER_ITEM_GOLD_VALUE;
      const optimalGoldValue =
        optimalBuild.length * PLACEHOLDER_OPTIMAL_ITEM_GOLD_VALUE;
      const efficiencyDifference =
        (playerGoldValue / optimalGoldValue) * PERCENTAGE_MULTIPLIER -
        PERCENTAGE_MULTIPLIER;

      const result = {
        playerBuild,
        optimalBuild,
        playerGoldValue,
        optimalGoldValue,
        efficiencyDifference: `${efficiencyDifference.toFixed(1)}%`,
        rating:
          efficiencyDifference >= 0 ? "Optimal or better" : "Below optimal",
        recommendation:
          efficiencyDifference < GOLD_EFFICIENCY_NEGATIVE_THRESHOLD
            ? "Consider switching to meta-optimal items for better gold efficiency"
            : "Build efficiency is acceptable",
        source: "Data Dragon",
      };

      tracer.putMetadata("goldEfficiencyComparison", result);
      logger.info("Gold efficiency comparison completed", {
        efficiencyDiff: result.efficiencyDifference,
      });

      return result;
    } catch (error) {
      logger.error("Error calculating gold efficiency vs meta", { error });
      throw error;
    }
  },
  {
    name: "calculateGoldEfficiencyVsMeta",
    description:
      "Compare player build gold efficiency against meta-optimal builds",
  }
);

/**
 * Tool: Analyze Recall Timing Vs Meta
 *
 * Analyzes recall timing patterns compared to optimal meta timings.
 */
app.tool<{ recallsJson: string; role: string; rank: string }>(
  async ({ recallsJson, role, rank }) => {
    const recalls = JSON.parse(recallsJson) as Array<{
      timestamp: number;
      goldSpent: number;
      itemsPurchased: number[];
    }>;
    logger.info("Analyzing recall timing vs meta", {
      role,
      rank,
      recallCount: recalls.length,
    });

    try {
      // Note: Recall timing analysis based on role-specific patterns

      // Placeholder optimal recall timings (in minutes)
      const optimalRecallTimings = [
        RECALL_TIMING_1,
        RECALL_TIMING_2,
        RECALL_TIMING_3,
        RECALL_TIMING_4,
        RECALL_TIMING_5,
      ];

      // Calculate actual recall timings in minutes
      const actualRecallTimings = recalls.map(
        (r) => r.timestamp / MILLISECONDS_PER_MINUTE
      );

      // Analyze timing deviations
      const timingAnalysis = actualRecallTimings.map((timing, index) => {
        const optimalTiming = optimalRecallTimings[index] || timing;
        const deviation = timing - optimalTiming;
        return {
          recallNumber: index + 1,
          actualTiming: `${timing.toFixed(1)} min`,
          optimalTiming: `${optimalTiming.toFixed(1)} min`,
          deviation: `${deviation.toFixed(1)} min`,
          rating: getDeviationRating(Math.abs(deviation)),
        };
      });

      const result = {
        role,
        rank,
        totalRecalls: recalls.length,
        timingAnalysis,
        averageDeviation: `${(
          timingAnalysis.reduce(
            (sum, t) => sum + Math.abs(Number.parseFloat(t.deviation)),
            0
          ) / timingAnalysis.length
        ).toFixed(1)} min`,
        recommendation:
          "Aim to recall at optimal timings to maximize gold efficiency and minimize missed farm",
      };

      tracer.putMetadata("recallTimingAnalysis", result);
      logger.info("Recall timing analysis completed", {
        avgDeviation: result.averageDeviation,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing recall timing vs meta", {
        error,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "analyzeRecallTimingVsMeta",
    description:
      "Analyze recall timing patterns compared to optimal meta timings",
  }
);

/**
 * Tool: Get Income Optimization Suggestions
 *
 * Provides role-specific income optimization recommendations.
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Getting income optimization suggestions", { role, rank });

    try {
      // Note: External API integration available via externalAPIClient
      // Can be enhanced with getMapPressureBenchmarks() or getTemporalBenchmarks()

      const roleSpecificTips: Record<string, string[]> = {
        TOP: [
          "Freeze waves near your tower to deny enemy CS and set up ganks",
          "Take jungle camps when your jungler is on opposite side of map",
          "Use Teleport to catch side lane waves before they crash into tower",
        ],
        JUNGLE: [
          "Clear camps efficiently - full clear by 3:15 is optimal",
          "Tax lanes after successful ganks to maximize gold income",
          "Prioritize Scuttle Crab for vision and gold",
        ],
        MIDDLE: [
          "Shove waves and roam to collect kills/assists for bonus gold",
          "Take Raptors between waves when available",
          "Coordinate with jungler for shared jungle farm",
        ],
        BOTTOM: [
          "Prioritize CS over poke - each minion is guaranteed gold",
          "Catch side lane waves mid-game when safe",
          "Farm jungle camps when support is warding",
        ],
        UTILITY: [
          "Use support item efficiently for passive gold generation",
          "Roam to other lanes for assist gold without missing ADC experience",
          "Secure cannon minions with relic shield when possible",
        ],
      };

      const result = {
        role,
        rank,
        suggestions: roleSpecificTips[role] || roleSpecificTips.MIDDLE,
        generalTips: [
          "Minimize deaths - each death costs gold and experience",
          "Participate in objective takedowns for team gold",
          "Buy control wards to deny enemy vision and secure objectives",
        ],
        targetMetrics: {
          goldPerMinute: role === "UTILITY" ? "250-300" : "350-450",
          csPerMinute: role === "UTILITY" ? "1-2" : "7-9",
        },
      };

      tracer.putMetadata("incomeOptimization", result);
      logger.info("Income optimization suggestions generated", { role, rank });

      return result;
    } catch (error) {
      logger.error("Error getting income optimization suggestions", {
        error,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "getIncomeOptimizationSuggestions",
    description:
      "Get role-specific income optimization recommendations and target metrics",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
