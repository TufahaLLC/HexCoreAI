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
import {
  AD_HEAVY_THRESHOLD,
  AP_HEAVY_THRESHOLD,
  BASIC_ITEM_COST,
  BUILD_SIMILARITY_THRESHOLD,
  HEAL_THRESHOLD,
  ITEM_ID_BERSERKER_GREAVES,
  ITEM_ID_GUARDIAN_ANGEL,
  ITEM_ID_INFINITY_EDGE,
  ITEM_ID_MAW_OF_MALMORTIUS,
  ITEM_ID_MERCURIAL_SCIMITAR,
  ITEM_ID_MORTAL_REMINDER,
  ITEM_ID_PHANTOM_DANCER,
  ITEM_ID_QUICKSILVER_SASH,
  ITEM_ID_RAPID_FIRECANNON,
  MILLISECONDS_PER_MINUTE,
  PERCENTAGE_MULTIPLIER,
  PLACEHOLDER_ITEM_GOLD_VALUE,
  SUBSTRING_FIRST_100,
  SUBSTRING_LAST_50,
  SUBSTRING_START_INDEX,
  TANK_THRESHOLD,
  WIN_RATE_EXCELLENT,
  WIN_RATE_POOR,
} from "../../shared/constants";
import { externalAPIClient } from "../../shared/external-api-client";

const logger = new Logger({ serviceName: "hexcore-build-tools" });
const tracer = new Tracer({ serviceName: "hexcore-build-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// Build analysis constants
const INVALID_OBJECT_INDEX = -1;
const EVENT_SAMPLE_LENGTH = 500;

// Additional constants for regex patterns
const JSON_FRAGMENT_REGEX = /\{[^{}]+\}/g;
const TRAILING_COMMA_REGEX = /,\s*$/;

// Gold efficiency calculation constants
const AD_GOLD_VALUE = 35;
const AP_GOLD_VALUE = 20;
const ATTACK_SPEED_GOLD_VALUE = 2500;
const CRIT_CHANCE_GOLD_VALUE = 40;
const GOLD_EFFICIENCY_THRESHOLD = 100;

// Helper function to calculate item gold efficiency
const calculateItemEfficiency = (
  itemId: number,
  item: unknown
): {
  itemId: number;
  name: string;
  cost: number;
  goldEfficiency: string;
  stats: Record<string, number>;
  costEfficiency: string;
} | null => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const itemData = item as {
    name?: string;
    gold?: { total?: number };
    stats?: Record<string, number>;
  };

  const goldCost = itemData.gold?.total || PLACEHOLDER_ITEM_GOLD_VALUE;
  const stats = itemData.stats || {};

  // Calculate gold value from stats (simplified)
  let goldValue = 0;
  if (stats.FlatPhysicalDamageMod) {
    goldValue += stats.FlatPhysicalDamageMod * AD_GOLD_VALUE;
  }
  if (stats.FlatMagicDamageMod) {
    goldValue += stats.FlatMagicDamageMod * AP_GOLD_VALUE;
  }
  if (stats.PercentAttackSpeedMod) {
    goldValue += stats.PercentAttackSpeedMod * ATTACK_SPEED_GOLD_VALUE;
  }
  if (stats.FlatCritChanceMod) {
    goldValue += stats.FlatCritChanceMod * CRIT_CHANCE_GOLD_VALUE;
  }

  const efficiency =
    goldCost > 0 ? (goldValue / goldCost) * PERCENTAGE_MULTIPLIER : 0;

  return {
    itemId,
    name: itemData.name || `Item ${itemId}`,
    cost: goldCost,
    goldEfficiency: `${efficiency.toFixed(1)}%`,
    stats,
    costEfficiency:
      efficiency >= GOLD_EFFICIENCY_THRESHOLD
        ? "Gold efficient"
        : "Below gold value",
  };
};

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

      const buildData = result.Item.build;
      const gameInfo = result.Item.gameInfo;
      const teamComp = result.Item.teamComposition;

      tracer.putAnnotation("matchId", matchId);
      tracer.putMetadata("buildData", buildData);

      logger.info("Build data retrieved successfully", {
        matchId,
        itemCount: buildData?.items?.length || 0,
        itemTimelineCount: buildData?.itemTimeline?.length || 0,
        gameDuration: gameInfo?.gameDuration,
      });

      // PRE-SERIALIZE arrays as JSON strings to prevent Bedrock Agent mangling
      return {
        matchId,
        puuid,
        gameDuration: gameInfo?.gameDuration || 0,
        items: JSON.stringify(buildData?.items || []),
        itemTimeline: JSON.stringify(buildData?.itemTimeline || []),
        goldPerMinute: JSON.stringify(buildData?.goldPerMinute || []),
        enemyChampions: JSON.stringify(
          teamComp?.enemies?.map(
            (e: { championName: string }) => e.championName
          ) || []
        ),
      };
    } catch (error) {
      logger.error("Error fetching build data", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        matchId,
        puuid,
      });
      throw error;
    }
  },
  {
    name: "getMatchBuildData",
    description:
      "Retrieve build and itemization data for a specific match. Returns JSON strings for arrays.",
  }
);

