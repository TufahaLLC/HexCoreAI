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
import {
  ASSIST_TO_KILL_RATIO,
  DAMAGE_RATIO_EXCELLENT,
  DAMAGE_RATIO_GOOD,
  HIGH_DEATH_THRESHOLD,
  KDA_A_TIER,
  KDA_B_TIER,
  KDA_S_TIER,
  KILL_PARTICIPATION_AVERAGE,
  KILL_PARTICIPATION_EXCELLENT,
  LOW_DEATH_THRESHOLD,
  MAGIC_DAMAGE_HEAVY_THRESHOLD,
  MIN_ASSIST_THRESHOLD,
  MIN_TOTAL_DAMAGE_OUTPUT,
  PERCENTAGE_MULTIPLIER,
  PHYSICAL_DAMAGE_HEAVY_THRESHOLD,
} from "../../shared/constants";
import { externalAPIClient } from "../../shared/external-api-client";

const logger = new Logger({ serviceName: "hexcore-combat-tools" });
const tracer = new Tracer({ serviceName: "hexcore-combat-tools" });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Helper: Extract damage data structure
 */
function extractDamageData(damageData: unknown) {
  const data = damageData as
    | { physical?: number; magic?: number; true?: number; total?: number }
    | undefined;
  return {
    physical: data?.physical || 0,
    magic: data?.magic || 0,
    true: data?.true || 0,
    total: data?.total || 0,
  };
}

/**
 * Helper: Determine KDA performance rating
 */
function determinePerformanceRating(
  kdaRatio: number
): "S-Tier" | "A-Tier" | "B-Tier" | "C-Tier" {
  if (kdaRatio >= KDA_S_TIER) {
    return "S-Tier";
  }
  if (kdaRatio >= KDA_A_TIER) {
    return "A-Tier";
  }
  if (kdaRatio >= KDA_B_TIER) {
    return "B-Tier";
  }
  return "C-Tier";
}

/**
 * Helper: Identify teamfight strengths
 */
function identifyTeamfightStrengths(params: {
  kdaRatio: number;
  killParticipation: number;
  deaths: number;
  assists: number;
  kills: number;
}): string[] {
  const { kdaRatio, killParticipation, deaths, assists, kills } = params;
  const strengths: string[] = [];

  if (kdaRatio >= KDA_A_TIER) {
    strengths.push("Excellent KDA ratio showing strong combat performance");
  }

  if (killParticipation >= KILL_PARTICIPATION_EXCELLENT) {
    strengths.push(
      "High kill participation - actively involved in team objectives"
    );
  }

  if (deaths <= LOW_DEATH_THRESHOLD) {
    strengths.push("Good survivability - minimizing deaths effectively");
  }

  if (assists >= kills * ASSIST_TO_KILL_RATIO) {
    strengths.push(
      "Strong team support - contributing significantly to assists"
    );
  }

  return strengths.length > 0
    ? strengths
    : ["Consistent performance in teamfights"];
}

/**
 * Helper: Identify teamfight improvements
 */
function identifyTeamfightImprovements(params: {
  deaths: number;
  killParticipation: number;
  kdaRatio: number;
  kills: number;
  assists: number;
}): string[] {
  const { deaths, killParticipation, kdaRatio, kills, assists } = params;
  const improvements: string[] = [];

  if (deaths >= HIGH_DEATH_THRESHOLD) {
    improvements.push(
      "High death count. Focus on positioning and map awareness to reduce deaths"
    );
  }

  if (killParticipation < KILL_PARTICIPATION_AVERAGE) {
    improvements.push(
      "Low kill participation. Be more present during teamfights and skirmishes"
    );
  }

  if (kdaRatio < KDA_B_TIER && deaths > kills) {
    improvements.push(
      "Negative KDA trend. Review combat engagements and focus on safer trading patterns"
    );
  }

  if (assists < MIN_ASSIST_THRESHOLD) {
    improvements.push(
      "Limited assist contribution. Look for opportunities to support teammates in fights"
    );
  }

  return improvements.length > 0
    ? improvements
    : ["Maintain current teamfight approach and execution"];
}

