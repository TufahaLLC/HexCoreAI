# Task 7.4: Implement Action Group Tools - Combat Agent

**Status**: ✅ Completed

## Overview

Implement the Combat Analysis Action Group handler using AWS Lambda Powertools for TypeScript. This provides tools for analyzing combat performance, damage patterns, and teamfight effectiveness.

---

## Subtasks

### 7.4.1: Create combat-tools.ts File

- [x] Create `apps/aws/src/agents/action-groups/combat-tools.ts`
- [x] Import AWS Powertools dependencies
- [x] Initialize Logger, Tracer, and BedrockAgentFunctionResolver
- [x] Set up DynamoDB client

### 7.4.2: Implement getMatchCombatData Tool

Retrieve combat statistics from DynamoDB.

- [x] Define tool with parameters: `matchId`, `puuid`
- [x] Query MatchDataTable for combat data
- [x] Extract KDA, damage dealt/received
- [x] Return structured combat information

**Tool Output:**

```typescript
{
  matchId: string;
  puuid: string;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: {
    physical: number;
    magic: number;
    true: number;
    total: number;
  };
  damageReceived: {
    physical: number;
    magic: number;
    true: number;
    total: number;
  };
}
```

### 7.4.3: Implement analyzeDamageOutput Tool

Analyze damage patterns and combat effectiveness.

- [x] Accept damage dealt and received objects
- [x] Calculate damage ratio (dealt/received)
- [x] Compute damage type breakdown percentages
- [x] Evaluate survivability rating
- [x] Generate damage recommendations

**Tool Output:**

```typescript
{
  totalDamageDealt: number;
  totalDamageReceived: number;
  damageBreakdown: {
    physical: string;    // Percentage
    magic: string;       // Percentage
    true_damage: string; // Percentage
  };
  survivability: {
    damageRatio: string;
    rating: 'Excellent' | 'Good' | 'Needs Improvement';
  };
  recommendations: string[];
}
```

### 7.4.4: Implement evaluateTeamfightPerformance Tool

Evaluate player performance in teamfights.

- [x] Accept KDA object and kill participation percentage
- [x] Calculate KDA ratio
- [x] Determine performance rating
- [x] Identify strengths and improvement areas

**Tool Output:**

```typescript
{
  performance: {
    kdaRatio: number;
    killParticipation: string;
    rating: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier';
  };
  strengths: string[];
  improvements: string[];
}
```

---

## Implementation

**File:** `apps/aws/src/agents/action-groups/combat-tools.ts`

```typescript
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

// Tool: Get Match Combat Data
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }, { event }) => {
    logger.info("Fetching combat data", { matchId, puuid });

    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `${matchId}#${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: "Match data not found",
          matchId,
          puuid,
        };
      }

      const combatData = result.Item.combat;

      return {
        matchId,
        puuid,
        kills: combatData?.kills || 0,
        deaths: combatData?.deaths || 0,
        assists: combatData?.assists || 0,
        damageDealt: combatData?.damageDealt || {},
        damageReceived: combatData?.damageReceived || {},
      };
    } catch (error) {
      logger.error("Error fetching combat data", { error });
      throw error;
    }
  },
  {
    name: "getMatchCombatData",
    description: "Retrieve combat statistics for a specific match",
  }
);

