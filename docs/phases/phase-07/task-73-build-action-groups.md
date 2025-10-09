# Task 7.3: Implement Action Group Tools - Build Agent

**Status**: 🔄 Pending

## Overview

Implement the Build Analysis Action Group handler using AWS Lambda Powertools for TypeScript. This provides tools that the Bedrock Build Analysis Agent can invoke to retrieve and analyze build data.

---

## Key Concepts

### What are Action Groups?

Action Groups are **Lambda functions that act as tools** for Bedrock Agents. The agent decides when to call these tools based on its instructions and the user's query.

**Architecture**:
1. **Bedrock Agent** receives user request (e.g., "Analyze build for match X")
2. **Agent reasons** about which tools to use
3. **Agent invokes tools** via Action Group Lambda
4. **Tools return data** to the agent
5. **Agent synthesizes** final response using tool results

### Tools vs Direct Implementation

| **Aspect** | **Old (Direct Lambda)** | **New (Action Group Tools)** |
|------------|-------------------------|------------------------------|
| **Purpose** | Perform complete analysis | Provide data to AI agent |
| **Logic** | Complex analysis algorithms | Simple data retrieval |
| **Output** | Final recommendations | Raw/processed data |
| **Flexibility** | Fixed logic | Agent interprets data |

---

## Subtasks

### 7.3.1: Create build-tools.ts File

Create the action group handler file.

- [ ] Create `apps/aws/src/agents/action-groups/build-tools.ts`
- [ ] Import required dependencies
- [ ] Initialize Powertools Logger and Tracer
- [ ] Initialize BedrockAgentFunctionResolver

### 7.3.2: Implement getMatchBuildData Tool

Retrieve build and itemization data from DynamoDB.

- [ ] Define tool function with parameters: `matchId`, `puuid`
- [ ] Query MatchDataTable using composite key
- [ ] Extract build data from match record
- [ ] Return structured build information
- [ ] Add error handling for missing data

**Tool Output:**
```typescript
{
  matchId: string;
  puuid: string;
  items: number[];
  itemTimeline: Array<{ timestamp: number; itemId: number; cost: number }>;
  goldPerMinute: number[];
}
```

### 7.3.3: Implement analyzeBuildEfficiency Tool

Analyze build path efficiency and power spike timing.

- [ ] Accept parameters: `itemTimeline`, `goldPerMinute`
- [ ] Calculate major item purchase timings
- [ ] Compute gold efficiency percentage
- [ ] Identify power spike windows
- [ ] Calculate time between major items
- [ ] Return efficiency metrics

**Tool Output:**
```typescript
{
  efficiency: string;           // Percentage as string
  powerSpikes: Array<{
    itemNumber: number;
    timestamp: number;
    minute: number;
    itemId: number;
  }>;
  avgTimeBetweenMajorItems: string;
  totalGold: number;
  goldSpent: number;
  itemsPurchased: number;
}
```

### 7.3.4: Implement recommendItemAdaptations Tool

Generate situational item recommendations based on enemy composition.

- [ ] Accept parameters: `currentBuild`, `enemyChampions`
- [ ] Analyze enemy team composition (AP/AD heavy, healing)
- [ ] Generate contextual recommendations
- [ ] Return composition analysis and suggestions

**Tool Output:**
```typescript
{
  currentBuild: number[];
  enemyComposition: {
    apHeavy: boolean;
    adHeavy: boolean;
    healingPresent: boolean;
  };
  recommendations: string[];
}
```

### 7.3.5: Add Logging and Error Handling

Implement comprehensive logging and error handling.

- [ ] Log all tool invocations with parameters
- [ ] Add X-Ray tracing annotations
- [ ] Handle DynamoDB errors gracefully
- [ ] Return error objects for missing data
- [ ] Add metadata to traces for debugging

---

## Implementation

**File:** `apps/aws/src/agents/action-groups/build-tools.ts`

```typescript
import { BedrockAgentFunctionResolver } from '@aws-lambda-powertools/event-handler/bedrock-agent';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { Context } from 'aws-lambda';

const logger = new Logger({ serviceName: 'hexcore-build-tools' });
const tracer = new Tracer({ serviceName: 'hexcore-build-tools' });
const app = new BedrockAgentFunctionResolver({ logger });

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

// Tool: Get Match Build Data
app.tool<{ matchId: string; puuid: string }>(
  async ({ matchId, puuid }, { event, context }) => {
    logger.info('Fetching build data', { matchId, puuid });
    
    try {
      const result = await ddb.send(
        new GetCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Key: { dataKey: `${matchId}#${puuid}` },
        })
      );

      if (!result.Item) {
        return {
          error: 'Match data not found',
          matchId,
          puuid,
        };
      }

      const buildData = result.Item.build;
      
      tracer.putAnnotation('matchId', matchId);
      tracer.putMetadata('buildData', buildData);

      return {
        matchId,
        puuid,
        items: buildData?.items || [],
        itemTimeline: buildData?.itemTimeline || [],
        goldPerMinute: buildData?.goldPerMinute || [],
      };
    } catch (error) {
      logger.error('Error fetching build data', { error, matchId, puuid });
      throw error;
    }
  },
  {
    name: 'getMatchBuildData',
    description: 'Retrieve build and itemization data for a specific match',
  }
);