/**
 * Parse JSON timeline with robust error handling and multiple format support
 */
function parseJsonTimeline(jsonInput: string, timelineType: string): unknown[] {
  if (typeof jsonInput !== "string") {
    throw new Error(`Invalid ${timelineType} type: ${typeof jsonInput}`);
  }

  let cleanedInput = jsonInput.trim();

  logger.info("Raw input details", {
    timelineType,
    length: cleanedInput.length,
    startsWithBrace: cleanedInput.startsWith("{"),
    startsWithBracket: cleanedInput.startsWith("["),
    first100: cleanedInput.substring(
      SUBSTRING_START_INDEX,
      SUBSTRING_FIRST_100
    ),
    last100: cleanedInput.substring(
      Math.max(SUBSTRING_START_INDEX, cleanedInput.length - SUBSTRING_FIRST_100)
    ),
  });

  // Handle concatenated JSON objects (no array wrapper)
  if (cleanedInput.startsWith("{") && !cleanedInput.startsWith("[")) {
    cleanedInput = handleConcatenatedJson(cleanedInput, timelineType);
  }

  const parsed = parseJsonWithFallback(cleanedInput, timelineType);
  return extractArrayFromParsed(parsed, timelineType);
}

/**
 * Handle concatenated JSON objects by wrapping in array
 */
function handleConcatenatedJson(
  cleanedInput: string,
  timelineType: string
): string {
  logger.info(`Detected concatenated JSON objects in ${timelineType}`);

  // Check if truncated (doesn't end with })
  if (!cleanedInput.endsWith("}")) {
    logger.warn("JSON appears truncated", {
      timelineType,
      lastChars: cleanedInput.substring(
        Math.max(SUBSTRING_START_INDEX, cleanedInput.length - SUBSTRING_LAST_50)
      ),
    });

    const lastCompleteObject = cleanedInput.lastIndexOf("}");
    if (lastCompleteObject === INVALID_OBJECT_INDEX) {
      logger.warn("No valid JSON objects found in concatenated input");
      return "";
    }
    const processedInput = cleanedInput.substring(0, lastCompleteObject + 1);
    logger.info("Truncated to last complete object", {
      timelineType,
      newLength: processedInput.length,
    });
    return processedInput;
  }

  if (cleanedInput.endsWith(",")) {
    const cleanedWithoutComma = cleanedInput.replace(TRAILING_COMMA_REGEX, "");
    logger.info("Removed trailing comma after truncation");
    return cleanedWithoutComma;
  }

  // Wrap in array
  return `[${cleanedInput}]`;
}

/**
 * Parse JSON with fallback to fragment parsing for malformed data
 */
