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
          Key: { dataKey: `${matchId}#${puuid}` },
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

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("economyData", economyData);

      logger.info("Economy data retrieved successfully", {
        matchId,
        totalGold: economyData?.totalGold || 0,
      });

      return {
        matchId,
        puuid,
        totalGold: economyData?.totalGold || 0,
        csPerMinute: economyData?.csPerMinute || 0,
        goldEfficiency: economyData?.goldEfficiency || 0,
      };
    } catch (error) {
      logger.error("Error fetching economy data", { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: "getMatchEconomyData",
    description: "Retrieve economic statistics for a specific match",
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
          goldEfficiency: goldEfficiency.toFixed(1) + "%",
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
  totalCs: number;
  gameDuration: number;
  role: string;
}>(
  async ({ csPerMinute, totalCs, gameDuration, role }) => {
    logger.info("Evaluating resource management", {
      csPerMinute,
      totalCs,
      role,
    });

    try {
      const gameDurationMinutes = gameDuration / 60;

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
          farmingEfficiency: farmingEfficiency.toFixed(1) + "%",
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
    name: "evaluateResourceManagement",
    description: "Evaluate CS efficiency and farming patterns",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