// Tool: Analyze Damage Output
app.tool<{
  damageDealt: { physical: number; magic: number; true: number; total: number };
  damageReceived: {
    physical: number;
    magic: number;
    true: number;
    total: number;
  };
}>(
  async ({ damageDealt, damageReceived }, { event }) => {
    logger.info("Analyzing damage output");

    try {
      const damageRatio = damageDealt.total / (damageReceived.total || 1);

      const damageBreakdown = {
        physical: ((damageDealt.physical / damageDealt.total) * 100).toFixed(1),
        magic: ((damageDealt.magic / damageDealt.total) * 100).toFixed(1),
        true_damage: ((damageDealt.true / damageDealt.total) * 100).toFixed(1),
      };

      const survivability = {
        damageRatio: damageRatio.toFixed(2),
        rating:
          damageRatio > 1.5
            ? "Excellent"
            : damageRatio > 1.0
            ? "Good"
            : "Needs Improvement",
      };

      return {
        totalDamageDealt: damageDealt.total,
        totalDamageReceived: damageReceived.total,
        damageBreakdown,
        survivability,
        recommendations: generateDamageRecommendations(
          damageDealt,
          damageReceived
        ),
      };
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

// Tool: Evaluate Teamfight Performance
app.tool<{
  kda: { kills: number; deaths: number; assists: number };
  killParticipation: number;
}>(
  async ({ kda, killParticipation }, { event }) => {
    logger.info("Evaluating teamfight performance");

    try {
      const kdaRatio = (
        (kda.kills + kda.assists) /
        Math.max(kda.deaths, 1)
      ).toFixed(2);

      const performance = {
        kdaRatio: parseFloat(kdaRatio),
        killParticipation: killParticipation.toFixed(1),
        rating: getPerformanceRating(parseFloat(kdaRatio), killParticipation),
      };

      const strengths = [];
      const improvements = [];

      if (killParticipation >= 70) {
        strengths.push("High kill participation - excellent team presence");
      } else if (killParticipation < 50) {
        improvements.push("Increase involvement in team kills");
      }

      if (parseFloat(kdaRatio) >= 3.0) {
        strengths.push("Excellent KDA ratio - strong combat effectiveness");
      } else if (parseFloat(kdaRatio) < 2.0) {
        improvements.push(
          "Focus on reducing deaths and improving survivability"
        );
      }

      return {
        performance,
        strengths,
        improvements,
      };
    } catch (error) {
      logger.error("Error evaluating teamfight performance", { error });
      throw error;
    }
  },
  {
    name: "evaluateTeamfightPerformance",
    description: "Evaluate player performance in teamfights",
  }
);

function generateDamageRecommendations(
  damageDealt: { physical: number; magic: number; true: number; total: number },
  damageReceived: {
    physical: number;
    magic: number;
    true: number;
    total: number;
  }
): string[] {
  const recommendations: string[] = [];

  const damageRatio = damageDealt.total / (damageReceived.total || 1);

  if (damageRatio < 1.0) {
    recommendations.push(
      "Focus on improving positioning to increase damage output while reducing damage taken"
    );
  }

  if (damageReceived.total > damageDealt.total * 1.5) {
    recommendations.push(
      "Consider building defensive items earlier to improve survivability"
    );
  }

  return recommendations;
}

function getPerformanceRating(
  kdaRatio: number,
  killParticipation: number
): string {
  if (kdaRatio >= 3.0 && killParticipation >= 70) return "S-Tier";
  if (kdaRatio >= 2.5 && killParticipation >= 60) return "A-Tier";
  if (kdaRatio >= 2.0 && killParticipation >= 50) return "B-Tier";
  return "C-Tier";
}

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
```

---

## Testing

### Test Event Example

```json
{
  "messageVersion": "1.0",
  "agent": {
    "name": "HexCore-CombatAnalysisAgent",
    "id": "AGENT_ID",
    "alias": "TSTALIASID"
  },
  "actionGroup": "CombatAnalysisTools",
  "function": "getMatchCombatData",
  "parameters": [
    {
      "name": "matchId",
      "type": "string",
      "value": "NA1_4567890123"
    },
    {
      "name": "puuid",
      "type": "string",
      "value": "test-puuid-123"
    }
  ]
}
```

### Validation Checklist

- [x] All 3 tools respond correctly
- [x] DynamoDB queries work
- [x] Damage calculations accurate
- [x] KDA ratio computed correctly
- [x] Performance ratings assigned properly
- [x] Logging includes all parameters
- [x] Error handling works for missing data

---

## Next Steps

After completing this task:

1. Proceed to [Task 7.11: Vision Action Groups](./task-711-vision-action-groups.md)
2. Continue with remaining action group implementations

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 1403-1590
- [Task 7.2: Original Combat Agent](./task-72-implement-combat-agent.md) - For comparison