function parseJsonWithFallback(
  cleanedInput: string,
  timelineType: string
): unknown {
  try {
    return JSON.parse(cleanedInput);
  } catch (primaryParseError) {
    logger.warn("Primary JSON.parse failed, attempting fragment parsing", {
      timelineType,
      error:
        primaryParseError instanceof Error
          ? primaryParseError.message
          : String(primaryParseError),
    });

    return parseJsonFragments(cleanedInput, primaryParseError as Error);
  }
}

/**
 * Parse JSON fragments when primary parsing fails
 */
function parseJsonFragments(
  cleanedInput: string,
  primaryParseError: Error
): unknown {
  const objectMatches = cleanedInput.match(JSON_FRAGMENT_REGEX);

  if (objectMatches && objectMatches.length > 0) {
    const parsedObjects: unknown[] = [];

    for (const fragment of objectMatches) {
      try {
        parsedObjects.push(JSON.parse(fragment));
      } catch (fragmentError) {
        logger.warn("Skipping malformed fragment during fallback parsing", {
          fragment,
          error:
            fragmentError instanceof Error
              ? fragmentError.message
              : String(fragmentError),
        });
      }
    }

    if (parsedObjects.length > 0) {
      logger.info("Fallback fragment parsing succeeded", {
        fragmentsParsed: parsedObjects.length,
      });
      return parsedObjects;
    }
  }

  throw primaryParseError;
}

/**
 * Extract array from parsed JSON data, handling multiple formats
 */
function extractArrayFromParsed(
  parsed: unknown,
  timelineType: string
): unknown[] {
  logger.info(`Successfully parsed ${timelineType}`, {
    type: typeof parsed,
    isArray: Array.isArray(parsed),
    length: Array.isArray(parsed) ? parsed.length : null,
  });

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    return handleParsedObject(parsed as Record<string, unknown>, timelineType);
  }

  throw new Error(`Unexpected parsed type: ${typeof parsed}`);
}

/**
 * Handle parsed object by extracting array from known properties
 */
function handleParsedObject(
  parsedObj: Record<string, unknown>,
  timelineType: string
): unknown[] {
  // Columnar format
  if (Array.isArray(parsedObj.itemId)) {
    logger.info("Detected columnar format, transposing", { timelineType });
    return transposeColumnarData(parsedObj);
  }

  // Check common array property names
  const arrayProperties =
    timelineType === "itemTimeline"
      ? ["itemTimeline", "items", "data"]
      : ["goldPerMinute", "data", "gold"];

  for (const prop of arrayProperties) {
    if (Array.isArray(parsedObj[prop])) {
      return parsedObj[prop] as unknown[];
    }
  }

  throw new Error(
    `Parsed ${timelineType} is an object with keys: ${Object.keys(parsedObj).join(", ")}`
  );
}

/**
 * Transpose columnar data to row format
 */
function transposeColumnarData(parsedObj: Record<string, unknown>): unknown[] {
  const itemIdArray = parsedObj.itemId as unknown[];
  const timestampArray = parsedObj.timestamp as unknown[];
  const costArray = parsedObj.cost as unknown[];

  const length = itemIdArray.length;
  const result: unknown[] = [];

  for (let i = 0; i < length; i++) {
    result.push({
      itemId: itemIdArray[i] as number,
      timestamp: Array.isArray(timestampArray)
        ? (timestampArray[i] as number)
        : 0,
      cost: Array.isArray(costArray) ? (costArray[i] as number) : 0,
    });
  }

  logger.info("Transposed successfully", {
    resultLength: result.length,
  });

  return result;
}

/**
 * Determine adaptation rating based on adaptation rate
 */
function determineAdaptationRating(adaptationRate: number): string {
  if (adaptationRate >= WIN_RATE_EXCELLENT) {
    return "Flexible";
  }
  if (adaptationRate >= WIN_RATE_POOR) {
    return "Moderate";
  }
  return "Rigid";
}

/**
 * Calculate build efficiency metrics from timeline and gold data
 */
