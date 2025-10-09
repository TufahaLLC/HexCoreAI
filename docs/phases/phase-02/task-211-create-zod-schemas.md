# Task 2.11: Create Zod Schemas for Type-Safe Validation ✅

Create the shared Zod schemas file that provides type-safe validation for all Lambda function inputs across the HexCore AI architecture.

## Overview

This task implements all Zod schemas defined in the [zod-schemas-reference.md](./zod-schemas-reference.md) document. These schemas are used with AWS Lambda Powertools Parser utility to ensure type safety and early validation.

## Subtasks

### 2.11.1: Create Schemas File Structure

- [x] Create `apps/aws/src/shared/schemas.ts` file
- [x] Import Zod library
- [x] Add file header documentation
- [x] Export all schemas and their inferred types

### 2.11.2: Define WebSocket Schemas

- [x] Create `connectionParamsSchema` for WebSocket query parameters
  - [x] sessionId: UUID validation
  - [x] puuid: non-empty string
  - [x] region: enum ['americas', 'europe', 'asia']
  - [x] year: 4-digit string regex
- [x] Export `ConnectionParams` type
- [x] Create `webSocketMessageSchema` for outgoing messages
  - [x] status: enum ['started', 'processing', 'completed', 'error']
  - [x] message: non-empty string
  - [x] progress: optional 0-100 integer
  - [x] agent: optional agent name enum
  - [x] data: optional record
  - [x] timestamp: optional positive integer
- [x] Export `WebSocketMessage` type

### 2.11.3: Define SQS Message Schema

- [x] Create `sqsMatchMessageSchema` for Match Queue messages
  - [x] matchId: non-empty string
  - [x] puuid: non-empty string
  - [x] region: enum ['americas', 'europe', 'asia']
  - [x] year: integer between 2020-2030
  - [x] sessionId: UUID validation
- [x] Export `SQSMatchMessage` type

### 2.11.4: Define EventBridge Schemas

- [x] Create `eventBridgeMatchEventSchema` for match processing events
  - [x] source: literal 'hexcore.match.processor'
  - [x] detail-type: literal 'match.filtered.ready'
  - [x] detail object with:
    - [x] keys: array of strings (min 1)
    - [x] sessionId: UUID
    - [x] matchId: non-empty string
    - [x] puuid: non-empty string
    - [x] region: enum
    - [x] year: integer
    - [x] schemaVersion: literal '1.0'
- [x] Export `EventBridgeMatchEvent` type

### 2.11.5: Define Agent Orchestrator Schemas

- [x] Create `agentOrchestratorInputSchema` for agent Lambda inputs
  - [x] keys: array of strings (min 1)
  - [x] sessionId: UUID
  - [x] matchId: non-empty string
  - [x] puuid: non-empty string
  - [x] region: optional enum
  - [x] year: optional integer
- [x] Export `AgentOrchestratorInput` type
- [x] Create `agentAnalysisResultSchema` for agent outputs
  - [x] agentName: enum of all 6 agent names
  - [x] status: enum ['success', 'failed', 'partial']
  - [x] analysis: non-empty string
  - [x] timestamp: positive integer
  - [x] metadata: optional object with tokensUsed, executionTimeMs, retryCount
- [x] Export `AgentAnalysisResult` type

### 2.11.6: Define Synthesizer Schemas

- [x] Create `synthesizerInputSchema` for aggregation input
  - [x] sessionId: UUID
  - [x] matchId: non-empty string
  - [x] puuid: non-empty string
  - [x] agentResults: array of agentAnalysisResultSchema (min 1)
- [x] Export `SynthesizerInput` type

### 2.11.7: Define Action Group Tool Schemas

- [x] Create `getMatchDataToolSchema`
  - [x] dataKey: non-empty string
- [x] Export `GetMatchDataTool` type
- [x] Create `getPlayerStatsToolSchema`
  - [x] puuid: non-empty string
  - [x] matchId: non-empty string
- [x] Export `GetPlayerStatsTool` type
- [x] Create `getChampionInfoToolSchema`
  - [x] championName: non-empty string
  - [x] matchId: non-empty string
- [x] Export `GetChampionInfoTool` type

### 2.1.8: Create Reusable Sub-Schemas

