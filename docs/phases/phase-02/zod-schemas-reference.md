# HexCore AI - Zod Schemas Reference
## Type-Safe Event Validation with AWS Lambda Powertools Parser

This document defines all Zod schemas used for validating Lambda function inputs across the HexCore AI architecture. These schemas are used with the AWS Lambda Powertools Parser utility to ensure type safety and early validation.

## Schema Location

All schemas should be defined in: `apps/aws/src/shared/schemas.ts`

## Schema Definitions

### 1. WebSocket Connection Parameters

Validates query parameters when clients connect to the WebSocket API.

```typescript
import { z } from 'zod';

export const connectionParamsSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  puuid: z.string().min(1, 'PUUID is required'),
  region: z.enum(['americas', 'europe', 'asia'], {
    errorMap: () => ({ message: 'Region must be americas, europe, or asia' }),
  }),
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
});

export type ConnectionParams = z.infer<typeof connectionParamsSchema>;
```

**Used by**: `WebSocketConnectFunction`

**Example Valid Input**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "puuid": "abc123xyz",
  "region": "americas",
  "year": "2024"
}
```

**Example Validation Error**:
```json
{
  "error": "Invalid parameters",
  "details": [
    {
      "path": ["region"],
      "message": "Region must be americas, europe, or asia"
    }
  ]
}
```

---

### 2. SQS Match Message

Validates messages sent to the Match Queue for processing.

```typescript
export const sqsMatchMessageSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  puuid: z.string().min(1, 'PUUID is required'),
  region: z.enum(['americas', 'europe', 'asia']),
  year: z.number().int().min(2020).max(2030, 'Year must be between 2020 and 2030'),
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
});

