# Task 3.1: Create TypeScript Type Definitions ✅

Define all TypeScript interfaces for type safety across the application.

**Note**: This task has been updated to use a hybrid approach with Zod schemas (from Phase 2, Task 2.11). External input/output types are now validated using Zod schemas, while internal data structures use plain TypeScript types.

**Subtasks:**
- [x] Create `src/shared/types.ts` file
- [x] Re-export validated types from `schemas.ts` (Zod-inferred)
  - [x] `SQSMatchMessage` (from Zod)
  - [x] `EventBridgeMatchEvent` (from Zod)
  - [x] `WebSocketMessage` (from Zod)
  - [x] `AgentOrchestratorInput` (from Zod)
  - [x] `AgentAnalysisResult` (from Zod)
- [x] Define internal data types:
  - [x] `MatchData` interface
  - [x] `BuildData` interface
  - [x] `CombatData` interface
  - [x] `VisionData` interface
  - [x] `EconomyData` interface
  - [x] `ChampionMetaData` interface
  - [x] `ItemPurchase` interface
- [x] Define Riot API response types (external, no validation)
- [x] Define agent-specific analysis result types

## Architecture: Hybrid Type System

**Zod Schemas (`schemas.ts`)** - For external boundaries with runtime validation:
- Lambda event inputs (SQS, EventBridge, WebSocket)
- API responses sent to clients
- Inter-service communication
- Provides both runtime validation AND TypeScript types

**TypeScript Types (`types.ts`)** - For internal data structures:
- Riot API response types (external API, trusted source)
- Internal application data (DynamoDB items, processing data)
- Agent-specific analysis results
- No runtime overhead, compile-time type safety only

**src/shared/types.ts:**
```typescript
/**
 * HexCore AI - TypeScript Type Definitions
 * 
 * This file contains internal data structure types for the application.
 * For external input/output validation, see schemas.ts which uses Zod.
 */

// ============================================================================
// External Validated Types (from Zod schemas)
// ============================================================================
// Re-export Zod-inferred types for convenience

export type {
  SQSMatchMessage,
  EventBridgeMatchEvent,
  WebSocketMessage,
  AgentOrchestratorInput,
  AgentAnalysisResult,
  SynthesizerInput,
  ConnectionParams,
} from './schemas';

// Riot API Response Types
export type RiotMatchResponse = {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    participants: RiotParticipant[];
  };
};

export type RiotParticipant = {
  puuid: string;
  participantId: number;
  championName: string;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  goldEarned: number;
  goldSpent: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  wardsPlaced: number;
  wardsKilled: number;
  visionScore: number;
  physicalDamageDealtToChampions: number;
  magicDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  totalDamageDealtToChampions: number;
  physicalDamageTaken: number;
  magicDamageTaken: number;
  trueDamageTaken: number;
  totalDamageTaken: number;
};

export type RiotTimelineResponse = {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    frames: RiotTimelineFrame[];
  };
};

export type RiotTimelineFrame = {
  timestamp: number;
  participantFrames: Record<string, ParticipantFrame>;
  events: TimelineEvent[];
};

export type ParticipantFrame = {
  participantId: number;
  totalGold: number;
  level: number;
  currentGold: number;
};

export type TimelineEvent = {
  type: string;
  timestamp: number;
  participantId?: number;
  itemId?: number;
  cost?: number;
};

// Application Data Types
export type MatchData = {
  dataKey: string;
  matchId: string;
  puuid: string;
  build?: BuildData;
  combat?: CombatData;
  vision?: VisionData;
  economy?: EconomyData;
  championMeta?: ChampionMetaData;
  expiresAt: number;
};

export type BuildData = {
  items: number[];
  itemTimeline: ItemPurchase[];
  goldPerMinute: number[];
};

export type ItemPurchase = {
  timestamp: number;
  itemId?: number;
  cost: number;
};

export type CombatData = {
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: Record<string, number>;
  damageReceived: Record<string, number>;
};

export type VisionData = {
  wardsPlaced: number;
  wardsDestroyed: number;
  visionScore: number;
};

export type EconomyData = {
  totalGold: number;
  csPerMinute: number;
  goldEfficiency: number;
};

export type ChampionMetaData = {
  champion: string;
  role: string;
  tier: string;
  winRate: number;
};

// Agent Result Types
export type BuildAnalysisResult = {
  buildEfficiencyScore: number;
  preferredItems: number[];
  itemTiming: Array<{ itemId: number; minute: number }>;
  goldEfficiency: number;
  recommendations: string[];
}

export type CombatAnalysisResult = {
  kdaRatio: number;
  kills: number;
  deaths: number;
  assists: number;
  damageProfile: {
    totalDealt: number;
    totalReceived: number;
    damageRatio: number;
  };
  recommendations: string[];
}

export type VisionAnalysisResult = {
  visionScore: number;
  wardsPlaced: number;
  wardsDestroyed: number;
  visionEfficiency: number;
  recommendations: string[];
}

// Union type for all agent analysis results
export type AnyAgentAnalysisResult =
  | BuildAnalysisResult
  | CombatAnalysisResult
  | VisionAnalysisResult
  | EconomyAnalysisResult
  | ChampionAnalysisResult
  | CompetitiveAnalysisResult;
```

## Benefits of Hybrid Approach

1. **Runtime Safety at Boundaries**: Zod validates all external inputs (SQS, EventBridge, WebSocket) preventing malformed data from entering the system
2. **Performance**: Internal types have zero runtime overhead - only compile-time checking
3. **Single Source of Truth**: Import types from schemas.ts ensures consistency
4. **Developer Experience**: Get both runtime validation AND TypeScript autocomplete
5. **Maintainability**: Clear separation between validated external data and trusted internal data

## Usage Examples

**Lambda Function with Zod Validation:**
```typescript
import { sqsMatchMessageSchema, type SQSMatchMessage } from '../shared/schemas';
import type { MatchData } from '../shared/types';

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    // Runtime validation with Zod
    const message: SQSMatchMessage = sqsMatchMessageSchema.parse(
      JSON.parse(record.body)
    );
    
    // Use internal types for processing
    const matchData: MatchData = await processMatch(message);
  }
};
```

**Internal Processing (No Validation Needed):**
```typescript
import type { BuildData, CombatData, MatchData } from '../shared/types';

function analyzeMatch(data: MatchData): BuildData {
  // Internal processing - types only, no runtime validation
  return {
    items: data.build?.items || [],
    itemTimeline: [],
    goldPerMinute: [],
  };
}
```