- [ ] Create `regionSchema` for reuse across schemas
- [ ] Create `sessionIdSchema` for UUID validation
- [ ] Create `agentNameSchema` for agent enum
- [ ] Add descriptive error messages to all schemas

## Implementation

**File:** `apps/aws/src/shared/schemas.ts`

```typescript
/**
 * Zod Schemas for Type-Safe Event Validation
 * 
 * This file defines all validation schemas used across HexCore AI Lambda functions.
 * These schemas are used with AWS Lambda Powertools Parser utility for early validation
 * and type safety.
 * 
 * @see docs/phases/phase-02/zod-schemas-reference.md
 */

import { z } from 'zod';

// ============================================================================
// Reusable Sub-Schemas
// ============================================================================

export const regionSchema = z.enum(['americas', 'europe', 'asia'], {
  errorMap: () => ({ message: 'Region must be americas, europe, or asia' }),
});

export const sessionIdSchema = z.string().uuid('Session ID must be a valid UUID');

export const agentNameSchema = z.enum([
  'BuildAgent',
  'CombatAgent',
  'VisionAgent',
  'EconomyAgent',
  'ChampionAgent',
  'CompetitiveAgent',
]);

// ============================================================================
// WebSocket Connection Parameters
// ============================================================================

export const connectionParamsSchema = z.object({
  sessionId: sessionIdSchema,
  puuid: z.string().min(1, 'PUUID is required'),
  region: regionSchema,
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
});

export type ConnectionParams = z.infer<typeof connectionParamsSchema>;

// ============================================================================
// SQS Match Message
// ============================================================================

export const sqsMatchMessageSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  puuid: z.string().min(1, 'PUUID is required'),
  region: regionSchema,
  year: z.number().int().min(2020).max(2030, 'Year must be between 2020 and 2030'),
  sessionId: sessionIdSchema,
});

export type SQSMatchMessage = z.infer<typeof sqsMatchMessageSchema>;

// ============================================================================
// EventBridge Match Event
// ============================================================================

export const eventBridgeMatchEventSchema = z.object({
  source: z.literal('hexcore.match.processor'),
  'detail-type': z.literal('match.filtered.ready'),
  detail: z.object({
    keys: z.array(z.string()).min(1, 'At least one data key is required'),
    sessionId: sessionIdSchema,
    matchId: z.string().min(1, 'Match ID is required'),
    puuid: z.string().min(1, 'PUUID is required'),
    region: regionSchema,
    year: z.number().int(),
    schemaVersion: z.literal('1.0'),
  }),
});

export type EventBridgeMatchEvent = z.infer<typeof eventBridgeMatchEventSchema>;

// ============================================================================
// Agent Orchestrator Input
// ============================================================================

export const agentOrchestratorInputSchema = z.object({
  keys: z.array(z.string()).min(1, 'At least one data key is required'),
  sessionId: sessionIdSchema,
  matchId: z.string().min(1, 'Match ID is required'),
  puuid: z.string().min(1, 'PUUID is required'),
  region: regionSchema.optional(),
  year: z.number().int().optional(),
});

export type AgentOrchestratorInput = z.infer<typeof agentOrchestratorInputSchema>;

// ============================================================================
// Agent Analysis Result
// ============================================================================

export const agentAnalysisResultSchema = z.object({
  agentName: agentNameSchema,
  status: z.enum(['success', 'failed', 'partial']),
  analysis: z.string().min(1, 'Analysis text is required'),
  timestamp: z.number().int().positive(),
  metadata: z
    .object({
      tokensUsed: z.number().int().optional(),
      executionTimeMs: z.number().int().optional(),
      retryCount: z.number().int().optional(),
    })
    .optional(),
});

export type AgentAnalysisResult = z.infer<typeof agentAnalysisResultSchema>;

// ============================================================================
// Synthesizer Input
// ============================================================================

export const synthesizerInputSchema = z.object({
  sessionId: sessionIdSchema,
  matchId: z.string().min(1, 'Match ID is required'),
  puuid: z.string().min(1, 'PUUID is required'),
  agentResults: z.array(agentAnalysisResultSchema).min(1, 'At least one agent result is required'),
});

export type SynthesizerInput = z.infer<typeof synthesizerInputSchema>;

// ============================================================================
// WebSocket Message Payload
// ============================================================================

export const webSocketMessageSchema = z.object({
  status: z.enum(['started', 'processing', 'completed', 'error']),
  message: z.string().min(1, 'Message is required'),
  progress: z.number().int().min(0).max(100).optional(),
  agent: z
    .enum([
      'BuildAgent',
      'CombatAgent',
      'VisionAgent',
      'EconomyAgent',
      'ChampionAgent',
      'CompetitiveAgent',
      'Synthesizer',
    ])
    .optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.number().int().positive().optional(),
});

export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;

// ============================================================================
// Bedrock Action Group Tool Parameters
// ============================================================================

export const getMatchDataToolSchema = z.object({
  dataKey: z.string().min(1, 'Data key is required'),
});

export type GetMatchDataTool = z.infer<typeof getMatchDataToolSchema>;

export const getPlayerStatsToolSchema = z.object({
  puuid: z.string().min(1, 'PUUID is required'),
  matchId: z.string().min(1, 'Match ID is required'),
});

export type GetPlayerStatsTool = z.infer<typeof getPlayerStatsToolSchema>;

export const getChampionInfoToolSchema = z.object({
  championName: z.string().min(1, 'Champion name is required'),
  matchId: z.string().min(1, 'Match ID is required'),
});

export type GetChampionInfoTool = z.infer<typeof getChampionInfoToolSchema>;
```

