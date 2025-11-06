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
import {
  PERCENTAGE_MULTIPLIER,
  SECONDS_PER_MINUTE,
  VISION_SCORE_PER_MIN_AVERAGE,
  VISION_SCORE_PER_MIN_EXCELLENT,
  VISION_SCORE_PER_MIN_GOOD,
  WARDS_CLEARED_AVERAGE,
  WARDS_PLACED_AVERAGE,
} from "../../shared/constants";

const logger = new Logger({ serviceName: "hexcore-vision-tools" });
const tracer = new Tracer({ serviceName: "hexcore-vision-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// Vision analysis constants
const MIN_WARDS_PER_MINUTE_THRESHOLD = 0.3;
const DENIAL_RATIO_EXCELLENT_THRESHOLD = 2.0;
const DENIAL_RATIO_GOOD_THRESHOLD = 1.5;
const DENIAL_RATIO_AVERAGE_THRESHOLD = 1.0;

// Vision benchmark constants
const VISION_POOR_BENCHMARK = 3;
const CONTROL_WARDS_POOR_BENCHMARK = 2;
const CONTROL_WARDS_AVERAGE_BENCHMARK = 5;
const VISION_TOP10_UTILITY = 90;
const VISION_TOP10_NON_UTILITY = 60;
const WARDS_TOP10_UTILITY = 55;
const WARDS_TOP10_NON_UTILITY = 25;

// Additional vision constants
const VISION_UTILITY_EXCELLENT = 3.0;
const VISION_UTILITY_GOOD = 2.5;
const VISION_UTILITY_AVERAGE = 2.0;
const VISION_UTILITY_POOR = 1.5;
const VISION_NON_UTILITY_EXCELLENT = 2.0;
const VISION_NON_UTILITY_GOOD = 1.5;
const VISION_NON_UTILITY_AVERAGE = 1.0;
const VISION_NON_UTILITY_POOR = 0.7;

const WARDS_UTILITY_EXCELLENT = 50;
const WARDS_UTILITY_GOOD = 40;
const WARDS_UTILITY_AVERAGE = 30;
const WARDS_UTILITY_POOR = 20;
const WARDS_NON_UTILITY_EXCELLENT = 20;
const WARDS_NON_UTILITY_GOOD = 15;
const WARDS_NON_UTILITY_AVERAGE = 10;
const WARDS_NON_UTILITY_POOR = 5;

const WARDS_DESTROYED_EXCELLENT = 15;
const WARDS_DESTROYED_GOOD = 10;
const WARDS_DESTROYED_AVERAGE = 7;

const VISION_TOP25_UTILITY = 75;
const VISION_TOP25_NON_UTILITY = 50;
const WARDS_TOP25_UTILITY = 45;
const WARDS_TOP25_NON_UTILITY = 18;

const VISION_TOP50_UTILITY = 60;
const VISION_TOP50_NON_UTILITY = 40;
const WARDS_TOP50_UTILITY = 35;
const WARDS_TOP50_NON_UTILITY = 12;

const DENIAL_RATIO_GOOD_BENCHMARK = 1.5;

// Vision setup types
type VisionSetup = {
  wardLocations: string[];
  timing: string;
  priority: string;
  controlWardPriority: string;
  clearPriority: string[];
};

type ObjectiveVisionSetups = {
  dragon: VisionSetup;
  herald: VisionSetup;
  baron: VisionSetup;
  elder: VisionSetup;
  [key: string]: VisionSetup; // Allow string indexing
};

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

      if (visionScorePerMinute >= VISION_SCORE_PER_MIN_EXCELLENT) {
        rating = "Excellent";
      } else if (visionScorePerMinute >= VISION_SCORE_PER_MIN_GOOD) {
        rating = "Good";
      } else if (visionScorePerMinute >= VISION_SCORE_PER_MIN_AVERAGE) {
        rating = "Average";
      } else {
        rating = "Needs Improvement";
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (wardsPerMinute < MIN_WARDS_PER_MINUTE_THRESHOLD) {
        recommendations.push(
          "Low ward placement rate. Use your trinket and control wards more frequently to establish vision control"
        );
      }

      if (wardsDestroyed < WARDS_CLEARED_AVERAGE) {
        recommendations.push(
          "Limited ward clearing. Look for opportunities to deny enemy vision before objectives"
        );
      }

      if (visionScore < gameDurationMinutes * VISION_SCORE_PER_MIN_AVERAGE) {
        recommendations.push(
          "Vision score is below average. Focus on placing wards in high-value locations before objectives and teamfights"
        );
      }

      if (
        wardClearEfficiency < WARDS_CLEARED_AVERAGE &&
        wardsPlaced >= WARDS_PLACED_AVERAGE
      ) {
        recommendations.push(
          "Low ward clear rate relative to placement. Prioritize clearing enemy vision in contested areas"
        );
      }

      // Ward placement timing recommendations
      if (visionScorePerMinute >= VISION_SCORE_PER_MIN_GOOD) {
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
              ? {
                  excellent: VISION_UTILITY_EXCELLENT,
                  good: VISION_UTILITY_GOOD,
                  average: VISION_UTILITY_AVERAGE,
                  poor: VISION_UTILITY_POOR,
                }
              : {
                  excellent: VISION_NON_UTILITY_EXCELLENT,
                  good: VISION_NON_UTILITY_GOOD,
                  average: VISION_NON_UTILITY_AVERAGE,
                  poor: VISION_NON_UTILITY_POOR,
                },
          wardsPlacedPerGame:
            role === "UTILITY"
              ? {
                  excellent: WARDS_UTILITY_EXCELLENT,
                  good: WARDS_UTILITY_GOOD,
                  average: WARDS_UTILITY_AVERAGE,
                  poor: WARDS_UTILITY_POOR,
                }
              : {
                  excellent: WARDS_NON_UTILITY_EXCELLENT,
                  good: WARDS_NON_UTILITY_GOOD,
                  average: WARDS_NON_UTILITY_AVERAGE,
                  poor: WARDS_NON_UTILITY_POOR,
                },
          wardsDestroyedPerGame: {
            excellent: WARDS_DESTROYED_EXCELLENT,
            good: WARDS_DESTROYED_GOOD,
            average: WARDS_DESTROYED_AVERAGE,
            poor: VISION_POOR_BENCHMARK,
          },
          controlWardsBought: {
            excellent: 10,
            good: 7,
            average: CONTROL_WARDS_AVERAGE_BENCHMARK,
            poor: CONTROL_WARDS_POOR_BENCHMARK,
          },
        },
        percentileRankings: {
          top10: {
            visionScore:
              role === "UTILITY"
                ? VISION_TOP10_UTILITY
                : VISION_TOP10_NON_UTILITY,
            wardsPlaced:
              role === "UTILITY"
                ? WARDS_TOP10_UTILITY
                : WARDS_TOP10_NON_UTILITY,
          },
          top25: {
            visionScore:
              role === "UTILITY"
                ? VISION_TOP25_UTILITY
                : VISION_TOP25_NON_UTILITY,
            wardsPlaced:
              role === "UTILITY"
                ? WARDS_TOP25_UTILITY
                : WARDS_TOP25_NON_UTILITY,
          },
          top50: {
            visionScore:
              role === "UTILITY"
                ? VISION_TOP50_UTILITY
                : VISION_TOP50_NON_UTILITY,
            wardsPlaced:
              role === "UTILITY"
                ? WARDS_TOP50_UTILITY
                : WARDS_TOP50_NON_UTILITY,
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

      const visionSetups: ObjectiveVisionSetups = {
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
      if (denialRatio >= DENIAL_RATIO_EXCELLENT_THRESHOLD) {
        efficiency = "Excellent";
      } else if (denialRatio >= DENIAL_RATIO_GOOD_THRESHOLD) {
        efficiency = "Good";
      } else if (denialRatio >= DENIAL_RATIO_AVERAGE_THRESHOLD) {
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
          denialRatio < DENIAL_RATIO_GOOD_BENCHMARK
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
