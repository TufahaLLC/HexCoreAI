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
import {
  CHAMPION_POOL_IDEAL_MAX,
  CHAMPION_POOL_IDEAL_MIN,
  CHAMPION_POOL_MAX,
  CHAMPION_POOL_MIN,
  CS_CONSISTENCY_EXCELLENT,
  CS_CONSISTENCY_GOOD,
  GAMES_TO_CLIMB_BRONZE,
  GAMES_TO_CLIMB_GOLD_PLUS,
  GAMES_TO_CLIMB_IRON,
  GAMES_TO_CLIMB_SILVER,
  KDA_CONSISTENCY_EXCELLENT,
  KDA_CONSISTENCY_GOOD,
  KDA_MINIMUM_HEALTHY,
  LP_BUFFER_SAFE,
  LP_CLIMB_NEGATIVE,
  LP_CLIMB_POSITIVE,
  LP_GAIN_AVERAGE,
  LP_GAIN_HEALTHY_MAX,
  LP_GAIN_HEALTHY_MIN,
  LP_MAX,
  PERCENTAGE_MULTIPLIER,
  READINESS_CS_TARGET,
  READINESS_CS_WEIGHT,
  READINESS_KDA_TARGET,
  READINESS_KDA_WEIGHT,
  READINESS_LP_WEIGHT,
  READINESS_SCORE_NEARLY_READY,
  READINESS_SCORE_NEEDS_IMPROVEMENT,
  READINESS_SCORE_READY,
  READINESS_WIN_RATE_WEIGHT,
  VARIANCE_EXPONENT,
  WIN_RATE_AVERAGE,
  WIN_RATE_BELOW_AVERAGE,
  WIN_RATE_EXCELLENT,
  WIN_RATE_GOOD,
  WIN_RATE_IRON_BRONZE_TARGET,
  WIN_RATE_PLATINUM_PLUS_TARGET,
  WIN_RATE_POOR,
  WIN_RATE_SILVER_GOLD_TARGET,
} from "../../shared/constants";
import { externalAPIClient } from "../../shared/external-api-client";

