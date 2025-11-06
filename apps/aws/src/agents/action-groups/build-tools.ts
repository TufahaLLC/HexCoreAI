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
import type { ItemPurchase } from "../../shared/types";

const logger = new Logger({ serviceName: "hexcore-build-tools" });
const tracer = new Tracer({ serviceName: "hexcore-build-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

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
          teamComp?.enemies?.map((e: any) => e.championName) || []
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
      let itemTimeline: any, goldPerMinute: any;

      // ============ PARSE ITEM TIMELINE ============
      try {
        if (typeof itemTimelineJson === "string") {
          let cleaned = itemTimelineJson.trim();

          logger.info("Raw input details", {
            length: cleaned.length,
            startsWithBrace: cleaned.startsWith("{"),
            startsWithBracket: cleaned.startsWith("["),
            first100: cleaned.substring(0, 100),
            last100: cleaned.substring(Math.max(0, cleaned.length - 100)),
          });

          // Handle concatenated JSON objects (no array wrapper)
          if (cleaned.startsWith("{") && !cleaned.startsWith("[")) {
            logger.info("Detected concatenated JSON objects");

            // Check if truncated (doesn't end with })
            if (!cleaned.endsWith("}")) {
              logger.warn("JSON appears truncated", {
                lastChars: cleaned.substring(Math.max(0, cleaned.length - 50)),
              });

              // Find last complete object
              const lastCompleteObject = cleaned.lastIndexOf("}");

              if (lastCompleteObject !== -1) {
                cleaned = cleaned.substring(0, lastCompleteObject + 1);
                logger.info("Truncated to last complete object", {
                  newLength: cleaned.length,
                });
              } else {
                throw new Error("Cannot find any complete JSON objects");
              }
            }

            if (cleaned.endsWith(",")) {
              cleaned = cleaned.replace(/,\s*$/, "");
              logger.info("Removed trailing comma after truncation");
            }

            // Wrap in array
            cleaned = `[${cleaned}]`;
            logger.info("Wrapped concatenated objects in array");
          }

          // Try to parse
          let parsed: unknown;
          try {
            parsed = JSON.parse(cleaned);
          } catch (primaryParseError) {
            logger.warn(
              "Primary JSON.parse failed, attempting fragment parsing",
              {
                error:
                  primaryParseError instanceof Error
                    ? primaryParseError.message
                    : String(primaryParseError),
              }
            );

            const objectMatches = cleaned.match(/\{[^{}]+\}/g);

            if (objectMatches && objectMatches.length > 0) {
              const parsedObjects: any[] = [];

              for (const fragment of objectMatches) {
                try {
                  parsedObjects.push(JSON.parse(fragment));
                } catch (fragmentError) {
                  logger.warn(
                    "Skipping malformed fragment during fallback parsing",
                    {
                      fragment,
                      error:
                        fragmentError instanceof Error
                          ? fragmentError.message
                          : String(fragmentError),
                    }
                  );
                }
              }

              if (parsedObjects.length > 0) {
                parsed = parsedObjects;
                logger.info("Fallback fragment parsing succeeded", {
                  fragmentsParsed: parsedObjects.length,
                });
              } else {
                throw primaryParseError;
              }
            } else {
              throw primaryParseError;
            }
          }

          logger.info("Successfully parsed itemTimeline", {
            type: typeof parsed,
            isArray: Array.isArray(parsed),
            length: Array.isArray(parsed) ? parsed.length : null,
          });

          if (Array.isArray(parsed)) {
            itemTimeline = parsed;
          } else if (parsed && typeof parsed === "object") {
            // Type guard for object with known properties
            const parsedObj = parsed as Record<string, unknown>;

            // Columnar format
            if (Array.isArray(parsedObj.itemId)) {
              logger.info("Detected columnar format, transposing");

              const length = parsedObj.itemId.length;
              itemTimeline = [];

              for (let i = 0; i < length; i++) {
                itemTimeline.push({
                  itemId: parsedObj.itemId[i] as number,
                  timestamp: Array.isArray(parsedObj.timestamp)
                    ? (parsedObj.timestamp[i] as number)
                    : 0,
                  cost: Array.isArray(parsedObj.cost)
                    ? (parsedObj.cost[i] as number)
                    : 0,
                });
              }

              logger.info("Transposed successfully", {
                resultLength: itemTimeline.length,
              });
            } else if (Array.isArray(parsedObj.itemTimeline)) {
              itemTimeline = parsedObj.itemTimeline as ItemPurchase[];
            } else if (Array.isArray(parsedObj.items)) {
              itemTimeline = parsedObj.items as ItemPurchase[];
            } else if (Array.isArray(parsedObj.data)) {
              itemTimeline = parsedObj.data as ItemPurchase[];
            } else {
              logger.error("No array found in parsed object", {
                keys: Object.keys(parsedObj),
              });
              throw new Error(
                `Parsed itemTimeline is an object with keys: ${Object.keys(parsedObj).join(", ")}`
              );
            }
          } else {
            throw new Error(`Unexpected parsed type: ${typeof parsed}`);
          }
        } else if (Array.isArray(itemTimelineJson)) {
          itemTimeline = itemTimelineJson;
        } else if (itemTimelineJson && typeof itemTimelineJson === "object") {
          logger.info("itemTimelineJson is already an object", {
            keys: Object.keys(itemTimelineJson),
          });

          if (Array.isArray((itemTimelineJson as any).itemId)) {
            const length = (itemTimelineJson as any).itemId.length;
            itemTimeline = [];

            for (let i = 0; i < length; i++) {
              itemTimeline.push({
                itemId: (itemTimelineJson as any).itemId[i],
                timestamp: Array.isArray((itemTimelineJson as any).timestamp)
                  ? (itemTimelineJson as any).timestamp[i]
                  : 0,
                cost: Array.isArray((itemTimelineJson as any).cost)
                  ? (itemTimelineJson as any).cost[i]
                  : 0,
              });
            }
          } else if (Array.isArray((itemTimelineJson as any).itemTimeline)) {
            itemTimeline = (itemTimelineJson as any).itemTimeline;
          } else if (Array.isArray((itemTimelineJson as any).items)) {
            itemTimeline = (itemTimelineJson as any).items;
          } else if (Array.isArray((itemTimelineJson as any).data)) {
            itemTimeline = (itemTimelineJson as any).data;
          } else {
            throw new Error(
              `Object has no array property. Keys: ${Object.keys(itemTimelineJson).join(", ")}`
            );
          }
        } else {
          throw new Error(
            `Invalid itemTimelineJson type: ${typeof itemTimelineJson}`
          );
        }
      } catch (parseError: any) {
        logger.error("Failed to parse itemTimelineJson", {
          error: parseError.message,
          stack: parseError.stack,
          rawType: typeof itemTimelineJson,
          rawLength:
            typeof itemTimelineJson === "string"
              ? itemTimelineJson.length
              : null,
        });
        throw parseError;
      }

      // ============ PARSE GOLD PER MINUTE ============
      try {
        if (typeof goldPerMinuteJson === "string") {
          let cleaned = goldPerMinuteJson.trim();

          // Handle concatenated JSON objects
          if (cleaned.startsWith("{") && !cleaned.startsWith("[")) {
            logger.info("Detected concatenated JSON in goldPerMinute");

            if (!cleaned.endsWith("}")) {
              const lastCompleteObject = cleaned.lastIndexOf("}");
              if (lastCompleteObject !== -1) {
                cleaned = cleaned.substring(0, lastCompleteObject + 1);
              }
            }
            cleaned = `[${cleaned}]`;
          }

          const parsed = JSON.parse(cleaned);

          logger.info("Successfully parsed goldPerMinute", {
            type: typeof parsed,
            isArray: Array.isArray(parsed),
          });

          if (Array.isArray(parsed)) {
            goldPerMinute = parsed;
          } else if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed.goldPerMinute)) {
              goldPerMinute = parsed.goldPerMinute;
            } else if (Array.isArray(parsed.data)) {
              goldPerMinute = parsed.data;
            } else if (Array.isArray(parsed.gold)) {
              goldPerMinute = parsed.gold;
            } else {
              throw new Error(
                `Parsed goldPerMinute is an object with keys: ${Object.keys(parsed).join(", ")}`
              );
            }
          } else {
            throw new Error(`Unexpected parsed type: ${typeof parsed}`);
          }
        } else if (Array.isArray(goldPerMinuteJson)) {
          goldPerMinute = goldPerMinuteJson;
        } else if (goldPerMinuteJson && typeof goldPerMinuteJson === "object") {
          if (Array.isArray((goldPerMinuteJson as any).goldPerMinute)) {
            goldPerMinute = (goldPerMinuteJson as any).goldPerMinute;
          } else if (Array.isArray((goldPerMinuteJson as any).data)) {
            goldPerMinute = (goldPerMinuteJson as any).data;
          } else if (Array.isArray((goldPerMinuteJson as any).gold)) {
            goldPerMinute = (goldPerMinuteJson as any).gold;
          } else {
            throw new Error(
              `Object has no array property. Keys: ${Object.keys(goldPerMinuteJson).join(", ")}`
            );
          }
        } else {
          throw new Error(
            `Invalid goldPerMinuteJson type: ${typeof goldPerMinuteJson}`
          );
        }
      } catch (parseError: any) {
        logger.error("Failed to parse goldPerMinuteJson", {
          error: parseError.message,
          stack: parseError.stack,
          rawType: typeof goldPerMinuteJson,
        });
        throw parseError;
      }

      // ============ VALIDATE ARRAYS ============
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

      // ============ CALCULATE BUILD EFFICIENCY ============
      // Filter major items (cost >= 1000 gold)
      const majorItems = itemTimeline.filter((item: any) => item.cost >= 1000);

      // Calculate power spike timings
      const powerSpikes = majorItems.map((item: any, index: number) => ({
        itemNumber: index + 1,
        timestamp: item.timestamp,
        minute: Math.floor(item.timestamp / 60_000),
        itemId: item.itemId || 0,
      }));

      // Calculate gold efficiency
      const totalGold = goldPerMinute.reduce(
        (sum: number, gold: number) => sum + gold,
        0
      );
      const goldSpent = itemTimeline.reduce(
        (sum: number, item: any) => sum + item.cost,
        0
      );
      const efficiency = totalGold > 0 ? (goldSpent / totalGold) * 100 : 0;

      // Calculate average time between major items
      const avgMinutesBetweenItems =
        majorItems.length > 1
          ? (majorItems.at(-1).timestamp - majorItems[0].timestamp) /
            (majorItems.length - 1) /
            60_000
          : 0;

      const result = {
        efficiency: `${efficiency.toFixed(2)}%`,
        powerSpikes,
        avgTimeBetweenMajorItems: `${avgMinutesBetweenItems.toFixed(1)} minutes`,
        totalGold,
        goldSpent,
        itemsPurchased: itemTimeline.length,
        majorItemsPurchased: majorItems.length,
      };

      tracer.putMetadata("buildEfficiency", result);
      logger.info("Build efficiency analyzed successfully", {
        efficiency: result.efficiency,
        powerSpikeCount: powerSpikes.length,
      });

      return result;
    } catch (error: any) {
      logger.error("Error analyzing build efficiency", {
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
      });

      // Return a user-friendly error response instead of throwing
      return {
        error: `Build analysis failed: ${error.message}`,
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

/**
 * Tool: Get Optimal Build From Meta
 *
 * Retrieves optimal build recommendations from third-party meta sources (U.GG, OP.GG).
 * TODO: Integrate with externalAPIClient once implemented in Task 11.5
 */
app.tool<{ championName: string; role: string; rank: string }>(
  async ({ championName, role, rank }) => {
    logger.info("Fetching optimal build from meta", {
      championName,
      role,
      rank,
    });

    try {
      // TODO: Replace with actual external API call
      // const metaData = await externalAPIClient.getBuildMetaFromUGG(championName, role, rank);

      // Placeholder response structure
      const result = {
        championName,
        role,
        rank,
        optimalBuild: {
          coreItems: [3078, 3031, 3094], // Placeholder item IDs
          boots: 3006,
          situationalItems: [3036, 3033, 3072],
          startingItems: [1055, 2003, 2003],
        },
        winRate: "52.3%",
        sampleSize: 15_420,
        patch: "14.1",
        reasoning:
          "Meta build based on highest win rate across 15,420 games in current patch",
        note: "TODO: Integration with U.GG API pending (Task 11.5)",
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
 * TODO: Integrate with externalAPIClient once implemented in Task 11.5
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
      // TODO: Replace with actual external API call
      // const metaBuild = await externalAPIClient.getBuildMetaFromUGG(championName, role);

      // Placeholder meta build
      const metaBuild = [3078, 3031, 3094, 3006];

      // Calculate build similarity
      const matchingItems = playerItems.filter((item) =>
        metaBuild.includes(item)
      );
      const buildSimilarity = (matchingItems.length / metaBuild.length) * 100;

      const result = {
        championName,
        role,
        playerBuild: playerItems,
        metaBuild,
        matchingItems,
        buildSimilarity: `${buildSimilarity.toFixed(1)}%`,
        deviations: playerItems.filter((item) => !metaBuild.includes(item)),
        missingMetaItems: metaBuild.filter(
          (item) => !playerItems.includes(item)
        ),
        recommendation:
          buildSimilarity >= 75
            ? "Build closely follows meta recommendations"
            : "Consider incorporating more meta-optimal items",
        note: "TODO: Integration with U.GG API pending (Task 11.5)",
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
 * TODO: Integrate with externalAPIClient once implemented in Task 11.5
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
      // TODO: Replace with actual external API call
      // const counterData = await externalAPIClient.getCounterBuildsFromOPGG(championName, enemyChampions, role);

      const result = {
        championName,
        role,
        enemyChampions,
        counterItems: [
          {
            itemId: 3156,
            reason: "QSS for CC-heavy composition",
            priority: "High",
          },
          {
            itemId: 3026,
            reason: "Guardian Angel for survivability",
            priority: "Medium",
          },
          {
            itemId: 3033,
            reason: "Mortal Reminder for healing reduction",
            priority: "High",
          },
        ],
        buildPath: {
          early: [3006, 3078],
          mid: [3031, 3156],
          late: [3094, 3033],
        },
        matchupSpecific: {
          vsAP: "Consider Maw of Malmortius if facing heavy AP damage",
          vsAD: "Prioritize armor items like Plated Steelcaps",
          vsHealing: "Rush Grievous Wounds items",
        },
        note: "TODO: Integration with OP.GG API pending (Task 11.5)",
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
 * TODO: Integrate with externalAPIClient once implemented in Task 11.5
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
      const adaptationRate = (uniqueBuilds.size / matchHistory.length) * 100;

      // Check for situational item usage
      const situationalItems = [3156, 3033, 3026, 3139]; // QSS, Mortal Reminder, GA, Mercurial
      const situationalItemUsage = matchHistory.filter((m) =>
        m.items.some((item) => situationalItems.includes(item))
      ).length;

      const result = {
        totalMatches: matchHistory.length,
        uniqueBuilds: uniqueBuilds.size,
        adaptationRate: `${adaptationRate.toFixed(1)}%`,
        situationalItemUsage: {
          count: situationalItemUsage,
          percentage:
            ((situationalItemUsage / matchHistory.length) * 100).toFixed(1) +
            "%",
        },
        rating:
          adaptationRate >= 60
            ? "Flexible"
            : adaptationRate >= 40
              ? "Moderate"
              : "Rigid",
        recommendation:
          adaptationRate < 40
            ? "Consider adapting builds more based on enemy composition and game state"
            : "Good build flexibility - continue adapting to match conditions",
        note: "TODO: Enhanced analysis with meta comparison pending (Task 11.5)",
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
 * Calculates gold efficiency for specific items.
 * TODO: Integrate with Data Dragon for accurate item stats in Task 11.5
 */
app.tool<{ itemIdsJson: string }>(
  async ({ itemIdsJson }) => {
    const itemIds = JSON.parse(itemIdsJson) as number[];
    logger.info("Calculating item gold efficiency", {
      itemCount: itemIds.length,
    });

    try {
      // TODO: Replace with actual Data Dragon API call
      // const itemStats = await externalAPIClient.getItemsFromDataDragon(itemIds);

      // Placeholder efficiency calculations
      const efficiencyData = itemIds.map((itemId) => ({
        itemId,
        name: `Item ${itemId}`, // TODO: Get actual name from Data Dragon
        cost: 3000, // Placeholder
        goldEfficiency: "105%", // Placeholder
        stats: {
          attackDamage: 50,
          critChance: 20,
          attackSpeed: 15,
        },
        costEfficiency: "Gold efficient",
      }));

      const result = {
        items: efficiencyData,
        averageEfficiency: "103%",
        mostEfficient: efficiencyData[0],
        leastEfficient: efficiencyData.at(-1),
        note: "TODO: Integration with Data Dragon API pending (Task 11.5)",
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

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
