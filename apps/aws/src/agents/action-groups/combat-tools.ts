/**
 * Combat Analysis Action Group Tools
 *
 * Provides tools for Bedrock Combat Analysis Agent to retrieve and analyze
 * combat performance, damage patterns, and teamfight effectiveness.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";

const logger = new Logger({ serviceName: "hexcore-combat-tools" });
const tracer = new Tracer({ serviceName: "hexcore-combat-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

/**
 * Tool: Get Match Combat Data
 *
 * Retrieves combat statistics including KDA and damage metrics.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Fetching combat data", { matchId, puuid });

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

      const combatData = result.Item.combat;

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("combatData", combatData);

      logger.info("Combat data retrieved successfully", {
        matchId,
        kda: `${combatData?.kills || 0}/${combatData?.deaths || 0}/${combatData?.assists || 0}`,
      });

      return {
        matchId,
        puuid,
        kills: combatData?.kills || 0,
        deaths: combatData?.deaths || 0,
        assists: combatData?.assists || 0,
        damageDealt: {
          physical: combatData?.damageDealt?.physical || 0,
          magic: combatData?.damageDealt?.magic || 0,
          true: combatData?.damageDealt?.true || 0,
          total: combatData?.damageDealt?.total || 0,
        },
        damageReceived: {
          physical: combatData?.damageReceived?.physical || 0,
          magic: combatData?.damageReceived?.magic || 0,
          true: combatData?.damageReceived?.true || 0,
          total: combatData?.damageReceived?.total || 0,
        },
      };
    } catch (error) {
      logger.error("Error fetching combat data", { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: "getMatchCombatData",
    description: "Retrieve combat statistics including KDA and damage data",
  }
);

/**
 * Tool: Analyze Damage Output
 *
 * Analyzes damage patterns, efficiency, and survivability.
 */
