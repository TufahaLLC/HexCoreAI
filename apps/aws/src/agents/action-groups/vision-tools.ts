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

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

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

      const visionData = result.Item.vision;

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("visionData", visionData);

      logger.info("Vision data retrieved successfully", {
        matchId,
        visionScore: visionData?.visionScore || 0,
      });

      return {
        matchId,
        puuid,
        wardsPlaced: visionData?.wardsPlaced || 0,
        wardsDestroyed: visionData?.wardsDestroyed || 0,
        visionScore: visionData?.visionScore || 0,
      };
    } catch (error) {
      logger.error("Error fetching vision data", { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: "getMatchVisionData",
    description: "Retrieve vision control statistics for a specific match",
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
      const gameDurationMinutes = gameDuration / 60;

      // Calculate vision metrics
      const wardsPerMinute = wardsPlaced / gameDurationMinutes;
      const visionScorePerMinute = visionScore / gameDurationMinutes;
      const wardClearEfficiency =
        wardsPlaced > 0 ? (wardsDestroyed / wardsPlaced) * 100 : 0;

      // Determine vision rating
      let rating: "Excellent" | "Good" | "Average" | "Needs Improvement";

      if (visionScorePerMinute >= 2.0) {
        rating = "Excellent";
      } else if (visionScorePerMinute >= 1.5) {
        rating = "Good";
      } else if (visionScorePerMinute >= 1.0) {
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
          wardClearEfficiency: wardClearEfficiency.toFixed(1) + "%",
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

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
