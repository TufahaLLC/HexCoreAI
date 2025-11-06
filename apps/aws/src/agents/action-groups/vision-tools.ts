/**
 * Vision Analysis Action Group Tools
 *
 * Provides tools for Bedrock Vision Analysis Agent to retrieve and analyze
 * vision control, ward placement, and map awareness.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";

const logger = new Logger({ serviceName: "hexcore-vision-tools" });
const tracer = new Tracer({ serviceName: "hexcore-vision-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

// Vision analysis constants
const SECONDS_PER_MINUTE = 60;
const PERCENTAGE_MULTIPLIER = 100;
const EXCELLENT_VISION_THRESHOLD = 2.0;
const GOOD_VISION_THRESHOLD = 1.5;
const AVERAGE_VISION_THRESHOLD = 1.0;

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Tool: Get Match Vision Data
 *
 * Retrieves vision statistics including wards placed, destroyed, and vision score.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Fetching vision data", { matchId, puuid });

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

      const visionData = result.Item.vision;
      const gameInfo = result.Item.gameInfo;

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("visionData", visionData);

      logger.info("Vision data retrieved successfully", {
        matchId,
        visionScore: visionData?.visionScore,
        gameDuration: gameInfo?.gameDuration,
      });

      return {
        matchId,
        puuid,
        gameDuration: gameInfo?.gameDuration || 0,
        gameDurationMinutes: gameInfo?.gameDurationMinutes || 0,
        wardsPlaced: visionData?.wardsPlaced || 0,
        wardsDestroyed: visionData?.wardsDestroyed || 0,
        visionScore: visionData?.visionScore || 0,
        visionScorePerMinute: visionData?.visionScorePerMinute || 0,
        controlWardsBought: visionData?.controlWardsBought || 0,
      };
    } catch (error) {
      logger.error("Error fetching vision data", { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: "getMatchVisionData",
    description:
      "Retrieve vision and ward data for a specific match including game duration",
  }
);

/**
 * Tool: Analyze Vision Score
 *
 * Analyzes ward placement efficiency and vision control contribution.
 */
