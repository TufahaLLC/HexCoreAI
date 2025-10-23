/**
 * Build Analysis Action Group Tools
 *
 * Provides tools for Bedrock Build Analysis Agent to retrieve and analyze
 * itemization data, build paths, and situational adaptations.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";

const logger = new Logger({ serviceName: "hexcore-build-tools" });
const tracer = new Tracer({ serviceName: "hexcore-build-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

/**
 * Tool: Get Match Build Data
 *
 * Retrieves build and itemization data from DynamoDB for a specific match and player.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Fetching build data", { matchId, puuid });

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

      const buildData = result.Item.build;

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("buildData", buildData);

      logger.info("Build data retrieved successfully", {
        matchId,
        itemCount: buildData?.items?.length || 0,
      });

      return {
        matchId,
        puuid,
        items: buildData?.items || [],
        itemTimeline: buildData?.itemTimeline || [],
        goldPerMinute: buildData?.goldPerMinute || [],
      };
    } catch (error) {
      logger.error("Error fetching build data", { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: "getMatchBuildData",
    description: "Retrieve build and itemization data for a specific match",
  }
);

/**
 * Tool: Analyze Build Efficiency
 *
 * Analyzes build path efficiency, power spike timing, and gold utilization.
 */
app.tool<{
  itemTimelineJson: string;
  goldPerMinuteJson: string;
}>(
  async ({ itemTimelineJson, goldPerMinuteJson }) => {
    logger.info("Analyzing build efficiency", {
      // lengths computed after JSON parsing below
    });

    try {
      const itemTimeline = JSON.parse(
        itemTimelineJson
      ) as Array<{ timestamp: number; itemId?: number; cost: number }>;
      const goldPerMinute = JSON.parse(goldPerMinuteJson) as number[];

      logger.info("Parsed inputs for build efficiency", {
        timelineLength: itemTimeline.length,
        goldDataPoints: goldPerMinute.length,
      });
      // Filter major items (cost >= 1000 gold)
      const majorItems = itemTimeline.filter((item) => item.cost >= 1000);

      // Calculate power spike timings
      const powerSpikes = majorItems.map((item, index) => ({
        itemNumber: index + 1,
        timestamp: item.timestamp,
        minute: Math.floor(item.timestamp / 60000),
        itemId: item.itemId || 0,
      }));

      // Calculate gold efficiency
      const totalGold = goldPerMinute.reduce((sum, gold) => sum + gold, 0);
      const goldSpent = itemTimeline.reduce((sum, item) => sum + item.cost, 0);
      const efficiency = totalGold > 0 ? (goldSpent / totalGold) * 100 : 0;

      // Calculate average time between major items
      const avgMinutesBetweenItems =
        majorItems.length > 1
          ? (majorItems[majorItems.length - 1].timestamp -
              majorItems[0].timestamp) /
            (majorItems.length - 1) /
            60000
          : 0;

      const result = {
        efficiency: efficiency.toFixed(2) + "%",
        powerSpikes,
        avgTimeBetweenMajorItems: avgMinutesBetweenItems.toFixed(1) + " minutes",
        totalGold,
        goldSpent,
        itemsPurchased: itemTimeline.length,
        majorItemsPurchased: majorItems.length,
      };

      tracer.putMetadata("buildEfficiency", result);
      logger.info("Build efficiency analyzed", {
        efficiency: result.efficiency,
        powerSpikeCount: powerSpikes.length,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing build efficiency", { error });
      throw error;
    }
  },
  {
    name: "analyzeBuildEfficiency",
    description: "Analyze build path efficiency and optimization opportunities",
  }
);

/**
 * Tool: Recommend Item Adaptations
 *
 * Generates situational item recommendations based on enemy team composition.
 */
app.tool<{ currentBuild: number[]; enemyChampions: string[] }>(
  async ({ currentBuild, enemyChampions }) => {
    logger.info("Generating item recommendations", {
      buildSize: currentBuild.length,
      enemyCount: enemyChampions.length,
    });

    try {
      const recommendations: string[] = [];

      // AP-heavy composition detection
      const apChampions = [
        "Syndra",
        "Orianna",
        "LeBlanc",
        "Ahri",
        "Viktor",
        "Lux",
        "Xerath",
        "Velkoz",
        "Anivia",
        "Cassiopeia",
      ];
      const apCount = enemyChampions.filter((champ) =>
        apChampions.some((ap) => champ.toLowerCase().includes(ap.toLowerCase()))
      ).length;

      if (apCount >= 3) {
        recommendations.push(
          "Enemy has heavy AP damage. Prioritize Magic Resist items: Maw of Malmortius, Banshee's Veil, Force of Nature, or Spirit Visage"
        );
      }

      // AD-heavy composition detection
      const adChampions = [
        "Jinx",
        "Caitlyn",
        "Draven",
        "Zed",
        "Talon",
        "Yasuo",
        "Yone",
        "Jhin",
        "Vayne",
        "Lucian",
      ];
      const adCount = enemyChampions.filter((champ) =>
        adChampions.some((ad) => champ.toLowerCase().includes(ad.toLowerCase()))
      ).length;

      if (adCount >= 3) {
        recommendations.push(
          "Enemy has heavy AD damage. Build Armor items: Randuin's Omen, Thornmail, Frozen Heart, or Plated Steelcaps"
        );
      }

      // Healing composition detection
      const healChampions = [
        "Soraka",
        "Yuumi",
        "Sona",
        "Vladimir",
        "Aatrox",
        "Swain",
        "Sylas",
        "Warwick",
        "Mundo",
        "Volibear",
      ];
      const healCount = enemyChampions.filter((champ) =>
        healChampions.some((heal) =>
          champ.toLowerCase().includes(heal.toLowerCase())
        )
      ).length;

      if (healCount >= 2) {
        recommendations.push(
          "Multiple healing champions detected. Prioritize Grievous Wounds: Mortal Reminder, Morellonomicon, Chempunk Chainsword, or Thornmail"
        );
      }

      // Tank composition detection
      const tankChampions = [
        "Malphite",
        "Ornn",
        "Sion",
        "Cho'Gath",
        "Sejuani",
        "Maokai",
        "Nautilus",
      ];
      const tankCount = enemyChampions.filter((champ) =>
        tankChampions.some((tank) =>
          champ.toLowerCase().includes(tank.toLowerCase())
        )
      ).length;

      if (tankCount >= 2) {
        recommendations.push(
          "Multiple tanks detected. Consider % health damage items: Blade of the Ruined King, Liandry's Torment, or Black Cleaver"
        );
      }

      const result = {
        currentBuild,
        enemyComposition: {
          apHeavy: apCount >= 3,
          adHeavy: adCount >= 3,
          healingPresent: healCount >= 2,
          tankHeavy: tankCount >= 2,
        },
        recommendations:
          recommendations.length > 0
            ? recommendations
            : ["Current build is well-adapted to enemy composition"],
      };

      tracer.putMetadata("itemRecommendations", result);
      logger.info("Item recommendations generated", {
        recommendationCount: result.recommendations.length,
      });

      return result;
    } catch (error) {
      logger.error("Error generating recommendations", { error });
      throw error;
    }
  },
  {
    name: "recommendItemAdaptations",
    description:
      "Generate situational item recommendations based on enemy composition",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
