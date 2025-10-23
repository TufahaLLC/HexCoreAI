/**
 * Competitive Analysis Action Group Tools
 *
 * Provides tools for Bedrock Competitive Analysis Agent to retrieve and analyze
 * ranked performance, climb efficiency, and skill development.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";

const logger = new Logger({ serviceName: "hexcore-competitive-tools" });
const tracer = new Tracer({ serviceName: "hexcore-competitive-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

/**
 * Tool: Get Rank Progression Data
 *
 * Retrieves ranked statistics including current rank, LP, and recent performance.
 */
app.tool<{ puuid: string; season: string }>(
  async ({ puuid, season }) => {
    logger.info("Fetching rank progression data", { puuid, season });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `rank#${puuid}#${season}` },
        })
      );

      if (!result.Item) {
        logger.warn("Rank data not found", { puuid, season });
        return {
          error: "Rank data not found",
          puuid,
          season,
        };
      }

      const rankData = result.Item;

      tracer.putAnnotation("puuid", puuid);
      tracer.putAnnotation("rank", rankData.currentRank || "Unknown");
      tracer.putMetadata("rankData", rankData);

      logger.info("Rank data retrieved successfully", {
        puuid,
        rank: rankData.currentRank || "Unknown",
      });

      return {
        puuid,
        season,
        currentRank: rankData.currentRank || "Unranked",
        tier: rankData.tier || "Unranked",
        division: rankData.division || "N/A",
        leaguePoints: rankData.leaguePoints || 0,
        wins: rankData.wins || 0,
        losses: rankData.losses || 0,
        winRate:
          rankData.wins && rankData.losses
            ? (
                (rankData.wins / (rankData.wins + rankData.losses)) *
                100
              ).toFixed(1)
            : "0",
      };
    } catch (error) {
      logger.error("Error fetching rank progression data", {
        error,
        puuid,
        season,
      });
      throw error;
    }
  },
  {
    name: "getRankProgressionData",
    description: "Retrieve ranked statistics and current rank information",
  }
);

/**
 * Tool: Analyze Rank Trends
 *
 * Analyzes climb efficiency, win/loss trends, and LP gains.
 */