app.tool<{
  wardsPlaced: number;
  wardsDestroyed: number;
  visionScore: number;
  gameDuration: number;
}>(
  async ({ wardsPlaced, wardsDestroyed, visionScore, gameDuration }) => {
    logger.info("Analyzing vision score", {
      visionScore,
      wardsPlaced,
      wardsDestroyed,
    });

    try {
      const gameDurationMinutes = gameDuration / SECONDS_PER_MINUTE;

      // Calculate vision metrics
      const wardsPerMinute = wardsPlaced / gameDurationMinutes;
      const visionScorePerMinute = visionScore / gameDurationMinutes;
      const wardClearEfficiency =
        wardsPlaced > 0
          ? (wardsDestroyed / wardsPlaced) * PERCENTAGE_MULTIPLIER
          : 0;

      // Determine vision rating
      let rating: "Excellent" | "Good" | "Average" | "Needs Improvement";

      if (visionScorePerMinute >= EXCELLENT_VISION_THRESHOLD) {
        rating = "Excellent";
      } else if (visionScorePerMinute >= GOOD_VISION_THRESHOLD) {
        rating = "Good";
      } else if (visionScorePerMinute >= AVERAGE_VISION_THRESHOLD) {
        rating = "Average";
      } else {
        rating = "Needs Improvement";
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (wardsPerMinute < 0.3) {
        recommendations.push(
          "Low ward placement rate. Use your trinket and control wards more frequently to establish vision control"
        );
      }

      if (wardsDestroyed < 5) {
        recommendations.push(
          "Limited ward clearing. Look for opportunities to deny enemy vision before objectives"
        );
      }

      if (visionScore < gameDurationMinutes * 1.0) {
        recommendations.push(
          "Vision score is below average. Focus on placing wards in high-value locations before objectives and teamfights"
        );
      }

      if (wardClearEfficiency < 20 && wardsPlaced >= 10) {
        recommendations.push(
          "Low ward clear rate relative to placement. Prioritize clearing enemy vision in contested areas"
        );
      }

      // Ward placement timing recommendations
      if (visionScorePerMinute >= 1.5) {
        recommendations.push(
          "Strong vision control. Continue maintaining vision around objectives and in enemy jungle"
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          "Solid vision control. Maintain consistent warding patterns around objectives"
        );
      }

      const result = {
        visionMetrics: {
          visionScore,
          visionScorePerMinute: visionScorePerMinute.toFixed(2),
          wardsPlaced,
          wardsDestroyed,
          wardsPerMinute: wardsPerMinute.toFixed(2),
          wardClearEfficiency: `${wardClearEfficiency.toFixed(1)}%`,
        },
        rating,
        recommendations,
      };

      tracer.putMetadata("visionAnalysis", result);
      logger.info("Vision analysis completed", {
        rating,
        visionScorePerMinute: visionScorePerMinute.toFixed(2),
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing vision score", { error });
      throw error;
    }
  },
  {
    name: "analyzeVisionScore",
    description: "Analyze ward placement efficiency and vision control",
  }
);

/**
 * Tool: Get Vision Heatmaps
 *
 * Retrieves optimal ward placement heatmaps for specific champions and roles.
 * TODO: Integrate with LoLalytics/Mobalytics API once implemented in Task 11.5
 */
app.tool<{ championName: string; role: string }>(
  async ({ championName, role }) => {
    logger.info("Fetching vision heatmaps", { championName, role });

    try {
      // TODO: Replace with actual external API call
      // const heatmapData = await externalAPIClient.getVisionHeatmapsFromLoLalytics(championName, role);

      const result = {
        championName,
        role,
        optimalWardLocations: [
          {
            location: "River brush near Dragon",
            priority: "High",
            successRate: "78%",
          },
          { location: "Tri-brush", priority: "High", successRate: "72%" },
          {
            location: "Enemy jungle entrance",
            priority: "Medium",
            successRate: "65%",
          },
          {
            location: "Baron pit entrance",
            priority: "Medium",
            successRate: "68%",
          },
        ],
        timeBasedPriorities: {
          early: ["River brush", "Lane brush"],
          mid: ["Jungle entrances", "Objective areas"],
          late: ["Baron/Dragon pit", "Siege positions"],
        },
        note: "TODO: Integration with LoLalytics/Mobalytics API pending (Task 11.5)",
      };

      tracer.putMetadata("visionHeatmaps", result);
      logger.info("Vision heatmaps retrieved", { championName, role });

      return result;
    } catch (error) {
      logger.error("Error fetching vision heatmaps", {
        error,
        championName,
        role,
      });
      throw error;
    }
  },
  {
    name: "getVisionHeatmaps",
    description:
      "Retrieve optimal ward placement heatmaps and priority locations for champion and role",
  }
);

/**
 * Tool: Get Vision Benchmarks By Role
 *
 * Retrieves vision score and warding benchmarks by role and rank.
 * TODO: Integrate with U.GG API once implemented in Task 11.5
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Fetching vision benchmarks by role", { role, rank });

    try {
      // TODO: Replace with actual external API call
      // const benchmarks = await externalAPIClient.getVisionBenchmarksFromUGG(role, rank);

      const result = {
        role,
        rank,
        benchmarks: {
          visionScorePerMinute:
            role === "UTILITY"
              ? { excellent: 3.0, good: 2.5, average: 2.0, poor: 1.5 }
              : { excellent: 2.0, good: 1.5, average: 1.0, poor: 0.7 },
          wardsPlacedPerGame:
            role === "UTILITY"
              ? { excellent: 50, good: 40, average: 30, poor: 20 }
              : { excellent: 20, good: 15, average: 10, poor: 5 },
          wardsDestroyedPerGame: {
            excellent: 15,
            good: 10,
            average: 7,
            poor: 3,
          },
          controlWardsBought: { excellent: 10, good: 7, average: 5, poor: 2 },
        },
        percentileRankings: {
          top10: {
            visionScore: role === "UTILITY" ? 90 : 60,
            wardsPlaced: role === "UTILITY" ? 55 : 25,
          },
          top25: {
            visionScore: role === "UTILITY" ? 75 : 50,
            wardsPlaced: role === "UTILITY" ? 45 : 18,
          },
          top50: {
            visionScore: role === "UTILITY" ? 60 : 40,
            wardsPlaced: role === "UTILITY" ? 35 : 12,
          },
        },
        note: "TODO: Integration with U.GG API pending (Task 11.5)",
      };

      tracer.putMetadata("visionBenchmarksByRole", result);
      logger.info("Vision benchmarks by role retrieved", { role, rank });

      return result;
    } catch (error) {
      logger.error("Error fetching vision benchmarks by role", {
        error,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "getVisionBenchmarksByRole",
    description:
      "Retrieve vision score and warding benchmarks specific to role and rank",
  }
);

/**
 * Tool: Get Objective Vision Setup
 *
 * Provides optimal vision setup strategies for specific objectives.
 * TODO: Integrate with Mobalytics API once implemented in Task 11.5
 */
app.tool<{ objectiveType: string }>(
  async ({ objectiveType }) => {
    logger.info("Fetching objective vision setup", { objectiveType });

    try {
      // TODO: Replace with actual external API call
      // const setupData = await externalAPIClient.getObjectiveVisionFromMobalytics(objectiveType);

      const visionSetups: Record<string, any> = {
        dragon: {
          wardLocations: [
            "Dragon pit entrance from river",
            "Tri-brush near dragon",
            "Enemy jungle entrance near dragon",
            "River brush",
          ],
          controlWardPriority: "Dragon pit or river brush",
          clearPriority: [
            "Enemy wards in pit",
            "River brush wards",
            "Tri-brush wards",
          ],
          timing: "30-60 seconds before spawn",
        },
        baron: {
          wardLocations: [
            "Baron pit entrance",
            "Top river brush",
            "Enemy blue buff area",
            "Top lane tri-brush",
          ],
          controlWardPriority: "Baron pit or top river brush",
          clearPriority: [
            "Enemy wards in pit",
            "River wards",
            "Jungle entrance wards",
          ],
          timing: "45-90 seconds before spawn or attempt",
        },
        herald: {
          wardLocations: [
            "Herald pit entrance",
            "Top river brush",
            "Top lane brush",
            "Enemy jungle entrance",
          ],
          controlWardPriority: "Herald pit",
          clearPriority: ["Pit wards", "River wards"],
          timing: "30 seconds before spawn",
        },
      };

      const result = {
        objectiveType,
        setup: visionSetups[objectiveType.toLowerCase()] || visionSetups.dragon,
        generalTips: [
          "Establish vision control before objective spawns",
          "Use sweeper to clear enemy vision in key areas",
          "Place control wards in high-traffic areas",
          "Coordinate with team for vision denial",
        ],
        note: "TODO: Integration with Mobalytics API pending (Task 11.5)",
      };

      tracer.putMetadata("objectiveVisionSetup", result);
      logger.info("Objective vision setup retrieved", { objectiveType });

      return result;
    } catch (error) {
      logger.error("Error fetching objective vision setup", {
        error,
        objectiveType,
      });
      throw error;
    }
  },
  {
    name: "getObjectiveVisionSetup",
    description:
      "Get optimal vision setup strategies for Dragon, Baron, or Herald objectives",
  }
);

/**
 * Tool: Analyze Vision Denial Efficiency
 *
 * Analyzes vision denial performance based on wards killed and detectors placed.
 * TODO: Integrate with LoLalytics API once implemented in Task 11.5
 */
app.tool<{ wardsKilled: number; detectorsPlaced: number }>(
  async ({ wardsKilled, detectorsPlaced }) => {
    logger.info("Analyzing vision denial efficiency", {
      wardsKilled,
      detectorsPlaced,
    });

    try {
      // TODO: Replace with actual external API call for benchmarks
      // const denialBenchmarks = await externalAPIClient.getVisionDenialBenchmarksFromLoLalytics();

      const denialRatio =
        detectorsPlaced > 0 ? wardsKilled / detectorsPlaced : 0;

      let efficiency: string;
      if (denialRatio >= 2.0) {
        efficiency = "Excellent";
      } else if (denialRatio >= 1.5) {
        efficiency = "Good";
      } else if (denialRatio >= 1.0) {
        efficiency = "Average";
      } else {
        efficiency = "Needs Improvement";
      }

      const result = {
        wardsKilled,
        detectorsPlaced,
        denialRatio: denialRatio.toFixed(2),
        efficiency,
        recommendations: [
          denialRatio < 1.5
            ? "Use sweeper more efficiently - clear vision before objectives"
            : "Good vision denial - continue denying enemy vision",
          "Prioritize clearing wards in high-value locations (objectives, jungle entrances)",
          "Coordinate with team for vision control before major plays",
        ],
        benchmarks: {
          excellent: "2.0+ wards per sweeper",
          good: "1.5-2.0 wards per sweeper",
          average: "1.0-1.5 wards per sweeper",
        },
        note: "TODO: Integration with LoLalytics API pending (Task 11.5)",
      };

      tracer.putMetadata("visionDenialEfficiency", result);
      logger.info("Vision denial efficiency analyzed", {
        efficiency,
        denialRatio: result.denialRatio,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing vision denial efficiency", { error });
      throw error;
    }
  },
  {
    name: "analyzeVisionDenialEfficiency",
    description:
      "Analyze vision denial efficiency based on wards cleared per detector used",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
