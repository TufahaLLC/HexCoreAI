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

const logger = new Logger({ serviceName: "hexcore-economy-tools" });
const tracer = new Tracer({ serviceName: "hexcore-economy-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

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
      const goldEfficiency = totalGold > 0 ? (goldSpent / totalGold) * 100 : 0;
      const unspentGold = totalGold - goldSpent;

      // Determine gold generation rating
      let rating: "Excellent" | "Good" | "Average" | "Needs Improvement";

      if (goldPerMinute >= 400) {
        rating = "Excellent";
      } else if (goldPerMinute >= 350) {
        rating = "Good";
      } else if (goldPerMinute >= 300) {
        rating = "Average";
      } else {
        rating = "Needs Improvement";
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (goldPerMinute < 300) {
        recommendations.push(
          "Low gold income. Focus on farming minions consistently and securing neutral objectives"
        );
      }

      if (goldEfficiency < 85) {
        recommendations.push(
          "Significant gold left unspent. Ensure you're spending gold efficiently on items between fights"
        );
      }

      if (unspentGold > 2000) {
        recommendations.push(
          `${unspentGold.toFixed(0)} gold left unspent. Make sure to spend gold after recalls to maximize power spikes`
        );
      }

      if (goldPerMinute >= 400) {
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
        TOP: { excellent: 8.0, good: 7.0, average: 6.0 },
        JUNGLE: { excellent: 6.5, good: 5.5, average: 4.5 },
        MIDDLE: { excellent: 8.5, good: 7.5, average: 6.5 },
        BOTTOM: { excellent: 9.0, good: 8.0, average: 7.0 },
        UTILITY: { excellent: 3.0, good: 2.0, average: 1.0 },
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
      const maxPossibleCs = gameDurationMinutes * 10.5; // ~10.5 CS per minute is theoretical max
      const farmingEfficiency = (totalCs / maxPossibleCs) * 100;

      // Generate recommendations
      const recommendations: string[] = [];

      if (csPerMinute < roleBenchmark.average) {
        recommendations.push(
          `CS/min is below average for ${role} role. Focus on last-hitting minions and farming between objectives`
        );
      }

      if (farmingEfficiency < 60 && role !== "UTILITY") {
        recommendations.push(
          "Missing significant farm opportunities. Prioritize wave management and jungle camp clear timing"
        );
      }

      if (csPerMinute >= roleBenchmark.excellent) {
        recommendations.push(
          "Exceptional farming efficiency. Your CS numbers are among the best for your role"
        );
      }

      if (role === "UTILITY" && csPerMinute > 4.0) {
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
 * TODO: Integrate with U.GG/LoLalytics API once implemented in Task 11.5
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Fetching economy benchmarks", { role, rank });

    try {
      // TODO: Replace with actual external API call
      // const benchmarks = await externalAPIClient.getEconomyBenchmarksFromUGG(role, rank);

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
        note: "TODO: Integration with U.GG/LoLalytics API pending (Task 11.5)",
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
 * TODO: Integrate with Data Dragon and U.GG API once implemented in Task 11.5
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
      // TODO: Replace with actual Data Dragon API call for item stats
      // const itemStats = await externalAPIClient.getItemsFromDataDragon([...playerBuild, ...optimalBuild]);

      // Placeholder calculations
      const playerGoldValue = playerBuild.length * 3000; // Placeholder
      const optimalGoldValue = optimalBuild.length * 3200; // Placeholder
      const efficiencyDifference =
        (playerGoldValue / optimalGoldValue) * 100 - 100;

      const result = {
        playerBuild,
        optimalBuild,
        playerGoldValue,
        optimalGoldValue,
        efficiencyDifference: `${efficiencyDifference.toFixed(1)}%`,
        rating:
          efficiencyDifference >= 0 ? "Optimal or better" : "Below optimal",
        recommendation:
          efficiencyDifference < -10
            ? "Consider switching to meta-optimal items for better gold efficiency"
            : "Build efficiency is acceptable",
        note: "TODO: Integration with Data Dragon API pending (Task 11.5)",
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
 * TODO: Integrate with LoLalytics API once implemented in Task 11.5
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
      // TODO: Replace with actual external API call
      // const metaRecallData = await externalAPIClient.getRecallTimingsFromLoLalytics(role, rank);

      // Placeholder optimal recall timings (in minutes)
      const optimalRecallTimings = [4, 8, 12, 16, 20];

      // Calculate actual recall timings in minutes
      const actualRecallTimings = recalls.map((r) => r.timestamp / 60_000);

      // Analyze timing deviations
      const timingAnalysis = actualRecallTimings.map((timing, index) => {
        const optimalTiming = optimalRecallTimings[index] || timing;
        const deviation = timing - optimalTiming;
        return {
          recallNumber: index + 1,
          actualTiming: `${timing.toFixed(1)} min`,
          optimalTiming: `${optimalTiming.toFixed(1)} min`,
          deviation: `${deviation.toFixed(1)} min`,
          rating:
            Math.abs(deviation) < 1
              ? "Good"
              : Math.abs(deviation) < 2
                ? "Acceptable"
                : "Poor",
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
        note: "TODO: Integration with LoLalytics API pending (Task 11.5)",
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
 * TODO: Integrate with U.GG/Mobalytics API once implemented in Task 11.5
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Getting income optimization suggestions", { role, rank });

    try {
      // TODO: Replace with actual external API call
      // const optimizationData = await externalAPIClient.getIncomeOptimizationFromMobalytics(role, rank);

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
        note: "TODO: Integration with U.GG/Mobalytics API pending (Task 11.5)",
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