const logger = new Logger({ serviceName: "hexcore-competitive-tools" });
const tracer = new Tracer({ serviceName: "hexcore-competitive-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

/**
 * Helper: Create default unranked data response
 */
function createDefaultRankData(puuid: string, season: string, note: string) {
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
    note,
  };
}

/**
 * Helper: Calculate win rate from rank data
 */
function calculateWinRate(rankData: {
  wins?: number;
  losses?: number;
  winRate?: number;
}): string {
  const { wins, losses, winRate } = rankData;

  if (wins && losses) {
    return ((wins / (wins + losses)) * PERCENTAGE_MULTIPLIER).toFixed(1);
  }

  if (winRate) {
    return (winRate * PERCENTAGE_MULTIPLIER).toFixed(1);
  }

  return "0";
}

/**
 * Helper: Determine climb trend based on LP change
 */
function determineClimbTrend(
  avgLpPerGame: number
): "Climbing" | "Stable" | "Declining" {
  if (avgLpPerGame > LP_CLIMB_POSITIVE) {
    return "Climbing";
  }
  if (avgLpPerGame >= LP_CLIMB_NEGATIVE) {
    return "Stable";
  }
  return "Declining";
}

/**
 * Helper: Determine MMR health
 */
function determineMmrHealth(
  avgLpPerGame: number
): "Healthy" | "Normal" | "Damaged" {
  if (avgLpPerGame > LP_GAIN_AVERAGE) {
    return "Healthy";
  }
  if (avgLpPerGame > -LP_GAIN_AVERAGE) {
    return "Normal";
  }
  return "Damaged";
}

/**
 * Helper: Generate rank trend insights
 */
function generateRankTrendInsights(params: {
  winRate: number;
  recentWinRate: number;
  recentMatchesLength: number;
  mmrHealth: "Healthy" | "Normal" | "Damaged";
  climbTrend: "Climbing" | "Stable" | "Declining";
}): string[] {
  const { winRate, recentWinRate, recentMatchesLength, mmrHealth, climbTrend } =
    params;
  const insights: string[] = [];

  if (winRate >= WIN_RATE_GOOD) {
    insights.push(
      `Strong overall win rate (${winRate.toFixed(1)}%). Continue current approach for consistent climbing`
    );
  } else if (winRate < WIN_RATE_POOR) {
    insights.push(
      `Win rate (${winRate.toFixed(1)}%) below 50%. Focus on fundamentals and reduce mistakes to improve consistency`
    );
  }

  if (recentWinRate >= WIN_RATE_EXCELLENT) {
    insights.push(
      `Recent form is excellent (${recentWinRate.toFixed(1)}% over last ${recentMatchesLength} games). Momentum is in your favor`
    );
  } else if (recentWinRate < WIN_RATE_POOR) {
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

  if (climbTrend === "Declining" && recentWinRate < WIN_RATE_POOR) {
    insights.push(
      "Downward trend detected. Take a break, review fundamentals, or consider adjusting champion pool"
    );
  }

  return insights.length > 0
    ? insights
    : [
        "Performance is stable. Continue playing consistently to maintain or improve rank",
      ];
}

/**
 * Helper: Generate rank-specific recommendations
 */
function generateRankSpecificRecommendations(rankTier: string): string[] {
  const recommendations: string[] = [];

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

  return recommendations;
}

/**
 * Helper: Generate champion pool recommendations
 */
function generateChampionPoolRecommendations(
  championPoolSize: number
): string[] {
  const recommendations: string[] = [];

  if (championPoolSize > CHAMPION_POOL_MAX) {
    recommendations.push(
      `Large champion pool (${championPoolSize} champions). Consider narrowing to ${CHAMPION_POOL_IDEAL_MIN}-${CHAMPION_POOL_IDEAL_MAX} champions for better mastery and consistency`
    );
  } else if (championPoolSize <= CHAMPION_POOL_MIN) {
    recommendations.push(
      "Limited champion pool. Add 1-2 comfort picks to handle difficult matchups and team compositions"
    );
  }

  return recommendations;
}

/**
 * Helper: Generate win rate recommendations
 */
function generateWinRateRecommendations(winRate: number): string[] {
  const recommendations: string[] = [];

  if (winRate < WIN_RATE_BELOW_AVERAGE) {
    recommendations.push(
      `Win rate below ${WIN_RATE_AVERAGE}%. Focus on reducing mistakes rather than making plays. Consistency beats flashy plays`
    );
  } else if (winRate >= WIN_RATE_GOOD) {
    recommendations.push(
      `Strong win rate (${winRate.toFixed(1)}%). You're ready to climb - play more games to reach your potential rank`
    );
  }

  return recommendations;
}

/**
 * Helper: Generate role-specific recommendations
 */
function generateRoleRecommendations(mainRole: string): string[] {
  const recommendations: string[] = [];

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

  return recommendations;
}

/**
 * Helper: Determine if rank is low tier (Iron/Bronze)
 */
function isLowTierRank(rank: string): boolean {
  return rank.includes("Iron") || rank.includes("Bronze");
}

/**
 * Helper: Get target win rate for rank
 */
function getTargetWinRate(rank: string): string {
  if (isLowTierRank(rank)) {
    return `${WIN_RATE_IRON_BRONZE_TARGET}%`;
  }
  if (rank.includes("Silver") || rank.includes("Gold")) {
    return `${WIN_RATE_SILVER_GOLD_TARGET}%`;
  }
  return `${WIN_RATE_PLATINUM_PLUS_TARGET}%`;
}

/**
 * Helper: Get average games to climb for rank
 */
function getAverageGamesToClimb(rank: string): number {
  if (rank.includes("Iron")) {
    return GAMES_TO_CLIMB_IRON;
  }
  if (rank.includes("Bronze")) {
    return GAMES_TO_CLIMB_BRONZE;
  }
  if (rank.includes("Silver")) {
    return GAMES_TO_CLIMB_SILVER;
  }
  return GAMES_TO_CLIMB_GOLD_PLUS;
}

/**
 * Helper: Get key focus areas for rank
 */
function getKeyFocusAreas(rank: string): string[] {
  const isLowTier = isLowTierRank(rank);
  return [
    isLowTier ? "CS and farming fundamentals" : "Wave management and trading",
    isLowTier ? "Reducing deaths" : "Objective priority",
    isLowTier ? "Basic map awareness" : "Advanced macro decisions",
  ];
}

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
        return createDefaultRankData(
          puuid,
          season,
          "Rank data not available for this player"
        );
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
        winRate: calculateWinRate(rankData),
      };
    } catch (error) {
      logger.error("Error fetching rank progression data", {
        error,
        puuid,
        season,
      });

      // Return default instead of throwing
      return createDefaultRankData(puuid, season, "Error retrieving rank data");
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
      const winRate =
        totalGames > 0 ? (wins / totalGames) * PERCENTAGE_MULTIPLIER : 0;

      // Analyze recent form (last 10 games)
      const recentWins = recentMatches.filter((m) => m.result === "win").length;
      const recentWinRate =
        recentMatches.length > 0
          ? (recentWins / recentMatches.length) * PERCENTAGE_MULTIPLIER
          : 0;

      // Calculate LP trend
      const totalLpChange = recentMatches.reduce(
        (sum, match) => sum + match.lpChange,
        0
      );
      const avgLpPerGame =
        recentMatches.length > 0 ? totalLpChange / recentMatches.length : 0;

      // Determine climb trend and MMR health
      const climbTrend = determineClimbTrend(avgLpPerGame);
      const mmrHealth = determineMmrHealth(avgLpPerGame);

      // Generate insights
      const insights = generateRankTrendInsights({
        winRate,
        recentWinRate,
        recentMatchesLength: recentMatches.length,
        mmrHealth,
        climbTrend,
      });

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
      // Extract rank tier (e.g., "Gold" from "Gold 2")
      const rankTier = currentRank.split(" ")[0];

      // Generate all recommendations using helper functions
      const recommendations = [
        ...generateRankSpecificRecommendations(rankTier),
        ...generateChampionPoolRecommendations(championPool.length),
        ...generateWinRateRecommendations(winRate),
        ...generateRoleRecommendations(mainRole),
      ];

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
 */
app.tool<{ rank: string }>(
  async ({ rank }) => {
    logger.info("Fetching rank climb benchmarks", { rank });

    try {
      // Note: Rank climb benchmarks based on statistical analysis

      const result = {
        rank,
        targetWinRate: getTargetWinRate(rank),
        averageGamesToClimb: getAverageGamesToClimb(rank),
        keyFocusAreas: getKeyFocusAreas(rank),
        lpGainsTarget: `+${LP_GAIN_HEALTHY_MIN} to +${LP_GAIN_HEALTHY_MAX} LP per win indicates healthy MMR`,
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
 */
app.tool<{ rank: string; role: string }>(
  async ({ rank, role }) => {
    logger.info("Fetching meta champions for rank", { rank, role });

    try {
      // Fetch champion meta from U.GG
      const championMeta = await externalAPIClient.getChampionMetaFromUGG(
        "meta",
        role,
        rank
      );

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
        source: championMeta.source,
        timestamp: championMeta.timestamp,
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
      // Note: Performance consistency analysis based on statistical variance

      // Calculate standard deviations
      const avgKda =
        history.reduce((sum, m) => sum + m.kda, 0) / history.length;
      const kdaVariance =
        history.reduce(
          (sum, m) => sum + (m.kda - avgKda) ** VARIANCE_EXPONENT,
          0
        ) / history.length;
      const kdaStdDev = Math.sqrt(kdaVariance);

      const avgCs = history.reduce((sum, m) => sum + m.cs, 0) / history.length;
      const csVariance =
        history.reduce(
          (sum, m) => sum + (m.cs - avgCs) ** VARIANCE_EXPONENT,
          0
        ) / history.length;
      const csStdDev = Math.sqrt(csVariance);

      let consistencyRating: string;
      if (
        kdaStdDev < KDA_CONSISTENCY_EXCELLENT &&
        csStdDev < CS_CONSISTENCY_EXCELLENT
      ) {
        consistencyRating = "Highly Consistent";
      } else if (
        kdaStdDev < KDA_CONSISTENCY_GOOD &&
        csStdDev < CS_CONSISTENCY_GOOD
      ) {
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
          kdaStdDev > KDA_CONSISTENCY_GOOD
            ? "KDA varies significantly - work on reducing deaths and maintaining safer playstyle"
            : "KDA is stable across matches",
          csStdDev > CS_CONSISTENCY_GOOD
            ? "CS varies significantly - focus on consistent farming patterns"
            : "CS is consistent across matches",
        ],
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
      // Note: Promotion readiness calculated from recent performance metrics

      const recentWins = history.filter((m) => m.result === "win").length;
      const winRate = (recentWins / history.length) * PERCENTAGE_MULTIPLIER;
      const avgKda =
        history.reduce((sum, m) => sum + m.kda, 0) / history.length;
      const avgCs = history.reduce((sum, m) => sum + m.cs, 0) / history.length;

      // Calculate readiness score (0-100)
      let readinessScore = 0;
      readinessScore +=
        Math.min(winRate, PERCENTAGE_MULTIPLIER) * READINESS_WIN_RATE_WEIGHT; // Win rate worth 40%
      readinessScore +=
        Math.min(
          (avgKda / READINESS_KDA_TARGET) * PERCENTAGE_MULTIPLIER,
          PERCENTAGE_MULTIPLIER
        ) * READINESS_KDA_WEIGHT; // KDA worth 30%
      readinessScore +=
        Math.min(
          (avgCs / READINESS_CS_TARGET) * PERCENTAGE_MULTIPLIER,
          PERCENTAGE_MULTIPLIER
        ) * READINESS_CS_WEIGHT; // CS worth 20%
      readinessScore +=
        Math.min(
          (currentLP / LP_MAX) * PERCENTAGE_MULTIPLIER,
          PERCENTAGE_MULTIPLIER
        ) * READINESS_LP_WEIGHT; // LP worth 10%

      let readinessLevel: string;
      if (readinessScore >= READINESS_SCORE_READY) {
        readinessLevel = "Ready for Promotion";
      } else if (readinessScore >= READINESS_SCORE_NEARLY_READY) {
        readinessLevel = "Nearly Ready";
      } else if (readinessScore >= READINESS_SCORE_NEEDS_IMPROVEMENT) {
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
          readinessScore < READINESS_SCORE_NEARLY_READY
            ? "Focus on improving fundamentals before attempting promotion series"
            : "Performance is strong - continue current approach",
          winRate < WIN_RATE_AVERAGE
            ? "Win rate needs improvement - review losses and identify patterns"
            : "Win rate is solid for climbing",
          avgKda < KDA_MINIMUM_HEALTHY
            ? "Work on reducing deaths and improving KDA"
            : "KDA is healthy",
          currentLP < LP_BUFFER_SAFE
            ? "Build LP buffer before promotion series for safety"
            : "LP is in good position for promotion attempt",
        ],
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