// Tool: Analyze Build Efficiency
app.tool<{ itemTimeline: Array<{ timestamp: number; itemId: number; cost: number }>; goldPerMinute: number[] }>(
  async ({ itemTimeline, goldPerMinute }, { event }) => {
    logger.info('Analyzing build efficiency');

    try {
      // Calculate power spike timings
      const majorItems = itemTimeline.filter(item => item.cost >= 1000);
      const powerSpikes = majorItems.map((item, index) => ({
        itemNumber: index + 1,
        timestamp: item.timestamp,
        minute: Math.floor(item.timestamp / 60000),
        itemId: item.itemId,
      }));

      // Calculate gold efficiency
      const totalGold = goldPerMinute.reduce((sum, gold) => sum + gold, 0);
      const goldSpent = itemTimeline.reduce((sum, item) => sum + item.cost, 0);
      const efficiency = (goldSpent / totalGold) * 100;

      // Analyze item timing consistency
      const avgMinutesBetweenItems = majorItems.length > 1
        ? (majorItems[majorItems.length - 1].timestamp - majorItems[0].timestamp) / (majorItems.length - 1) / 60000
        : 0;

      return {
        efficiency: efficiency.toFixed(2),
        powerSpikes,
        avgTimeBetweenMajorItems: avgMinutesBetweenItems.toFixed(1),
        totalGold,
        goldSpent,
        itemsPurchased: itemTimeline.length,
      };
    } catch (error) {
      logger.error('Error analyzing build efficiency', { error });
      throw error;
    }
  },
  {
    name: 'analyzeBuildEfficiency',
    description: 'Analyze build path efficiency and optimization opportunities',
  }
);

// Tool: Recommend Item Adaptations
app.tool<{ currentBuild: number[]; enemyChampions: string[] }>(
  async ({ currentBuild, enemyChampions }, { event }) => {
    logger.info('Generating item recommendations', { currentBuild, enemyChampions });

    try {
      const recommendations: string[] = [];
      
      // Check for AP-heavy composition
      const apChampions = ['Syndra', 'Orianna', 'LeBlanc', 'Ahri', 'Viktor'];
      const apCount = enemyChampions.filter(champ => 
        apChampions.some(ap => champ.includes(ap))
      ).length;

      if (apCount >= 3) {
        recommendations.push('Consider building Magic Resist items early (Maw of Malmortius, Banshee\'s Veil)');
      }

      // Check for AD-heavy composition
      const adChampions = ['Jinx', 'Caitlyn', 'Draven', 'Zed', 'Talon'];
      const adCount = enemyChampions.filter(champ => 
        adChampions.some(ad => champ.includes(ad))
      ).length;

      if (adCount >= 3) {
        recommendations.push('Consider building Armor items (Randuin\'s Omen, Thornmail)');
      }

      // Check for healing champions
      const healChampions = ['Soraka', 'Yuumi', 'Sona', 'Vladimir', 'Aatrox'];
      const healCount = enemyChampions.filter(champ => 
        healChampions.some(heal => champ.includes(heal))
      ).length;

      if (healCount >= 2) {
        recommendations.push('Prioritize Grievous Wounds items (Mortal Reminder, Morellonomicon)');
      }

      return {
        currentBuild,
        enemyComposition: {
          apHeavy: apCount >= 3,
          adHeavy: adCount >= 3,
          healingPresent: healCount >= 2,
        },
        recommendations: recommendations.length > 0 
          ? recommendations 
          : ['Current build is well-adapted to enemy composition'],
      };
    } catch (error) {
      logger.error('Error generating recommendations', { error });
      throw error;
    }
  },
  {
    name: 'recommendItemAdaptations',
    description: 'Generate situational item recommendations based on enemy composition',
  }
);

export const handler = async (event: unknown, context: Context) =>
  app.resolve(event, context);
```

---

## Testing

### Unit Testing

Create test events to validate each tool:

```json
{
  "messageVersion": "1.0",
  "agent": {
    "name": "HexCore-BuildAnalysisAgent",
    "id": "AGENT_ID",
    "alias": "TSTALIASID"
  },
  "actionGroup": "BuildAnalysisTools",
  "function": "getMatchBuildData",
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

- [ ] All tools respond with correct data structure
- [ ] Error handling works for missing data
- [ ] DynamoDB queries use correct key format
- [ ] Logging includes all parameters
- [ ] Tracer annotations added
- [ ] Tools return within timeout limits

---

## Next Steps

After completing this task:
1. Implement remaining action groups (tasks 7.4-7.8)

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 1218-1401
- [AWS Powertools Bedrock Agent Resolver](https://docs.powertools.aws.dev/lambda/typescript/latest/core/event-handler/#bedrock-agents)
- [Task 7.1: Original Build Agent](./task-71-implement-build-agent.md) - For comparison