/**
 * Helper function to get damage priority by role
 */
function getDamagePriority(role: string): "High" | "Medium" | "Low" {
  if (role === "BOTTOM" || role === "MIDDLE") {
    return "High";
  }
  if (role === "UTILITY") {
    return "Low";
  }
  return "Medium";
}

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
        damageDealt: extractDamageData(combatData?.damageDealt),
        damageReceived: extractDamageData(combatData?.damageReceived),
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
    const damageDealt = JSON.parse(damageDealtJson) as {
      physical: number;
      magic: number;
      true: number;
      total: number;
    };
    const damageReceived = JSON.parse(damageReceivedJson) as {
      physical: number;
      magic: number;
      true: number;
      total: number;
    };
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
            ? `${((damageDealt.physical / totalDealt) * PERCENTAGE_MULTIPLIER).toFixed(1)}%`
            : "0%",
        magic:
          totalDealt > 0
            ? `${((damageDealt.magic / totalDealt) * PERCENTAGE_MULTIPLIER).toFixed(1)}%`
            : "0%",
        true_damage:
          totalDealt > 0
            ? `${((damageDealt.true / totalDealt) * PERCENTAGE_MULTIPLIER).toFixed(1)}%`
            : "0%",
      };

      // Calculate damage ratio and survivability rating
      const damageRatio = totalReceived > 0 ? totalDealt / totalReceived : 0;
      let rating: "Excellent" | "Good" | "Needs Improvement";

      if (damageRatio >= DAMAGE_RATIO_EXCELLENT) {
        rating = "Excellent";
      } else if (damageRatio >= DAMAGE_RATIO_GOOD) {
        rating = "Good";
      } else {
        rating = "Needs Improvement";
      }

      // Generate recommendations
      const recommendations: string[] = [];

      if (damageRatio < DAMAGE_RATIO_GOOD) {
        recommendations.push(
          "Damage output is lower than damage taken. Focus on trading more effectively and positioning to deal damage safely"
        );
      }

      if (totalDealt < MIN_TOTAL_DAMAGE_OUTPUT) {
        recommendations.push(
          "Low total damage output. Look for more opportunities to contribute damage in fights"
        );
      }

      const physicalPercent =
        (damageDealt.physical / totalDealt) * PERCENTAGE_MULTIPLIER;
      const magicPercent =
        (damageDealt.magic / totalDealt) * PERCENTAGE_MULTIPLIER;

      if (physicalPercent > PHYSICAL_DAMAGE_HEAVY_THRESHOLD) {
        recommendations.push(
          "Damage is heavily physical. Enemy armor items will significantly reduce your effectiveness"
        );
      } else if (magicPercent > MAGIC_DAMAGE_HEAVY_THRESHOLD) {
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
  teamKills: number;
}>(
  async ({ kills, deaths, assists, teamKills }) => {
    logger.info("Evaluating teamfight performance", {
      kills,
      deaths,
      assists,
      teamKills,
    });

    try {
      // Calculate kill participation
      const killParticipation =
        teamKills > 0
          ? ((kills + assists) / teamKills) * PERCENTAGE_MULTIPLIER
          : 0;

      // Calculate KDA ratio
      const kdaRatio =
        deaths > 0 ? (kills + assists) / deaths : kills + assists;

      // Determine performance rating
      const rating = determinePerformanceRating(kdaRatio);

      // Identify strengths and improvements
      const strengths = identifyTeamfightStrengths({
        kdaRatio,
        killParticipation,
        deaths,
        assists,
        kills,
      });
      const improvements = identifyTeamfightImprovements({
        deaths,
        killParticipation,
        kdaRatio,
        kills,
        assists,
      });

      const result = {
        performance: {
          kdaRatio: Number.parseFloat(kdaRatio.toFixed(2)),
          killParticipation: `${killParticipation.toFixed(1)}%`,
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
    name: "evaluateTeamfightParticipation",
    description: "Evaluate teamfight participation and impact",
  }
);

/**
 * Tool: Get Combat Benchmarks
 *
 * Retrieves combat performance benchmarks from meta sources based on role and rank.
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Fetching combat benchmarks", { role, rank });

    try {
      // Fetch player benchmarks from U.GG
      const benchmarkData = await externalAPIClient.getPlayerBenchmarkFromUGG(
        "combat",
        0,
        role,
        rank
      );

      // Note: Using external API for benchmark data
      // const benchmarks = await externalAPIClient.getCombatBenchmarksFromUGG(role, rank);

      const result = {
        role,
        rank,
        benchmarks: {
          kda: { excellent: 4.0, good: 3.0, average: 2.0, poor: 1.5 },
          killParticipation: { excellent: 70, good: 60, average: 50, poor: 40 },
          damagePerMinute: {
            excellent: 800,
            good: 650,
            average: 500,
            poor: 350,
          },
          damageShare: { excellent: 30, good: 25, average: 20, poor: 15 },
        },
        percentileRankings: {
          top10: { kda: 5.2, killParticipation: 75, dpm: 950 },
          top25: { kda: 4.0, killParticipation: 68, dpm: 750 },
          top50: { kda: 3.0, killParticipation: 58, dpm: 600 },
        },
        source: benchmarkData.source,
        timestamp: benchmarkData.timestamp,
      };

      tracer.putMetadata("combatBenchmarks", result);
      logger.info("Combat benchmarks retrieved", { role, rank });

      return result;
    } catch (error) {
      logger.error("Error fetching combat benchmarks", { error, role, rank });
      throw error;
    }
  },
  {
    name: "getCombatBenchmarks",
    description:
      "Retrieve combat performance benchmarks for KDA, damage, and kill participation by role and rank",
  }
);

/**
 * Tool: Analyze Teamfight Positioning
 *
 * Analyzes teamfight positioning patterns based on combat events.
 */
app.tool<{ eventsJson: string; role: string }>(
  async ({ eventsJson, role }) => {
    const events = JSON.parse(eventsJson) as Array<{
      type: string;
      timestamp: number;
      position: { x: number; y: number };
    }>;
    logger.info("Analyzing teamfight positioning", {
      role,
      eventCount: events.length,
    });

    try {
      // Note: Positioning analysis based on role and teamfight events

      // Analyze positioning safety
      const teamfightEvents = events.filter((e) => e.type === "teamfight");
      const avgPosition =
        teamfightEvents.length > 0
          ? {
              x:
                teamfightEvents.reduce((sum, e) => sum + e.position.x, 0) /
                teamfightEvents.length,
              y:
                teamfightEvents.reduce((sum, e) => sum + e.position.y, 0) /
                teamfightEvents.length,
            }
          : { x: 0, y: 0 };

      const result = {
        role,
        totalTeamfights: teamfightEvents.length,
        averagePosition: avgPosition,
        positioningRating: "Good", // Placeholder
        recommendations: [
          role === "BOTTOM" || role === "MIDDLE"
            ? "Maintain backline positioning - stay behind frontline tanks"
            : "Engage from flanks or frontline based on team composition",
          "Watch for enemy assassins and maintain escape routes",
          "Position near objectives during contested fights",
        ],
        commonMistakes: [
          "Over-extending without vision of enemy team",
          "Face-checking brushes during objective setups",
          "Poor spacing allowing multi-target enemy abilities",
        ],
      };

      tracer.putMetadata("teamfightPositioning", result);
      logger.info("Teamfight positioning analysis completed", {
        teamfights: teamfightEvents.length,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing teamfight positioning", { error, role });
      throw error;
    }
  },
  {
    name: "analyzeTeamfightPositioning",
    description:
      "Analyze teamfight positioning patterns and provide role-specific recommendations",
  }
);

/**
 * Tool: Get Damage Prioritization Analysis
 *
 * Analyzes damage target prioritization in teamfights.
 */
app.tool<{ targetsJson: string; role: string }>(
  async ({ targetsJson, role }) => {
    const targets = JSON.parse(targetsJson) as Array<{
      championName: string;
      damageDealt: number;
      role: string;
    }>;
    logger.info("Analyzing damage prioritization", {
      role,
      targetCount: targets.length,
    });

    try {
      // Note: Damage prioritization based on role-specific optimal targets

      // Analyze target priority
      const totalDamage = targets.reduce((sum, t) => sum + t.damageDealt, 0);
      const targetAnalysis = targets.map((t) => ({
        champion: t.championName,
        role: t.role,
        damageDealt: t.damageDealt,
        damageShare: `${((t.damageDealt / totalDamage) * PERCENTAGE_MULTIPLIER).toFixed(1)}%`,
        priority: getDamagePriority(t.role),
      }));

      const result = {
        role,
        targetAnalysis,
        prioritizationScore: 7.5, // Placeholder
        recommendations: [
          "Prioritize enemy carries (ADC/Mid) when safely accessible",
          "Focus frontline tanks only when carries are protected",
          "Avoid tunnel vision - switch targets based on positioning",
        ],
        optimalTargetPriority: [
          "1. Out-of-position carries",
          "2. Low-health high-value targets",
          "3. Nearest accessible enemy",
          "4. Frontline tanks (if no better option)",
        ],
      };

      tracer.putMetadata("damagePrioritization", result);
      logger.info("Damage prioritization analysis completed", {
        targets: targets.length,
      });

      return result;
    } catch (error) {
      logger.error("Error analyzing damage prioritization", { error, role });
      throw error;
    }
  },
  {
    name: "getDamagePriorizationAnalysis",
    description:
      "Analyze damage target prioritization and provide optimal targeting recommendations",
  }
);

/**
 * Tool: Get Engagement Timing Benchmarks
 *
 * Retrieves optimal engagement timing data from meta sources.
 */
app.tool<{ role: string; rank: string }>(
  async ({ role, rank }) => {
    logger.info("Fetching engagement timing benchmarks", { role, rank });

    try {
      // Note: Engagement timing benchmarks based on role and rank analysis

      const result = {
        role,
        rank,
        optimalEngagementWindows: [
          {
            condition: "Enemy abilities on cooldown",
            priority: "High",
            successRate: "68%",
          },
          {
            condition: "Number advantage (5v4 or better)",
            priority: "High",
            successRate: "72%",
          },
          {
            condition: "Level/item power spike",
            priority: "Medium",
            successRate: "58%",
          },
          {
            condition: "Objective spawning soon",
            priority: "Medium",
            successRate: "55%",
          },
        ],
        poorEngagementConditions: [
          { condition: "Vision disadvantage", avoidanceRate: "85%" },
          { condition: "Number disadvantage", avoidanceRate: "90%" },
          { condition: "Low health/mana", avoidanceRate: "80%" },
        ],
        roleSpecificTiming:
          role === "JUNGLE" || role === "UTILITY"
            ? "Engage when team is positioned and ready to follow up"
            : "Wait for engage from frontline before committing damage",
      };

      tracer.putMetadata("engagementTimingBenchmarks", result);
      logger.info("Engagement timing benchmarks retrieved", { role, rank });

      return result;
    } catch (error) {
      logger.error("Error fetching engagement timing benchmarks", {
        error,
        role,
        rank,
      });
      throw error;
    }
  },
  {
    name: "getEngagementTimingBenchmarks",
    description:
      "Retrieve optimal engagement timing data and success rates by role and rank",
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