export type SQSMatchMessage = z.infer<typeof sqsMatchMessageSchema>;
```

**Used by**: `MatchProcessorFunction`

**Example Valid Input**:
```json
{
  "matchId": "NA1_4567890123",
  "puuid": "abc123xyz",
  "region": "americas",
  "year": 2024,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 3. EventBridge Match Event

Validates EventBridge events that trigger the Step Functions state machine.

```typescript
export const eventBridgeMatchEventSchema = z.object({
  source: z.literal('hexcore.match.processor'),
  'detail-type': z.literal('match.filtered.ready'),
  detail: z.object({
    keys: z.array(z.string()).min(1, 'At least one data key is required'),
    sessionId: z.string().uuid('Session ID must be a valid UUID'),
    matchId: z.string().min(1, 'Match ID is required'),
    puuid: z.string().min(1, 'PUUID is required'),
    region: z.enum(['americas', 'europe', 'asia']),
    year: z.number().int(),
    schemaVersion: z.literal('1.0'),
  }),
});

export type EventBridgeMatchEvent = z.infer<typeof eventBridgeMatchEventSchema>;
```

**Used by**: All Agent Orchestrator Functions (via Step Functions)

**Example Valid Input**:
```json
{
  "source": "hexcore.match.processor",
  "detail-type": "match.filtered.ready",
  "detail": {
    "keys": ["match:NA1_4567890123:puuid:abc123xyz"],
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "matchId": "NA1_4567890123",
    "puuid": "abc123xyz",
    "region": "americas",
    "year": 2024,
    "schemaVersion": "1.0"
  }
}
```

---

### 4. Agent Orchestrator Input

Validates input to individual agent orchestrator Lambda functions.

```typescript
export const agentOrchestratorInputSchema = z.object({
  keys: z.array(z.string()).min(1, 'At least one data key is required'),
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  matchId: z.string().min(1, 'Match ID is required'),
  puuid: z.string().min(1, 'PUUID is required'),
  region: z.enum(['americas', 'europe', 'asia']).optional(),
  year: z.number().int().optional(),
});

export type AgentOrchestratorInput = z.infer<typeof agentOrchestratorInputSchema>;
```

**Used by**: 
- `BuildAgentFunction`
- `CombatAgentFunction`
- `VisionAgentFunction`
- `EconomyAgentFunction`
- `ChampionAgentFunction`
- `CompetitiveAgentFunction`

**Example Valid Input**:
```json
{
  "keys": ["match:NA1_4567890123:puuid:abc123xyz"],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "matchId": "NA1_4567890123",
  "puuid": "abc123xyz"
}
```

---

### 5. Agent Analysis Result

Validates the output from agent orchestrator functions.

```typescript
export const agentAnalysisResultSchema = z.object({
  agentName: z.enum([
    'BuildAgent',
    'CombatAgent',
    'VisionAgent',
    'EconomyAgent',
    'ChampionAgent',
    'CompetitiveAgent',
  ]),
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
```

**Used by**: `SynthesizerFunction` (validates inputs from all agents)

**Example Valid Input**:
```json
{
  "agentName": "BuildAgent",
  "status": "success",
  "analysis": "The player's build path shows strong itemization...",
  "timestamp": 1704067200000,
  "metadata": {
    "tokensUsed": 1250,
    "executionTimeMs": 3500,
    "retryCount": 0
  }
}
```

---

### 6. Synthesizer Input

Validates the aggregated input to the Synthesizer function.

```typescript
export const synthesizerInputSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  matchId: z.string().min(1, 'Match ID is required'),
  puuid: z.string().min(1, 'PUUID is required'),
  agentResults: z.array(agentAnalysisResultSchema).min(1, 'At least one agent result is required'),
});

export type SynthesizerInput = z.infer<typeof synthesizerInputSchema>;
```

**Used by**: `SynthesizerFunction`

**Example Valid Input**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "matchId": "NA1_4567890123",
  "puuid": "abc123xyz",
  "agentResults": [
    {
      "agentName": "BuildAgent",
      "status": "success",
      "analysis": "Build analysis...",
      "timestamp": 1704067200000
    },
    {
      "agentName": "CombatAgent",
      "status": "success",
      "analysis": "Combat analysis...",
      "timestamp": 1704067201000
    }
  ]
}
```

---

### 7. WebSocket Message Payload

Validates outgoing WebSocket messages sent to clients.

```typescript
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
```

**Used by**: All functions that send WebSocket updates

**Example Valid Output**:
```json
{
  "status": "processing",
  "message": "Build Agent analysis complete",
  "progress": 35,
  "agent": "BuildAgent",
  "timestamp": 1704067200000
}
```

---

### 8. Bedrock Action Group Tool Parameters

Validates parameters for Bedrock Agent action group tools.

```typescript
export const getMatchDataToolSchema = z.object({
  dataKey: z.string().min(1, 'Data key is required'),
});

export const getPlayerStatsToolSchema = z.object({
  puuid: z.string().min(1, 'PUUID is required'),
  matchId: z.string().min(1, 'Match ID is required'),
});

export const getChampionInfoToolSchema = z.object({
  championName: z.string().min(1, 'Champion name is required'),
  matchId: z.string().min(1, 'Match ID is required'),
});

export type GetMatchDataTool = z.infer<typeof getMatchDataToolSchema>;
export type GetPlayerStatsTool = z.infer<typeof getPlayerStatsToolSchema>;
export type GetChampionInfoTool = z.infer<typeof getChampionInfoToolSchema>;
```

**Used by**: Action Group Tool Lambda functions

---

## Usage Examples

### Example 1: WebSocket Connect Handler

```typescript
import { parser } from '@aws-lambda-powertools/parser';
import { connectionParamsSchema, type ConnectionParams } from '../shared/schemas';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'websocket-connect' });

class WebSocketConnectHandler {
  @parser({ schema: connectionParamsSchema, envelope: 'custom' })
  public async handleConnection(
    params: ConnectionParams,
    event: unknown,
    context: unknown
  ): Promise<{ statusCode: number; body: string }> {
    // params are now validated and typed
    logger.info('Connection parameters validated', params);
    
    // Implementation...
    return { statusCode: 200, body: 'Connected' };
  }
}

