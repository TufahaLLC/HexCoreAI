/**
 * Champion Analysis Action Group Tools
 *
 * Provides tools for Bedrock Champion Analysis Agent to retrieve and analyze
 * champion-specific performance, mastery, and pool optimization.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";

const logger = new Logger({ serviceName: "hexcore-champion-tools" });
const tracer = new Tracer({ serviceName: "hexcore-champion-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

/**
 * Tool: Get Champion Performance
 *
 * Retrieves champion-specific performance data including win rate and statistics.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Fetching champion performance data", { matchId, puuid });

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

      const championData = result.Item.championMeta;

      tracer.putAnnotation("matchId", matchId);
      tracer.putAnnotation("champion", championData?.champion || "Unknown");
      tracer.putMetadata("championData", championData);

      logger.info("Champion data retrieved successfully", {
        matchId,
        champion: championData?.champion || "Unknown",
      });

      return {
        matchId,
        puuid,
        champion: championData?.champion || "Unknown",
        role: championData?.role || "Unknown",
        tier: championData?.tier || "Unknown",
        winRate: championData?.winRate || 0,
      };
    } catch (error) {
      logger.error("Error fetching champion performance", {
        error,
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "getChampionPerformance",
    description: "Retrieve champion-specific performance statistics",
  }
);

/**
 * Tool: Analyze Champion Mastery
 *
 * Analyzes champion mastery level and performance consistency.
 */