app.tool<{
  damageDealtJson: string;
  damageReceivedJson: string;
}>(
  async ({ damageDealtJson, damageReceivedJson }) => {
    const damageDealt = JSON.parse(
      damageDealtJson
    ) as { physical: number; magic: number; true: number; total: number };
    const damageReceived = JSON.parse(
      damageReceivedJson
    ) as { physical: number; magic: number; true: number; total: number };
    logger.info("Analyzing damage output", {
      totalDealt: damageDealt.total,
      totalReceived: damageReceived.total,
    });

    try {
      const totalDealt = damageDealt.total;
      const totalReceived = damageReceived.total;

      // Calculate damage type breakdown percentages
      const damageBreakdown = {
        physical:
          totalDealt > 0
            ? ((damageDealt.physical / totalDealt) * 100).toFixed(1) + "%"
            : "0%",
        magic:
          totalDealt > 0
            ? ((damageDealt.magic / totalDealt) * 100).toFixed(1) + "%"
            : "0%",
        true_damage:
          totalDealt > 0
            ? ((damageDealt.true / totalDealt) * 100).toFixed(1) + "%"
            : "0%",
      };

      // Calculate damage ratio and survivability rating
      const damageRatio = totalReceived > 0 ? totalDealt / totalReceived : 0;
      let rating: "Excellent" | "Good" | "Needs Improvement";

      if (damageRatio >= 1.5) {
        rating = "Excellent";
      } else if (damageRatio >= 1.0) {
        rating = "Good";
      } else {
        rating = "Needs Improvement";
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (damageRatio < 1.0) {
        recommendations.push(
          "Damage output is lower than damage taken. Focus on trading more effectively and positioning to deal damage safely"
        );
      }

      if (totalDealt < 15000) {
        recommendations.push(
          "Low total damage output. Look for more opportunities to contribute damage in fights"
        );
      }

      const physicalPercent =
        (damageDealt.physical / totalDealt) * 100;
      const magicPercent = (damageDealt.magic / totalDealt) * 100;

      if (physicalPercent > 70) {
        recommendations.push(
          "Damage is heavily physical. Enemy armor items will significantly reduce your effectiveness"
        );
      } else if (magicPercent > 70) {
        recommendations.push(
          "Damage is heavily magic. Enemy magic resist items will significantly reduce your effectiveness"
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          "Damage output is solid. Continue focusing on damage optimization and positioning"
        );
      }

      const result = {
        totalDamageDealt: totalDealt,
        totalDamageReceived: totalReceived,
        damageBreakdown,
        survivability: {
          damageRatio: damageRatio.toFixed(2),
          rating,
        },
        recommendations,
      };

      tracer.putMetadata("damageAnalysis", result);
      logger.info("Damage analysis completed", {
        ratio: damageRatio.toFixed(2),
        rating,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing damage output", { error });
      throw error;
    }
  },
  {
    name: "analyzeDamageOutput",
    description: "Analyze damage patterns and combat effectiveness",
  }
);

/**
 * Tool: Evaluate Teamfight Performance
 *
 * Evaluates KDA performance and kill participation in teamfights.
 */
app.tool<{
  kills: number;
  deaths: number;
  assists: number;
  killParticipation: number;
}>(
  async ({ kills, deaths, assists, killParticipation }) => {
    logger.info("Evaluating teamfight performance", {
      kills,
      deaths,
      assists,
      killParticipation,
    });

    try {
      // Calculate KDA ratio
      const kdaRatio =
        deaths > 0 ? (kills + assists) / deaths : kills + assists;

      // Determine performance rating
      let rating: "S-Tier" | "A-Tier" | "B-Tier" | "C-Tier";

      if (kdaRatio >= 5.0) {
        rating = "S-Tier";
      } else if (kdaRatio >= 3.0) {
        rating = "A-Tier";
      } else if (kdaRatio >= 2.0) {
        rating = "B-Tier";
      } else {
        rating = "C-Tier";
      }

      // Identify strengths
      const strengths: string[] = [];

      if (kdaRatio >= 3.0) {
        strengths.push("Excellent KDA ratio showing strong combat performance");
      }

      if (killParticipation >= 70) {
        strengths.push(
          "High kill participation - actively involved in team objectives"
        );
      }

      if (deaths <= 3) {
        strengths.push("Good survivability - minimizing deaths effectively");
      }

      if (assists >= kills * 2) {
        strengths.push(
          "Strong team support - contributing significantly to assists"
        );
      }

      // Identify improvements
      const improvements: string[] = [];

      if (deaths >= 7) {
        improvements.push(
          "High death count. Focus on positioning and map awareness to reduce deaths"
        );
      }

      if (killParticipation < 50) {
        improvements.push(
          "Low kill participation. Be more present during teamfights and skirmishes"
        );
      }

      if (kdaRatio < 2.0 && deaths > kills) {
        improvements.push(
          "Negative KDA trend. Review combat engagements and focus on safer trading patterns"
        );
      }

      if (assists < 5) {
        improvements.push(
          "Limited assist contribution. Look for opportunities to support teammates in fights"
        );
      }

      // Default messages
      if (strengths.length === 0) {
        strengths.push("Consistent performance in teamfights");
      }

      if (improvements.length === 0) {
        improvements.push("Maintain current teamfight approach and execution");
      }

      const result = {
        performance: {
          kdaRatio: parseFloat(kdaRatio.toFixed(2)),
          killParticipation: killParticipation.toFixed(1) + "%",
          rating,
        },
        strengths,
        improvements,
      };

      tracer.putMetadata("teamfightPerformance", result);
      logger.info("Teamfight evaluation completed", {
        kdaRatio: kdaRatio.toFixed(2),
        rating,
      });

      return result;
    } catch (error) {
      logger.error("Error evaluating teamfight performance", { error });
      throw error;
    }
  },
  {
    name: "evaluateTeamfightPerformance",
    description: "Evaluate player performance in teamfights based on KDA",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