## Testing

### Unit Tests

Create `apps/aws/src/shared/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  connectionParamsSchema,
  sqsMatchMessageSchema,
  agentAnalysisResultSchema,
} from '../schemas';

describe('connectionParamsSchema', () => {
  it('should validate correct parameters', () => {
    const validParams = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      puuid: 'abc123',
      region: 'americas',
      year: '2024',
    };

    const result = connectionParamsSchema.safeParse(validParams);
    expect(result.success).toBe(true);
  });

  it('should reject invalid region', () => {
    const invalidParams = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      puuid: 'abc123',
      region: 'invalid',
      year: '2024',
    };

    const result = connectionParamsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID sessionId', () => {
    const invalidParams = {
      sessionId: 'not-a-uuid',
      puuid: 'abc123',
      region: 'americas',
      year: '2024',
    };

    const result = connectionParamsSchema.safeParse(invalidParams);
    expect(result.success).toBe(false);
  });
});

describe('sqsMatchMessageSchema', () => {
  it('should validate correct message', () => {
    const validMessage = {
      matchId: 'NA1_4567890123',
      puuid: 'abc123xyz',
      region: 'americas',
      year: 2024,
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = sqsMatchMessageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
  });

  it('should reject year out of range', () => {
    const invalidMessage = {
      matchId: 'NA1_4567890123',
      puuid: 'abc123xyz',
      region: 'americas',
      year: 2050,
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = sqsMatchMessageSchema.safeParse(invalidMessage);
    expect(result.success).toBe(false);
  });
});

describe('agentAnalysisResultSchema', () => {
  it('should validate correct agent result', () => {
    const validResult = {
      agentName: 'BuildAgent',
      status: 'success',
      analysis: 'Build analysis complete',
      timestamp: 1704067200000,
      metadata: {
        tokensUsed: 1250,
        executionTimeMs: 3500,
      },
    };

    const result = agentAnalysisResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it('should reject invalid agent name', () => {
    const invalidResult = {
      agentName: 'InvalidAgent',
      status: 'success',
      analysis: 'Analysis',
      timestamp: 1704067200000,
    };

    const result = agentAnalysisResultSchema.safeParse(invalidResult);
    expect(result.success).toBe(false);
  });
});
```

## Validation

- [ ] All schemas compile without TypeScript errors
- [ ] Unit tests pass for valid inputs
- [ ] Unit tests pass for invalid inputs
- [ ] Error messages are descriptive
- [ ] Types are correctly inferred from schemas
- [ ] Schemas can be imported in Lambda functions

## References

- [Zod Schemas Reference](./zod-schemas-reference.md)
- [Powertools Implementation Guide](./powertools-implementation-guide.md)
- [Zod Documentation](https://zod.dev/)