app.tool<{
  champion: string;
  gamesPlayed: number;
  winRate: number;
  avgKda: number;
}>(
  async ({ champion, gamesPlayed, winRate, avgKda }) => {
    logger.info("Analyzing champion mastery", {
      champion,
      gamesPlayed,
      winRate,
    });

    try {
      // Determine mastery level based on games played
      let masteryLevel: "Beginner" | "Intermediate" | "Advanced" | "Master";

      if (gamesPlayed >= 100) {
        masteryLevel = "Master";
      } else if (gamesPlayed >= 50) {
        masteryLevel = "Advanced";
      } else if (gamesPlayed >= 20) {
        masteryLevel = "Intermediate";
      } else {
        masteryLevel = "Beginner";
      }

      // Determine performance consistency
      let performanceConsistency:
        | "Highly Consistent"
        | "Consistent"
        | "Inconsistent";

      if (winRate >= 55 && avgKda >= 3.0) {
        performanceConsistency = "Highly Consistent";
      } else if (winRate >= 48 && avgKda >= 2.0) {
        performanceConsistency = "Consistent";
      } else {
        performanceConsistency = "Inconsistent";
      }

      // Generate insights
      const insights: string[] = [];

      if (gamesPlayed < 20) {
        insights.push(
          `Limited experience with ${champion}. Continue practicing to build mastery and understanding of power spikes`
        );
      }

      if (winRate >= 55) {
        insights.push(
          `Strong win rate on ${champion} (${winRate.toFixed(1)}%). This champion is a good fit for your playstyle`
        );
      } else if (winRate < 45) {
        insights.push(
          `Below average win rate on ${champion}. Consider reviewing VODs or seeking coaching for improvement`
        );
      }

      if (avgKda >= 3.5) {
        insights.push(
          "Excellent KDA performance showing strong mechanical execution"
        );
      } else if (avgKda < 2.0) {
        insights.push(
          "Low KDA suggests difficulty with champion mechanics or decision-making"
        );
      }

      if (gamesPlayed >= 50 && winRate < 48) {
        insights.push(
          `Despite significant experience (${gamesPlayed} games), win rate remains below 50%. Consider focusing on other champions or specific skill areas`
        );
      }

      if (insights.length === 0) {
        insights.push(
          `Solid performance on ${champion}. Continue refining mechanics and game knowledge`
        );
      }

      const result = {
        champion,
        masteryMetrics: {
          masteryLevel,
          gamesPlayed,
          winRate: winRate.toFixed(1) + "%",
          avgKda: avgKda.toFixed(2),
          performanceConsistency,
        },
        insights,
      };

      tracer.putMetadata("championMastery", result);
      logger.info("Champion mastery analysis completed", {
        champion,
        masteryLevel,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing champion mastery", { error });
      throw error;
    }
  },
  {
    name: "analyzeChampionMastery",
    description: "Analyze champion mastery level and performance consistency",
  }
);

/**
 * Tool: Compare To Champion Benchmark
 *
 * Compares player performance to global champion benchmarks.
 */
app.tool<{
  champion: string;
  playerStatsJson: string;
}>(
  async ({ champion, playerStatsJson }) => {
    const playerStats = JSON.parse(playerStatsJson) as {
      winRate: number;
      avgKda: number;
      csPerMinute: number;
      visionScore: number;
    };
    logger.info("Comparing to champion benchmarks", {
      champion,
      winRate: playerStats.winRate,
    });

    try {
      // Global benchmark data (these would ideally come from a database)
      const globalBenchmarks = {
        winRate: 50.0,
        avgKda: 2.5,
        csPerMinute: 7.0,
        visionScore: 30.0,
      };

      // Calculate performance vs benchmark
      const comparison = {
        winRate: {
          player: playerStats.winRate.toFixed(1) + "%",
          benchmark: globalBenchmarks.winRate.toFixed(1) + "%",
          difference:
            (playerStats.winRate - globalBenchmarks.winRate).toFixed(1) + "%",
          rating:
            playerStats.winRate >= globalBenchmarks.winRate
              ? "Above Average"
              : "Below Average",
        },
        kda: {
          player: playerStats.avgKda.toFixed(2),
          benchmark: globalBenchmarks.avgKda.toFixed(2),
          difference: (playerStats.avgKda - globalBenchmarks.avgKda).toFixed(2),
          rating:
            playerStats.avgKda >= globalBenchmarks.avgKda
              ? "Above Average"
              : "Below Average",
        },
        csPerMinute: {
          player: playerStats.csPerMinute.toFixed(1),
          benchmark: globalBenchmarks.csPerMinute.toFixed(1),
          difference: (
            playerStats.csPerMinute - globalBenchmarks.csPerMinute
          ).toFixed(1),
          rating:
            playerStats.csPerMinute >= globalBenchmarks.csPerMinute
              ? "Above Average"
              : "Below Average",
        },
        visionScore: {
          player: playerStats.visionScore.toFixed(1),
          benchmark: globalBenchmarks.visionScore.toFixed(1),
          difference: (
            playerStats.visionScore - globalBenchmarks.visionScore
          ).toFixed(1),
          rating:
            playerStats.visionScore >= globalBenchmarks.visionScore
              ? "Above Average"
              : "Below Average",
        },
      };

      // Generate overall assessment
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (comparison.winRate.rating === "Above Average") {
        strengths.push(
          `Win rate (${comparison.winRate.player}) exceeds global average`
        );
      } else {
        weaknesses.push(
          `Win rate (${comparison.winRate.player}) below global average`
        );
      }

      if (comparison.kda.rating === "Above Average") {
        strengths.push(
          `KDA (${comparison.kda.player}) above global benchmark`
        );
      } else {
        weaknesses.push(
          `KDA (${comparison.kda.player}) needs improvement vs benchmark`
        );
      }

      if (comparison.csPerMinute.rating === "Above Average") {
        strengths.push(
          `CS/min (${comparison.csPerMinute.player}) exceeds benchmark`
        );
      } else {
        weaknesses.push(
          `CS/min (${comparison.csPerMinute.player}) below average`
        );
      }

      const result = {
        champion,
        benchmarkComparison: comparison,
        strengths,
        weaknesses,
      };

      tracer.putMetadata("benchmarkComparison", result);
      logger.info("Benchmark comparison completed", {
        champion,
        overallRating: strengths.length >= weaknesses.length ? "Above" : "Below",
      });

      return result;
    } catch (error) {
      logger.error("Error comparing to benchmarks", { error });
      throw error;
    }
  },
  {
    name: "compareToChampionBenchmark",
    description: "Compare player performance to global champion benchmarks",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
