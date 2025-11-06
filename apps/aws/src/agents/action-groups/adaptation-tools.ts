/**
 * Adaptation Analysis Action Group Tools
 *
 * Provides tools for Bedrock Adaptation Analysis Agent to analyze how players adapt
 * their strategy based on game state, enemy composition, and match conditions.
 */

import { BedrockAgentFunctionResolver } from "@aws-lambda-powertools/event-handler/bedrock-agent";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";

const logger = new Logger({ serviceName: "hexcore-adaptation-tools" });
const tracer = new Tracer({ serviceName: "hexcore-adaptation-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

// Item ID constants
const GA_ITEM_ID = 3026;
const MAW_ITEM_ID = 3156;
const BANSHEE_ITEM_ID = 3102;
const GARGOYLE_ITEM_ID = 3193;
const EDGE_OF_NIGHT_ITEM_ID = 3814;
const THORNMAIL_ITEM_ID = 3075;
const FROZEN_HEART_ITEM_ID = 3110;
const DEAD_MANS_ITEM_ID = 3742;
const RANDUINS_ITEM_ID = 3143;
const SPIRIT_VISAGE_ITEM_ID = 3065;
const MERCURYS_ITEM_ID = 3111;

// Scoring constants
const PERCENTAGE_MULTIPLIER = 100;
const META_BUILD_THRESHOLD = 70;
const HEAVY_AD_THRESHOLD = 3;
const HEAVY_AP_THRESHOLD = 2;
const BASE_SCORE = 50;
const META_BUILD_BONUS = 10;
const ARMOR_BONUS_SCORE = 20;
const NO_ARMOR_PENALTY = 15;
const MR_BONUS_SCORE = 20;
const NO_MR_PENALTY = 15;
const DEFENSIVE_BONUS = 10;
const HIGH_FLEXIBILITY_THRESHOLD = 70;
const MEDIUM_FLEXIBILITY_THRESHOLD = 50;

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Tool: Analyze Build Adaptation
 *
 * Evaluates how player adapted build based on game state and enemy composition.
 */
app.tool<{
  matchId: string;
  puuid: string;
  championName: string;
  role: string;
  enemyChampions: string[];
}>(
  async ({ matchId, puuid, championName, role, enemyChampions }) => {
    logger.info("Analyzing build adaptation", { matchId, puuid, championName });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `match:${matchId}:puuid:${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: "Match data not found",
          matchId,
          puuid,
        };
      }

      const buildData = result.Item.build;
      tracer.putMetadata("buildData", buildData);

      // Fetch recommended build from external API
      const { externalAPIClient } = await import(
        "../../shared/external-api-client"
      );
      const recommendedBuild = await externalAPIClient.getBuildMetaFromUGG(
        championName,
        role
      );

      // Analyze adaptation
      const adaptation = analyzeBuildAdaptation(
        buildData?.items || [],
        recommendedBuild.coreItems,
        enemyChampions
      );

      return {
        matchId,
        puuid,
        adaptationScore: adaptation.score,
        situationalItems: adaptation.situationalItems,
        counterItems: adaptation.counterItems,
        buildFlexibility: adaptation.flexibility,
        recommendations: adaptation.recommendations,
        metaBuildFollowed: adaptation.metaBuildFollowed,
      };
    } catch (error) {
      logger.error("Error analyzing build adaptation", {
        error: error instanceof Error ? error.message : "Unknown error",
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "analyzeBuildAdaptation",
    description:
      "Evaluate how player adapted build based on game state and enemy composition",
  }
);

function analyzeBuildAdaptation(
  actualItems: number[],
  metaItems: number[],
  enemyChampions: string[]
) {
  // Defensive items
  const defensiveItems = [
    GA_ITEM_ID,
    MAW_ITEM_ID,
    BANSHEE_ITEM_ID,
    GARGOYLE_ITEM_ID,
    EDGE_OF_NIGHT_ITEM_ID,
  ]; // GA, Maw, Banshee's, Gargoyle, Edge of Night
  const armorItems = [
    THORNMAIL_ITEM_ID,
    FROZEN_HEART_ITEM_ID,
    DEAD_MANS_ITEM_ID,
    RANDUINS_ITEM_ID,
  ]; // Thornmail, Frozen Heart, Dead Man's, Randuin's
  const mrItems = [
    SPIRIT_VISAGE_ITEM_ID,
    MERCURYS_ITEM_ID,
    MAW_ITEM_ID,
    BANSHEE_ITEM_ID,
  ]; // Spirit Visage, Mercury's, Maw, Banshee's

  const hasDefensiveItem = actualItems.some((item) =>
    defensiveItems.includes(item)
  );
  const hasArmorItem = actualItems.some((item) => armorItems.includes(item));
  const hasMRItem = actualItems.some((item) => mrItems.includes(item));

  // Check if enemy has heavy AD or AP
  const heavyADEnemies = enemyChampions.filter((c) =>
    ["Zed", "Talon", "Yasuo", "Yone", "Jinx", "Caitlyn", "Draven"].includes(c)
  ).length;
  const heavyAPEnemies = enemyChampions.filter((c) =>
    ["Syndra", "Orianna", "Viktor", "Veigar", "LeBlanc"].includes(c)
  ).length;

  let score = BASE_SCORE;
  let situationalItems = 0;
  let counterItems = 0;
  const recommendations: string[] = [];

  // Check meta build adherence
  const metaBuildFollowed = metaItems.filter((item) =>
    actualItems.includes(item)
  ).length;
  const metaBuildPercentage =
    (metaBuildFollowed / metaItems.length) * PERCENTAGE_MULTIPLIER;

  if (metaBuildPercentage > META_BUILD_THRESHOLD) {
    score += META_BUILD_BONUS;
  }

  // Check situational adaptation
  if (heavyADEnemies >= HEAVY_AD_THRESHOLD && hasArmorItem) {
    score += ARMOR_BONUS_SCORE;
    counterItems += 1;
    situationalItems += 1;
  } else if (heavyADEnemies >= HEAVY_AD_THRESHOLD && !hasArmorItem) {
    score -= NO_ARMOR_PENALTY;
    recommendations.push("Consider building armor against heavy AD team");
  }

  if (heavyAPEnemies >= HEAVY_AP_THRESHOLD && hasMRItem) {
    score += MR_BONUS_SCORE;
    counterItems += 1;
    situationalItems += 1;
  } else if (heavyAPEnemies >= HEAVY_AP_THRESHOLD && !hasMRItem) {
    score -= NO_MR_PENALTY;
    recommendations.push(
      "Consider building magic resist against heavy AP team"
    );
  }

  if (hasDefensiveItem) {
    score += DEFENSIVE_BONUS;
    situationalItems += 1;
  }

  let flexibility: "High" | "Medium" | "Low";
  if (score >= HIGH_FLEXIBILITY_THRESHOLD) {
    flexibility = "High";
  } else if (score >= MEDIUM_FLEXIBILITY_THRESHOLD) {
    flexibility = "Medium";
  } else {
    flexibility = "Low";
  }

  return {
    score: Math.round(score),
    situationalItems,
    counterItems,
    flexibility,
    recommendations,
    metaBuildFollowed: `${metaBuildFollowed}/${metaItems.length} core items`,
  };
}

/**
 * Tool: Analyze Playstyle Flexibility
 *
 * Evaluates player's ability to adjust playstyle based on match conditions.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Analyzing playstyle flexibility", { matchId, puuid });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `timeline:${matchId}:puuid:${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: "Timeline data not found",
          matchId,
          puuid,
        };
      }

      // TODO: Implement playstyle flexibility analysis
      return {
        matchId,
        puuid,
        flexibilityScore: 0,
        aggressivePhases: 0,
        defensivePhases: 0,
        adaptiveDecisions: 0,
        recommendations: [
          "TODO: Implement playstyle flexibility analysis (Task 11.5)",
        ],
      };
    } catch (error) {
      logger.error("Error analyzing playstyle flexibility", {
        error: error instanceof Error ? error.message : "Unknown error",
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "analyzePlaystyleFlexibility",
    description:
      "Evaluate player's ability to adjust playstyle based on match conditions",
  }
);

/**
 * Tool: Analyze Strategic Pivoting
 *
 * Evaluates how well player pivoted strategy when behind or ahead.
 */
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }) => {
    logger.info("Analyzing strategic pivoting", { matchId, puuid });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `timeline:${matchId}:puuid:${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: "Timeline data not found",
          matchId,
          puuid,
        };
      }

      // TODO: Implement strategic pivoting analysis
      return {
        matchId,
        puuid,
        pivotingScore: 0,
        comebackAttempts: 0,
        snowballCapitalization: 0,
        strategicShifts: [],
        recommendations: [
          "TODO: Implement strategic pivoting analysis (Task 11.5)",
        ],
      };
    } catch (error) {
      logger.error("Error analyzing strategic pivoting", {
        error: error instanceof Error ? error.message : "Unknown error",
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "analyzeStrategicPivoting",
    description:
      "Evaluate how well player pivoted strategy when behind or ahead",
  }
);

/**
 * Tool: Get Adaptation Benchmarks
 *
 * Retrieves adaptation benchmarks from external APIs.
 */
app.tool<{ championName: string; role: string; rank: string }>(
  ({ championName, role, rank }) => {
    logger.info("Fetching adaptation benchmarks", { championName, role, rank });

    try {
      // TODO: Integration with external API client pending Task 11.5
      const benchmarks = {
        championName,
        role,
        rank,
        averageBuildVariations: 3.5,
        situationalItemRate: 0.65,
        playstyleFlexibilityScore: 72,
        strategicPivotSuccessRate: 0.58,
        source: "placeholder",
        note: "TODO: Integration with external API client pending Task 11.5",
      };

      tracer.putMetadata("adaptationBenchmarks", benchmarks);
      return Promise.resolve(benchmarks);
    } catch (error) {
      logger.error("Error fetching adaptation benchmarks", {
        error: error instanceof Error ? error.message : "Unknown error",
        championName,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "getAdaptationBenchmarks",
    description: "Retrieve adaptation benchmarks from external APIs",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