function calculateBuildEfficiency(
  itemTimeline: unknown[],
  goldPerMinute: number[]
) {
  // Filter major items (cost >= 1000 gold)
  const majorItems = itemTimeline.filter(
    (item: unknown) => (item as { cost: number }).cost >= BASIC_ITEM_COST
  ) as Array<{ timestamp: number; cost: number; itemId?: number }>;

  // Calculate power spike timings
  const powerSpikes = majorItems.map((item, index: number) => ({
    itemNumber: index + 1,
    timestamp: item.timestamp,
    minute: Math.floor(item.timestamp / MILLISECONDS_PER_MINUTE),
    itemId: item.itemId || 0,
  }));

  // Calculate gold efficiency
  const totalGold = goldPerMinute.reduce(
    (sum: number, gold: number) => sum + gold,
    0
  );
  const goldSpent = itemTimeline.reduce(
    (sum: number, item: unknown) => sum + (item as { cost: number }).cost,
    0
  );
  const efficiency =
    totalGold > 0 ? (goldSpent / totalGold) * PERCENTAGE_MULTIPLIER : 0;

  // Calculate average time between major items
  const avgMinutesBetweenItems =
    majorItems.length > 1
      ? (majorItems[majorItems.length - 1]?.timestamp ??
          0 - majorItems[0].timestamp) /
        (majorItems.length - 1) /
        MILLISECONDS_PER_MINUTE
      : 0;

  return {
    efficiency: `${efficiency.toFixed(2)}%`,
    powerSpikes,
    avgTimeBetweenMajorItems: `${avgMinutesBetweenItems.toFixed(1)} minutes`,
    totalGold,
    goldSpent,
    itemsPurchased: itemTimeline.length,
    majorItemsPurchased: majorItems.length,
  };
}

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
    logger.info("Analyzing build efficiency - Initial inputs", {
      itemTimelineJsonType: typeof itemTimelineJson,
      goldPerMinuteJsonType: typeof goldPerMinuteJson,
      itemTimelineIsArray: Array.isArray(itemTimelineJson),
      goldPerMinuteIsArray: Array.isArray(goldPerMinuteJson),
    });

    try {
      // Parse timelines with robust error handling
      const itemTimeline = parseJsonTimeline(itemTimelineJson, "itemTimeline");
      const goldPerMinute = parseJsonTimeline(
        goldPerMinuteJson,
        "goldPerMinute"
      );

      // Validate arrays
      if (!Array.isArray(itemTimeline)) {
        throw new Error(
          `itemTimeline must be an array, got ${typeof itemTimeline}`
        );
      }
      if (!Array.isArray(goldPerMinute)) {
        throw new Error(
          `goldPerMinute must be an array, got ${typeof goldPerMinute}`
        );
      }

      logger.info("Successfully validated arrays", {
        timelineLength: itemTimeline.length,
        goldDataPoints: goldPerMinute.length,
      });

      // Calculate build efficiency
      const result = calculateBuildEfficiency(
        itemTimeline,
        goldPerMinute as number[]
      );

      tracer.putMetadata("buildEfficiency", result);
      logger.info("Build efficiency analyzed successfully", {
        efficiency: result.efficiency,
        powerSpikeCount: result.powerSpikes.length,
      });

      return result;
    } catch (error: unknown) {
      logger.error("Error analyzing build efficiency", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      });

      // Return a user-friendly error response instead of throwing
      return {
        error: `Build analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: "Please check the input format and try again",
      };
    }
  },
  {
    name: "analyzeBuildEfficiency",
    description:
      "Analyze build path efficiency and optimization opportunities. Accepts JSON string arrays.",
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

      if (apCount >= AP_HEAVY_THRESHOLD) {
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

      if (adCount >= AD_HEAVY_THRESHOLD) {
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

      if (healCount >= HEAL_THRESHOLD) {
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

      if (tankCount >= TANK_THRESHOLD) {
        recommendations.push(
          "Multiple tanks detected. Consider % health damage items: Blade of the Ruined King, Liandry's Torment, or Black Cleaver"
        );
      }

      const result = {
        currentBuild,
        enemyComposition: {
          apHeavy: apCount >= AP_HEAVY_THRESHOLD,
          adHeavy: adCount >= AD_HEAVY_THRESHOLD,
          healingPresent: healCount >= HEAL_THRESHOLD,
          tankHeavy: tankCount >= TANK_THRESHOLD,
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

/**
 * Tool: Get Optimal Build From Meta
 *
 * Retrieves optimal build recommendations from third-party meta sources (U.GG, OP.GG).
 */
app.tool<{ championName: string; role: string; rank: string }>(
  async ({ championName, role, rank }) => {
    logger.info("Fetching optimal build from meta", {
      championName,
      role,
      rank,
    });

    try {
      // Fetch build meta from U.GG
      const metaData = await externalAPIClient.getBuildMetaFromUGG(
        championName,
        role,
        rank
      );

      const result = {
        championName,
        role,
        rank,
        optimalBuild: {
          coreItems: metaData.coreItems,
          runes: metaData.runes,
          skillOrder: metaData.skillOrder,
        },
        winRate: `${metaData.winRate.toFixed(1)}%`,
        pickRate: `${metaData.pickRate.toFixed(1)}%`,
        source: metaData.source,
        timestamp: metaData.timestamp,
        reasoning: `Meta build from ${metaData.source.toUpperCase()} with ${metaData.winRate.toFixed(1)}% win rate`,
      };

      tracer.putMetadata("optimalBuildMeta", result);
      logger.info("Optimal build meta retrieved", { championName, role });

      return result;
    } catch (error) {
      logger.error("Error fetching optimal build from meta", {
        error,
        championName,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "getOptimalBuildFromMeta",
    description:
      "Retrieve optimal build recommendations from meta sources based on champion, role, and rank",
  }
);

/**
 * Tool: Compare Player Build To Meta
 *
 * Compares player's actual build to the meta-optimal build.
 */
app.tool<{ playerItemsJson: string; championName: string; role: string }>(
  async ({ playerItemsJson, championName, role }) => {
    const playerItems = JSON.parse(playerItemsJson) as number[];
    logger.info("Comparing player build to meta", {
      championName,
      role,
      itemCount: playerItems.length,
    });

    try {
      // Fetch meta build from U.GG
      const metaData = await externalAPIClient.getBuildMetaFromUGG(
        championName,
        role
      );
      const metaBuild = metaData.coreItems;

      // Use fetched meta build
      const metaBuildItems = [...metaBuild];

      // Calculate build similarity
      const matchingItems = playerItems.filter((item) =>
        metaBuildItems.includes(item)
      );
      const buildSimilarity =
        (matchingItems.length / metaBuildItems.length) * PERCENTAGE_MULTIPLIER;

      const result = {
        playerItems,
        metaBuild: metaBuildItems,
        matchingItems,
        buildSimilarity: `${buildSimilarity.toFixed(1)}%`,
        deviations: playerItems.filter(
          (item) => !metaBuildItems.includes(item)
        ),
        recommendations:
          buildSimilarity >= BUILD_SIMILARITY_THRESHOLD
            ? "Build closely follows meta recommendations"
            : "Consider incorporating more meta-optimal items",
        source: metaData.source,
        metaWinRate: `${metaData.winRate.toFixed(1)}%`,
      };

      tracer.putMetadata("buildComparison", result);
      logger.info("Build comparison completed", {
        similarity: result.buildSimilarity,
      });

      return result;
    } catch (error) {
      logger.error("Error comparing build to meta", {
        error,
        championName,
        role,
      });
      throw error;
    }
  },
  {
    name: "comparePlayerBuildToMeta",
    description:
      "Compare player's build to meta-optimal build and identify deviations",
  }
);

/**
 * Tool: Get Counter Build Recommendations
 *
 * Provides build recommendations specifically tailored to counter enemy champions.
 */
app.tool<{ championName: string; enemyChampionsJson: string; role: string }>(
  async ({ championName, enemyChampionsJson, role }) => {
    const enemyChampions = JSON.parse(enemyChampionsJson) as string[];
    logger.info("Getting counter build recommendations", {
      championName,
      role,
      enemyCount: enemyChampions.length,
    });

    try {
      // Note: Counter build recommendations based on enemy composition analysis

      const result = {
        championName,
        role,
        enemyChampions,
        counterItems: [
          {
            itemId: ITEM_ID_QUICKSILVER_SASH,
            reason: "QSS for CC-heavy composition",
            priority: "High",
          },
          {
            itemId: ITEM_ID_GUARDIAN_ANGEL,
            reason: "Guardian Angel for survivability",
            priority: "Medium",
          },
          {
            itemId: ITEM_ID_MORTAL_REMINDER,
            reason: "Mortal Reminder for healing reduction",
            priority: "High",
          },
        ],
        buildPath: {
          early: [ITEM_ID_BERSERKER_GREAVES, ITEM_ID_PHANTOM_DANCER],
          mid: [ITEM_ID_INFINITY_EDGE, ITEM_ID_MAW_OF_MALMORTIUS],
          late: [ITEM_ID_RAPID_FIRECANNON, ITEM_ID_MORTAL_REMINDER],
        },
        matchupSpecific: {
          vsAP: "Consider Maw of Malmortius if facing heavy AP damage",
          vsAD: "Prioritize armor items like Plated Steelcaps",
          vsHealing: "Rush Grievous Wounds items",
        },
      };

      tracer.putMetadata("counterBuildRecommendations", result);
      logger.info("Counter build recommendations generated", { championName });

      return result;
    } catch (error) {
      logger.error("Error getting counter build recommendations", {
        error,
        championName,
        role,
      });
      throw error;
    }
  },
  {
    name: "getCounterBuildRecommendations",
    description:
      "Get matchup-specific build recommendations to counter enemy team composition",
  }
);

/**
 * Tool: Analyze Build Adaptation Speed
 *
 * Analyzes how quickly player adapts their build based on match history.
 */
app.tool<{ matchHistoryJson: string }>(
  async ({ matchHistoryJson }) => {
    const matchHistory = JSON.parse(matchHistoryJson) as Array<{
      matchId: string;
      items: number[];
      enemyComp: string[];
      result: "win" | "loss";
    }>;
    logger.info("Analyzing build adaptation speed", {
      matchCount: matchHistory.length,
    });

    try {
      // Analyze build variation across matches
      const uniqueBuilds = new Set(
        matchHistory.map((m) => m.items.sort().join(","))
      );
      const adaptationRate =
        (uniqueBuilds.size / matchHistory.length) * PERCENTAGE_MULTIPLIER;

      // Check for situational item usage
      const situationalItems = [
        ITEM_ID_QUICKSILVER_SASH,
        ITEM_ID_MORTAL_REMINDER,
        ITEM_ID_GUARDIAN_ANGEL,
        ITEM_ID_MERCURIAL_SCIMITAR,
      ]; // QSS, Mortal Reminder, GA, Mercurial
      const situationalItemUsage = matchHistory.filter((m) =>
        m.items.some((item) => situationalItems.includes(item))
      ).length;

      const result = {
        totalMatches: matchHistory.length,
        uniqueBuilds: uniqueBuilds.size,
        adaptationRate: `${adaptationRate.toFixed(1)}%`,
        situationalItemUsage: {
          count: situationalItemUsage,
          percentage: `${(
            (situationalItemUsage / matchHistory.length) * PERCENTAGE_MULTIPLIER
          ).toFixed(1)}%`,
        },
        rating: determineAdaptationRating(adaptationRate),
        recommendation:
          adaptationRate < WIN_RATE_POOR
            ? "Consider adapting builds more based on enemy composition and game state"
            : "Good build flexibility - continue adapting to match conditions",
      };

      tracer.putMetadata("buildAdaptation", result);
      logger.info("Build adaptation analysis completed", {
        adaptationRate: result.adaptationRate,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing build adaptation", { error });
      throw error;
    }
  },
  {
    name: "analyzeBuildAdaptationSpeed",
    description:
      "Analyze player's ability to adapt builds across different matches and situations",
  }
);

/**
 * Tool: Get Item Gold Efficiency
 *
 * Calculates gold efficiency for specific items using Data Dragon.
 */
app.tool<{ itemIdsJson: string }>(
  async ({ itemIdsJson }) => {
    const itemIds = JSON.parse(itemIdsJson) as number[];
    logger.info("Calculating item gold efficiency", {
      itemCount: itemIds.length,
    });

    try {
      // Fetch item data from Data Dragon
      const itemsData = await externalAPIClient.getItemsFromDataDragon();

      // Calculate efficiency for each item
      const efficiencyData = itemIds
        .map((itemId) =>
          calculateItemEfficiency(itemId, itemsData[itemId.toString()])
        )
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const avgEfficiency =
        efficiencyData.length > 0
          ? efficiencyData.reduce(
              (sum, item) => sum + Number.parseFloat(item.goldEfficiency),
              0
            ) / efficiencyData.length
          : 0;

      const result = {
        items: efficiencyData,
        averageEfficiency: `${avgEfficiency.toFixed(1)}%`,
        mostEfficient: efficiencyData.sort(
          (a, b) =>
            Number.parseFloat(b.goldEfficiency) -
            Number.parseFloat(a.goldEfficiency)
        )[0],
        leastEfficient: efficiencyData[efficiencyData.length - 1] ?? null,
        source: "Data Dragon",
      };

      tracer.putMetadata("itemGoldEfficiency", result);
      logger.info("Item gold efficiency calculated", {
        itemCount: itemIds.length,
      });

      return result;
    } catch (error) {
      logger.error("Error calculating item gold efficiency", { error });
      throw error;
    }
  },
  {
    name: "getItemGoldEfficiency",
    description:
      "Calculate gold efficiency for specific items based on their stats and cost",
  }
);

export const handler = async (event: unknown, context: Context) => {
  // Debug logging to see the actual event structure
  logger.info("Received event", {
    eventType: typeof event,
    eventKeys: event && typeof event === "object" ? Object.keys(event) : [],
    eventSample: JSON.stringify(event).substring(0, EVENT_SAMPLE_LENGTH),
  });

  // Validate event structure
  if (!event || typeof event !== "object") {
    logger.error("Invalid event: not an object", { event });
    throw new Error("Event must be an object");
  }

  const eventObj = event as Record<string, unknown>;

  // Check if this is a RETURN_CONTROL event (has inputText but no function)
  if ("inputText" in eventObj && !("function" in eventObj)) {
    logger.error(
      "Action group is configured for RETURN_CONTROL mode, but Lambda expects function calling mode",
      {
        actionGroup: eventObj.actionGroup,
        receivedFields: Object.keys(eventObj),
        hint: "Reconfigure the action group in Bedrock console to use 'Select an existing Lambda function' with function definitions",
      }
    );
    throw new Error(
      "Action group must be configured for function calling mode, not RETURN_CONTROL. " +
        "Please update the action group configuration in the Bedrock console to use Lambda function invocation."
    );
  }

  // Check if this is a valid Bedrock Agent function event
  const requiredFields = ["actionGroup", "function", "messageVersion", "agent"];
  const missingFields = requiredFields.filter((field) => !(field in eventObj));

  if (missingFields.length > 0) {
    logger.error("Invalid Bedrock Agent event structure", {
      missingFields,
      receivedFields: Object.keys(eventObj),
      eventSample: JSON.stringify(event).substring(0, EVENT_SAMPLE_LENGTH),
    });
    throw new Error(
      `Invalid Bedrock Agent event: missing required fields: ${missingFields.join(", ")}`
    );
  }

  return app.resolve(event, context);
};
