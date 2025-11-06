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
      // Try to get rank data from rankInfo in match data (latest match)
      // This is a simplified approach - in production you'd query for the latest match
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `rank#${puuid}#${season}` },
        })
      );

      if (!result.Item?.rankInfo) {
        logger.warn("Rank data not found", { puuid, season });

        // Return default unranked data instead of failing
        return {
          puuid,
          season,
          currentRank: "Unranked",
          tier: "UNRANKED",
          division: "",
          leaguePoints: 0,
          wins: 0,
          losses: 0,
          winRate: "0",
          note: "Rank data not available for this player",
        };
      }

      const rankData = result.Item.rankInfo || result.Item;

      tracer.putAnnotation("puuid", puuid);
      tracer.putAnnotation("rank", rankData.tier || "Unknown");
      tracer.putMetadata("rankData", rankData);

      logger.info("Rank data retrieved successfully", {
        puuid,
        tier: rankData.tier || "Unknown",
      });

      return {
        puuid,
        season,
        currentRank:
          `${rankData.tier || "Unranked"} ${rankData.rank || ""}`.trim(),
        tier: rankData.tier || "UNRANKED",
        division: rankData.rank || "",
        leaguePoints: rankData.leaguePoints || 0,
        wins: rankData.wins || 0,
        losses: rankData.losses || 0,
        winRate:
          rankData.wins && rankData.losses
            ? (
                (rankData.wins / (rankData.wins + rankData.losses)) *
                100
              ).toFixed(1)
            : rankData.winRate
              ? (rankData.winRate * 100).toFixed(1)
              : "0",
      };
    } catch (error) {
      logger.error("Error fetching rank progression data", {
        error,
        puuid,
        season,
      });

      // Return default instead of throwing
      return {
        puuid,
        season,
        currentRank: "Unranked",
        tier: "UNRANKED",
        division: "",
        leaguePoints: 0,
        wins: 0,
        losses: 0,
        winRate: "0",
        note: "Error retrieving rank data",
      };
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
    const recentMatches = JSON.parse(recentMatchesJson) as Array<{
      result: "win" | "loss";
      lpChange: number;
    }>;
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
          overallWinRate: `${winRate.toFixed(1)}%`,
          recentWinRate: `${recentWinRate.toFixed(1)}%`,
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
      } else if (
        rankTier === "Master" ||
        rankTier === "Grandmaster" ||
        rankTier === "Challenger"
      ) {
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

/**
 * Tool: Get Rank Climb Benchmarks
 *
 * Retrieves rank-specific climb benchmarks and performance targets.
 * TODO: Integrate with U.GG/OP.GG API once implemented in Task 11.5
 */
app.tool<{ rank: string }>(
  async ({ rank }) => {
    logger.info("Fetching rank climb benchmarks", { rank });

    try {
      // TODO: Replace with actual external API call
      // const benchmarks = await externalAPIClient.getRankClimbBenchmarksFromUGG(rank);

      const result = {
        rank,
        targetWinRate:
          rank.includes("Iron") || rank.includes("Bronze")
            ? "52%"
            : rank.includes("Silver") || rank.includes("Gold")
              ? "53%"
              : "54%",
        averageGamesToClimb: rank.includes("Iron")
          ? 40
          : rank.includes("Bronze")
            ? 50
            : rank.includes("Silver")
              ? 60
              : 70,
        keyFocusAreas: [
          rank.includes("Iron") || rank.includes("Bronze")
            ? "CS and farming fundamentals"
            : "Wave management and trading",
          rank.includes("Iron") || rank.includes("Bronze")
            ? "Reducing deaths"
            : "Objective priority",
          rank.includes("Iron") || rank.includes("Bronze")
            ? "Basic map awareness"
            : "Advanced macro decisions",
        ],
        lpGainsTarget: "+18 to +22 LP per win indicates healthy MMR",
        note: "TODO: Integration with U.GG/OP.GG API pending (Task 11.5)",
      };

      tracer.putMetadata("rankClimbBenchmarks", result);
      logger.info("Rank climb benchmarks retrieved", { rank });

      return result;
    } catch (error) {
      logger.error("Error fetching rank climb benchmarks", { error, rank });
      throw error;
    }
  },
  {
    name: "getRankClimbBenchmarks",
    description:
      "Retrieve rank-specific climb benchmarks and performance targets",
  }
);

/**
 * Tool: Get Meta Champions For Rank
 *
 * Retrieves meta champion recommendations optimized for specific rank and role.
 * TODO: Integrate with U.GG API once implemented in Task 11.5
 */
app.tool<{ rank: string; role: string }>(
  async ({ rank, role }) => {
    logger.info("Fetching meta champions for rank", { rank, role });

    try {
      // TODO: Replace with actual external API call
      // const metaChampions = await externalAPIClient.getMetaChampionsFromUGG(rank, role);

      const result = {
        rank,
        role,
        topMetaChampions: [
          {
            champion: "Jinx",
            winRate: "52.8%",
            pickRate: "18.3%",
            difficulty: "Medium",
            recommendation: "S-tier for climbing",
          },
          {
            champion: "Caitlyn",
            winRate: "51.9%",
            pickRate: "22.4%",
            difficulty: "Medium",
            recommendation: "Consistent and safe",
          },
          {
            champion: "Jhin",
            winRate: "51.2%",
            pickRate: "25.1%",
            difficulty: "Medium",
            recommendation: "High impact potential",
          },
        ],
        easyToLearnChampions: [
          {
            champion: "Ashe",
            winRate: "50.5%",
            difficulty: "Easy",
            reason: "Simple kit, strong utility",
          },
          {
            champion: "Miss Fortune",
            winRate: "50.8%",
            difficulty: "Easy",
            reason: "Strong laning, teamfight impact",
          },
        ],
        note: "TODO: Integration with U.GG API pending (Task 11.5)",
      };

      tracer.putMetadata("metaChampionsForRank", result);
      logger.info("Meta champions for rank retrieved", { rank, role });

      return result;
    } catch (error) {
      logger.error("Error fetching meta champions for rank", {
        error,
        rank,
        role,
      });
      throw error;
    }
  },
  {
    name: "getMetaChampionsForRank",
    description:
      "Retrieve meta champion recommendations optimized for specific rank and role",
  }
);

/**
 * Tool: Analyze Performance Consistency
 *
 * Analyzes performance consistency across match history.
 * TODO: Integrate with LoLalytics API once implemented in Task 11.5
 */
app.tool<{ historyJson: string }>(
  async ({ historyJson }) => {
    const history = JSON.parse(historyJson) as Array<{
      kda: number;
      cs: number;
      damage: number;
      result: "win" | "loss";
    }>;
    logger.info("Analyzing performance consistency", {
      matchCount: history.length,
    });

    try {
      // TODO: Replace with actual external API call for benchmarks
      // const consistencyBenchmarks = await externalAPIClient.getConsistencyBenchmarksFromLoLalytics();

      // Calculate standard deviations
      const avgKda =
        history.reduce((sum, m) => sum + m.kda, 0) / history.length;
      const kdaVariance =
        history.reduce((sum, m) => sum + (m.kda - avgKda) ** 2, 0) /
        history.length;
      const kdaStdDev = Math.sqrt(kdaVariance);

      const avgCs = history.reduce((sum, m) => sum + m.cs, 0) / history.length;
      const csVariance =
        history.reduce((sum, m) => sum + (m.cs - avgCs) ** 2, 0) /
        history.length;
      const csStdDev = Math.sqrt(csVariance);

      let consistencyRating: string;
      if (kdaStdDev < 1.0 && csStdDev < 30) {
        consistencyRating = "Highly Consistent";
      } else if (kdaStdDev < 1.5 && csStdDev < 50) {
        consistencyRating = "Consistent";
      } else {
        consistencyRating = "Inconsistent";
      }

      const result = {
        totalMatches: history.length,
        averageKda: avgKda.toFixed(2),
        kdaStandardDeviation: kdaStdDev.toFixed(2),
        averageCs: avgCs.toFixed(0),
        csStandardDeviation: csStdDev.toFixed(0),
        consistencyRating,
        insights: [
          consistencyRating === "Inconsistent"
            ? "High performance variance detected. Focus on maintaining consistent fundamentals across all games"
            : "Good performance consistency. Continue maintaining stable gameplay patterns",
          kdaStdDev > 1.5
            ? "KDA varies significantly - work on reducing deaths and maintaining safer playstyle"
            : "KDA is stable across matches",
          csStdDev > 50
            ? "CS varies significantly - focus on consistent farming patterns"
            : "CS is consistent across matches",
        ],
        note: "TODO: Integration with LoLalytics API pending (Task 11.5)",
      };

      tracer.putMetadata("performanceConsistency", result);
      logger.info("Performance consistency analyzed", { consistencyRating });

      return result;
    } catch (error) {
      logger.error("Error analyzing performance consistency", { error });
      throw error;
    }
  },
  {
    name: "analyzePerformanceConsistency",
    description:
      "Analyze performance consistency and variance across match history",
  }
);

/**
 * Tool: Get Promotion Readiness Score
 *
 * Calculates readiness score for rank promotion based on recent performance.
 * TODO: Integrate with U.GG/Mobalytics API once implemented in Task 11.5
 */
app.tool<{ historyJson: string; currentLP: number }>(
  async ({ historyJson, currentLP }) => {
    const history = JSON.parse(historyJson) as Array<{
      result: "win" | "loss";
      kda: number;
      cs: number;
    }>;
    logger.info("Calculating promotion readiness score", {
      currentLP,
      recentGames: history.length,
    });

    try {
      // TODO: Replace with actual external API call
      // const promotionData = await externalAPIClient.getPromotionDataFromMobalytics();

      const recentWins = history.filter((m) => m.result === "win").length;
      const winRate = (recentWins / history.length) * 100;
      const avgKda =
        history.reduce((sum, m) => sum + m.kda, 0) / history.length;
      const avgCs = history.reduce((sum, m) => sum + m.cs, 0) / history.length;

      // Calculate readiness score (0-100)
      let readinessScore = 0;
      readinessScore += Math.min(winRate, 100) * 0.4; // Win rate worth 40%
      readinessScore += Math.min((avgKda / 5.0) * 100, 100) * 0.3; // KDA worth 30%
      readinessScore += Math.min((avgCs / 250) * 100, 100) * 0.2; // CS worth 20%
      readinessScore += Math.min((currentLP / 100) * 100, 100) * 0.1; // LP worth 10%

      let readinessLevel: string;
      if (readinessScore >= 75) {
        readinessLevel = "Ready for Promotion";
      } else if (readinessScore >= 60) {
        readinessLevel = "Nearly Ready";
      } else if (readinessScore >= 45) {
        readinessLevel = "Needs Improvement";
      } else {
        readinessLevel = "Not Ready";
      }

      const result = {
        currentLP,
        recentGames: history.length,
        recentWinRate: `${winRate.toFixed(1)}%`,
        averageKda: avgKda.toFixed(2),
        averageCs: avgCs.toFixed(0),
        readinessScore: readinessScore.toFixed(0),
        readinessLevel,
        recommendations: [
          readinessScore < 60
            ? "Focus on improving fundamentals before attempting promotion series"
            : "Performance is strong - continue current approach",
          winRate < 50
            ? "Win rate needs improvement - review losses and identify patterns"
            : "Win rate is solid for climbing",
          avgKda < 2.5
            ? "Work on reducing deaths and improving KDA"
            : "KDA is healthy",
          currentLP < 75
            ? "Build LP buffer before promotion series for safety"
            : "LP is in good position for promotion attempt",
        ],
        note: "TODO: Integration with U.GG/Mobalytics API pending (Task 11.5)",
      };

      tracer.putMetadata("promotionReadiness", result);
      logger.info("Promotion readiness calculated", {
        readinessLevel,
        score: result.readinessScore,
      });

      return result;
    } catch (error) {
      logger.error("Error calculating promotion readiness", { error });
      throw error;
    }
  },
  {
    name: "getPromotionReadinessScore",
    description:
      "Calculate readiness score for rank promotion based on recent performance and LP",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