app.tool<{
  currentRank: string;
  wins: number;
  losses: number;
  recentMatchesJson: string;
}>(
  async ({ currentRank, wins, losses, recentMatchesJson }) => {
    const recentMatches = JSON.parse(
      recentMatchesJson
    ) as Array<{ result: "win" | "loss"; lpChange: number }>;
    logger.info("Analyzing rank trends", {
      currentRank,
      totalGames: wins + losses,
    });

    try {
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      // Analyze recent form (last 10 games)
      const recentWins = recentMatches.filter((m) => m.result === "win").length;
      const recentWinRate =
        recentMatches.length > 0
          ? (recentWins / recentMatches.length) * 100
          : 0;

      // Calculate LP trend
      const totalLpChange = recentMatches.reduce(
        (sum, match) => sum + match.lpChange,
        0
      );
      const avgLpPerGame =
        recentMatches.length > 0 ? totalLpChange / recentMatches.length : 0;

      // Determine climb trend
      let climbTrend: "Climbing" | "Stable" | "Declining";

      if (avgLpPerGame > 2) {
        climbTrend = "Climbing";
      } else if (avgLpPerGame >= -2) {
        climbTrend = "Stable";
      } else {
        climbTrend = "Declining";
      }

      // Determine MMR health
      let mmrHealth: "Healthy" | "Normal" | "Damaged";

      if (avgLpPerGame > 15) {
        mmrHealth = "Healthy";
      } else if (avgLpPerGame > -15) {
        mmrHealth = "Normal";
      } else {
        mmrHealth = "Damaged";
      }

      // Generate insights
      const insights: string[] = [];

      if (winRate >= 55) {
        insights.push(
          `Strong overall win rate (${winRate.toFixed(1)}%). Continue current approach for consistent climbing`
        );
      } else if (winRate < 45) {
        insights.push(
          `Win rate (${winRate.toFixed(1)}%) below 50%. Focus on fundamentals and reduce mistakes to improve consistency`
        );
      }

      if (recentWinRate >= 60) {
        insights.push(
          `Recent form is excellent (${recentWinRate.toFixed(1)}% over last ${recentMatches.length} games). Momentum is in your favor`
        );
      } else if (recentWinRate < 40) {
        insights.push(
          `Recent performance struggling (${recentWinRate.toFixed(1)}% win rate). Consider taking a break or reviewing recent losses`
        );
      }

      if (mmrHealth === "Healthy") {
        insights.push(
          "MMR is healthy with positive LP gains. Your skill level is above your current rank"
        );
      } else if (mmrHealth === "Damaged") {
        insights.push(
          "MMR appears damaged with low LP gains. Focus on improving win rate to repair MMR over time"
        );
      }

      if (climbTrend === "Declining" && recentWinRate < 45) {
        insights.push(
          "Downward trend detected. Take a break, review fundamentals, or consider adjusting champion pool"
        );
      }

      if (insights.length === 0) {
        insights.push(
          "Performance is consistent. Continue maintaining current strategies"
        );
      }

      const result = {
        rankMetrics: {
          currentRank,
          totalGames,
          wins,
          losses,
          overallWinRate: winRate.toFixed(1) + "%",
          recentWinRate: recentWinRate.toFixed(1) + "%",
          avgLpPerGame: avgLpPerGame.toFixed(1),
        },
        trends: {
          climbTrend,
          mmrHealth,
          netLpChange: totalLpChange,
        },
        insights,
      };

      tracer.putMetadata("rankAnalysis", result);
      logger.info("Rank trend analysis completed", {
        climbTrend,
        mmrHealth,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing rank trends", { error });
      throw error;
    }
  },
  {
    name: "analyzeRankTrends",
    description: "Analyze climb efficiency and win/loss trends",
  }
);

/**
 * Tool: Generate Climbing Recommendations
 *
 * Generates rank-specific strategies and improvement recommendations.
 */
app.tool<{
  currentRank: string;
  winRate: number;
  mainRole: string;
  championPool: string[];
}>(
  async ({ currentRank, winRate, mainRole, championPool }) => {
    logger.info("Generating climbing recommendations", {
      currentRank,
      winRate,
      mainRole,
    });

    try {
      const recommendations: string[] = [];

      // Rank-specific recommendations
      const rankTier = currentRank.split(" ")[0]; // Extract tier (e.g., "Gold" from "Gold 2")

      if (rankTier === "Iron" || rankTier === "Bronze") {
        recommendations.push(
          "Focus on fundamentals: CS, map awareness, and objective control. Master 2-3 champions thoroughly"
        );
        recommendations.push(
          "Prioritize farming and avoid unnecessary deaths. Each death gives enemies gold and experience advantages"
        );
      } else if (rankTier === "Silver" || rankTier === "Gold") {
        recommendations.push(
          "Improve wave management and trading patterns. Learn when to freeze, slow push, and crash waves"
        );
        recommendations.push(
          "Enhance map awareness and roaming timings. Track enemy jungler and respond to jungle invades"
        );
      } else if (rankTier === "Platinum" || rankTier === "Diamond") {
        recommendations.push(
          "Refine macro decision-making. Focus on objective priority, rotation timing, and team coordination"
        );
        recommendations.push(
          "Master champion-specific mechanics and matchup knowledge. Small advantages matter significantly"
        );
      } else if (rankTier === "Master" || rankTier === "Grandmaster" || rankTier === "Challenger") {
        recommendations.push(
          "Perfect wave manipulation, back timings, and resource trading. Every decision should have strategic purpose"
        );
        recommendations.push(
          "Study high-level gameplay and meta trends. Communication and team synergy become crucial"
        );
      }

      // Champion pool recommendations
      if (championPool.length > 5) {
        recommendations.push(
          `Large champion pool (${championPool.length} champions). Consider narrowing to 3-4 champions for better mastery and consistency`
        );
      } else if (championPool.length <= 2) {
        recommendations.push(
          "Limited champion pool. Add 1-2 comfort picks to handle difficult matchups and team compositions"
        );
      }

      // Win rate specific advice
      if (winRate < 48) {
        recommendations.push(
          "Win rate below 50%. Focus on reducing mistakes rather than making plays. Consistency beats flashy plays"
        );
      } else if (winRate >= 55) {
        recommendations.push(
          `Strong win rate (${winRate.toFixed(1)}%). You're ready to climb - play more games to reach your potential rank`
        );
      }

      // Role-specific advice
      if (mainRole === "JUNGLE") {
        recommendations.push(
          "As jungler: Track enemy jungler pathing, prioritize counter-ganking, and maintain vision control around objectives"
        );
      } else if (mainRole === "UTILITY") {
        recommendations.push(
          "As support: Maximize roaming efficiency, maintain vision control, and protect carries in teamfights"
        );
      } else {
        recommendations.push(
          `As ${mainRole}: Balance farming with map presence. Missing farm is acceptable when securing objectives or preventing enemy advantages`
        );
      }

      const result = {
        currentRank,
        mainRole,
        championPoolSize: championPool.length,
        recommendations,
      };

      tracer.putMetadata("climbingRecommendations", result);
      logger.info("Climbing recommendations generated", {
        recommendationCount: recommendations.length,
      });

      return result;
    } catch (error) {
      logger.error("Error generating climbing recommendations", { error });
      throw error;
    }
  },
  {
    name: "generateClimbingRecommendations",
    description: "Generate rank-specific strategies and improvement advice",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