const handlerInstance = new WebSocketConnectHandler();
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  const queryParams = (event as any).queryStringParameters ?? {};
  
  try {
    return await handlerInstance.handleConnection(queryParams, event, context);
  } catch (error) {
    logger.error('Validation error', { error });
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid parameters',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
```

### Example 2: Match Processor with Manual Validation

```typescript
import { sqsMatchMessageSchema, type SQSMatchMessage } from '../shared/schemas';
import type { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { ZodError } from 'zod';

const logger = new Logger({ serviceName: 'match-processor' });

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      // Manual validation with Zod
      const message = sqsMatchMessageSchema.parse(JSON.parse(record.body));
      
      // Process validated message
      await processMatch(message);
      
      logger.info('Match processed successfully', { matchId: message.matchId });
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error('Invalid SQS message schema', { 
          errors: error.errors,
          messageId: record.messageId 
        });
      } else {
        logger.error('Failed to process record', { error });
      }
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
```

### Example 3: Agent Orchestrator with EventBridge Validation

```typescript
import { eventBridgeMatchEventSchema } from '../../shared/schemas';
import { Logger } from '@aws-lambda-powertools/logger';
import { ZodError } from 'zod';

const logger = new Logger({ serviceName: 'build-agent-orchestrator' });

export const handler = async (event: unknown) => {
  try {
    // Validate EventBridge event structure
    const validatedEvent = eventBridgeMatchEventSchema.parse(event);
    const { keys, sessionId, matchId, puuid } = validatedEvent.detail;

    logger.info('Event validated', { matchId, sessionId });

    // Process with validated data
    return await invokeBuildAgentIdempotent({ keys, sessionId, matchId, puuid });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Invalid EventBridge event', { errors: error.errors });
      return {
        agentName: 'BuildAgent',
        status: 'failed',
        analysis: 'Invalid input event',
        timestamp: Date.now(),
      };
    }
    throw error;
  }
};
```

## Schema Validation Best Practices

### 1. Always Validate External Input
- WebSocket query parameters
- SQS message bodies
- EventBridge event payloads
- API Gateway request bodies

### 2. Use Descriptive Error Messages
```typescript
z.string().min(1, 'PUUID is required')  // Good
z.string().min(1)                        // Less helpful
```

### 3. Leverage Zod Transformations
```typescript
export const connectionParamsSchema = z.object({
  year: z.string().regex(/^\d{4}$/).transform((val) => parseInt(val, 10)),
});
```

### 4. Create Reusable Sub-Schemas
```typescript
const regionSchema = z.enum(['americas', 'europe', 'asia']);
const sessionIdSchema = z.string().uuid();

// Reuse across multiple schemas
export const connectionParamsSchema = z.object({
  region: regionSchema,
  sessionId: sessionIdSchema,
  // ...
});
```

### 5. Handle Validation Errors Gracefully
```typescript
try {
  const validated = schema.parse(data);
} catch (error) {
  if (error instanceof ZodError) {
    // Log structured validation errors
    logger.error('Validation failed', {
      errors: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }
}
```

## Testing Schemas

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { connectionParamsSchema } from '../shared/schemas';

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
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['region']);
    }
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
```

## Schema Versioning

As the API evolves, use schema versioning to maintain backward compatibility:

```typescript
export const eventBridgeMatchEventSchemaV1 = z.object({
  // ... v1 fields
  detail: z.object({
    schemaVersion: z.literal('1.0'),
    // ...
  }),
});

export const eventBridgeMatchEventSchemaV2 = z.object({
  // ... v2 fields with new additions
  detail: z.object({
    schemaVersion: z.literal('2.0'),
    // ...
  }),
});

// Union type for backward compatibility
export const eventBridgeMatchEventSchema = z.union([
  eventBridgeMatchEventSchemaV1,
  eventBridgeMatchEventSchemaV2,
]);
```

## Related Documentation

- [AWS Lambda Powertools Parser Documentation](https://docs.powertools.aws.dev/lambda/typescript/latest/utilities/parser/)
- [Zod Documentation](https://zod.dev/)
- [powertools-implementation-guide.md](./powertools-implementation-guide.md)
