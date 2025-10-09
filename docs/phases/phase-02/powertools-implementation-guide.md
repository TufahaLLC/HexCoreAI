# HexCore AI - AWS Lambda Powertools Implementation Guide
## Adding Idempotency and Parser Utilities

This guide provides step-by-step instructions for implementing **Idempotency** and **Parser** utilities from AWS Lambda Powertools into the HexCore AI architecture to enhance reliability, prevent duplicate processing, and validate event payloads.

## Overview

### What is Idempotency?

**Idempotency** ensures that Lambda functions produce the same result when invoked multiple times with identical input, preventing duplicate operations like duplicate match processing, redundant Bedrock Agent invocations, or double-writing to DynamoDB. The utility uses DynamoDB to track request payloads and return cached results on retry.

### What is Parser?

**Parser** validates and parses AWS Lambda event payloads using Zod schemas, providing type-safe validation for SQS messages, WebSocket connection parameters, and EventBridge events. It can be used as a decorator, Middy middleware, or manual function call.

## Prerequisites

### Install Dependencies

Add the Powertools utilities to the project:

```bash
pnpm install @aws-lambda-powertools/idempotency @aws-lambda-powertools/parser zod@~3 @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

**Updated package.json**:
```json
{
  "dependencies": {
    "@aws-lambda-powertools/idempotency": "^2.10.0",
    "@aws-lambda-powertools/parser": "^2.10.0",
    "zod": "^3.23.0"
  }
}
```

### Create Idempotency Table

Add a DynamoDB table to store idempotency records:

**template.yaml**:
```yaml
Resources:
  IdempotencyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: HexCore-Idempotency
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: expiration
        Enabled: true
```

**Required IAM Permissions**:
```yaml
Policies:
  - Statement:
      - Effect: Allow
        Action:
          - dynamodb:GetItem
          - dynamodb:PutItem
          - dynamodb:UpdateItem
          - dynamodb:DeleteItem
        Resource: !GetAtt IdempotencyTable.Arn
```

## Implementation Guide

### Part 1: Idempotency

Idempotency prevents duplicate processing in three critical Lambda functions.

#### 1.1 Match Processor Lambda (Idempotency)

**Why**: Prevents duplicate match data fetching, duplicate DynamoDB writes, and duplicate EventBridge events when SQS retries failed messages.

**Location**: `src/processor/match-processor.ts` 

**Implementation**:

```typescript
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'match-processor' });

// Configure persistence layer
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

// Define idempotent function for individual record processing
const processMatchIdempotent = makeIdempotent(
  async (message: SQSMatchMessage) => {
    const { matchId, puuid, region, sessionId } = message;
    
    logger.info('Processing match', { matchId, puuid });

    // Fetch match data and timeline in parallel
    const [matchData, timelineData] = await Promise.all([
      getMatchData(region, matchId),
      getMatchTimeline(region, matchId),
    ]);

    // Filter to agent-required fields
    const filteredData = filterMatchData(matchData, timelineData, puuid);

    // Write to DynamoDB
    const dataKey = `match:${matchId}:puuid:${puuid}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 2592000; // 30 days

    await ddb.send(
      new PutCommand({
        TableName: process.env.MATCH_DATA_TABLE,
        Item: { dataKey, matchId, puuid, ...filteredData, expiresAt },
      })
    );

    // Send progress update
    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: `Match data fetched: ${matchId}`,
      progress: 50,
    });

    // Publish EventBridge event
    await eventbridge.send(
      new PutEventsCommand({
        Entries: [{
          Source: 'hexcore.match.processor',
          DetailType: 'match.filtered.ready',
          Detail: JSON.stringify({ keys: [dataKey], sessionId, matchId, puuid, region }),
        }],
      })
    );

    return { matchId, status: 'success' };
  },
  {
    persistenceStore,
    dataIndexArgument: 0, // Use first argument (message) for idempotency key
  }
);

// SQS Handler with partial batch failures
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const message: SQSMatchMessage = JSON.parse(record.body);
      
      // Process with idempotency - returns cached result on duplicate
      await processMatchIdempotent(message);
      
      logger.info('Match processed successfully', { matchId: message.matchId });
    } catch (error) {
      logger.error('Failed to process record', { error });
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
```

**Idempotency Key**: Uses the entire SQS message body (`messageId` implicitly via content-based hashing).

**Benefits**:
- If SQS retries a failed message, the cached result is returned without re-fetching from Riot API
- Prevents duplicate EventBridge events triggering multiple Step Functions executions
- Reduces costs by avoiding redundant Riot API calls and DynamoDB writes

#### 1.2 Agent Orchestrator Lambdas (Idempotency)

**Why**: Prevents duplicate Bedrock Agent invocations (which cost money per token) when Step Functions retries due to transient errors.

**Location**: `src/agents/orchestrators/build-agent.ts` (apply to all 6 agents)

**Implementation**:

```typescript
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { Handler } from 'aws-lambda';
import { invokeBedrockAgentWithTracing } from '../../shared/bedrock-client';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'build-agent-orchestrator' });

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

interface BuildAgentInput {
  keys: string[];
  sessionId: string;
  matchId: string;
  puuid: string;
}

// Make agent invocation idempotent
const invokeBuildAgentIdempotent = makeIdempotent(
  async (input: BuildAgentInput) => {
    const { sessionId, matchId, puuid } = input;
    
    logger.info('Build Agent orchestrator started', { matchId, sessionId });

    const agentSessionId = `${sessionId}-build-${Date.now()}`;
    let currentProgress = 20;

    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Build Agent initializing...',
      agent: 'BuildAgent',
      progress: currentProgress,
    });

    // Invoke Bedrock Agent with streaming
    const fullResponse = await invokeBedrockAgentWithTracing({
      agentId: process.env.BEDROCK_AGENT_ID!,
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID!,
      sessionId: agentSessionId,
      inputText: `Analyze the build optimization for match ${matchId} and player ${puuid}.`,
      handlers: {
        // ... trace handlers from existing implementation
      },
    });

    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Build Agent analysis complete',
      agent: 'BuildAgent',
      progress: 35,
    });

    return {
      agentName: 'BuildAgent',
      status: 'success',
      analysis: fullResponse,
      timestamp: Date.now(),
    };
  },
  {
    persistenceStore,
    dataIndexArgument: 0, // Use input object
  }
);

export const handler: Handler = async (event: BuildAgentInput) => {
  try {
    // Returns cached result if Step Functions retries
    return await invokeBuildAgentIdempotent(event);
  } catch (error) {
    logger.error('Build Agent error', { error });
    return {
      agentName: 'BuildAgent',
      status: 'failed',
      analysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
    };
  }
};
```

**Apply to All Agents**: Combat, Vision, Economy, Champion, Competitive agents follow the same pattern.

**Benefits**:
- Prevents duplicate Bedrock invocations costing $0.003 per 1K input tokens + $0.015 per 1K output tokens
- Step Functions retries return cached results instantly
- Reduces WebSocket message spam during retries

#### 1.3 WebSocket Connect Lambda (Idempotency)

**Why**: Prevents duplicate match enqueueing to SQS when clients reconnect with the same session parameters.

**Location**: `src/websocket/connect.ts` 

**Implementation**:

```typescript
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

interface ConnectionParams {
  sessionId: string;
  puuid: string;
  region: string;
  year: string;
}

// Make match enqueueing idempotent
const enqueueMatchesIdempotent = makeIdempotent(
  async (params: ConnectionParams) => {
    const { sessionId, puuid, region, year } = params;

    // Fetch match IDs
    const yearStart = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
    const yearEnd = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
    const matchIds = await getMatchIds({ region, puuid, startTime: yearStart, endTime: yearEnd });

    // Enqueue to SQS
    const queuePromises = matchIds.map((matchId) => {
      const message: SQSMatchMessage = {
        matchId,
        puuid,
        region,
        year: Number.parseInt(year, 10),
        sessionId,
      };
      return sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.MATCH_QUEUE_URL,
          MessageBody: JSON.stringify(message),
        })
      );
    });

    await Promise.all(queuePromises);

    return { totalMatches: matchIds.length, matchIds };
  },
  {
    persistenceStore,
    dataIndexArgument: 0,
  }
);

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const queryParams = (event as unknown as { queryStringParameters?: Record<string, string> }).queryStringParameters ?? {};

  const { sessionId, puuid, region, year } = queryParams;

  try {
    // Store connection
    const ttl = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    await ddb.send(
      new PutCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: { connectionId, sessionId, puuid, connectedAt: Date.now(), ttl },
      })
    );

    // Enqueue matches with idempotency - returns cached result on reconnect
    const { totalMatches } = await enqueueMatchesIdempotent({ sessionId, puuid, region, year });

    // Send initial update
    await sendWebSocketUpdate(sessionId, {
      status: 'started',
      message: 'Processing initiated',
      totalMatches,
      progress: 0,
    });

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Error in connect handler', { error });
    return { statusCode: 500, body: 'Internal server error' };
  }
};
```

**Idempotency Key**: Uses `sessionId + puuid + region + year` combination.

**Benefits**:
- Reconnecting clients reuse cached match IDs without re-fetching from Riot API
- Prevents duplicate SQS messages for the same session
- Reduces latency for reconnection scenarios

### Part 2: Parser (Validation)

Parser validates event payloads to ensure type safety and prevent processing malformed data.

#### 2.1 WebSocket Connect Handler (Parser)

**Why**: Validates query parameters before processing to ensure all required fields are present and correctly formatted.

**Location**: `src/websocket/connect.ts` 

**Schema Definition** (`src/shared/schemas.ts`):

```typescript
import { z } from 'zod';

// WebSocket connection query parameters schema
export const connectionParamsSchema = z.object({
  sessionId: z.string().uuid(),
  puuid: z.string().min(1),
  region: z.enum(['americas', 'europe', 'asia']),
  year: z.string().regex(/^\d{4}$/),
});

export type ConnectionParams = z.infer<typeof connectionParamsSchema>;
```

**Implementation with Parser**:

```typescript
import { parser } from '@aws-lambda-powertools/parser';
import { connectionParamsSchema } from '../shared/schemas';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'websocket-connect' });

class WebSocketConnectHandler {
  @parser({ schema: connectionParamsSchema, envelope: 'custom' })
  public async handleConnection(params: ConnectionParams, event: unknown, context: unknown): Promise<{ statusCode: number; body: string }> {
    // params are now validated and typed
    const { sessionId, puuid, region, year } = params;

    logger.info('Connection parameters validated', { sessionId, puuid, region, year });

    try {
      // Store connection
      const ttl = Math.floor(Date.now() / 1000) + 7200;
      await ddb.send(
        new PutCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          Item: {
            connectionId: (event as any).requestContext.connectionId,
            sessionId,
            puuid,
            connectedAt: Date.now(),
            ttl,
          },
        })
      );

      // Enqueue matches
      const { totalMatches } = await enqueueMatchesIdempotent({ sessionId, puuid, region, year });

      await sendWebSocketUpdate(sessionId, {
        status: 'started',
        message: 'Processing initiated',
        totalMatches,
        progress: 0,
      });

      return { statusCode: 200, body: 'Connected' };
    } catch (error) {
      logger.error('Connection error', { error });
      return { statusCode: 500, body: 'Internal server error' };
    }
  }
}

const handlerInstance = new WebSocketConnectHandler();
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event, context) => {
  // Extract query parameters
  const queryParams = (event as unknown as { queryStringParameters?: Record<string, string> }).queryStringParameters ?? {};
  
  try {
    return await handlerInstance.handleConnection(queryParams as any, event, context);
  } catch (error) {
    // Parser throws ZodError on validation failure
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

**Benefits**:
- Rejects invalid requests early with 400 status
- Provides type safety throughout the handler
- Clear error messages for missing/malformed parameters

#### 2.2 Match Processor Lambda (Parser)

**Why**: Validates SQS message structure to ensure all required match processing fields are present.

**Schema Definition** (`src/shared/schemas.ts`):

```typescript
export const sqsMatchMessageSchema = z.object({
  matchId: z.string().min(1),
  puuid: z.string().min(1),
  region: z.enum(['americas', 'europe', 'asia']),
  year: z.number().int().min(2020).max(2030),
  sessionId: z.string().uuid(),
});

export type SQSMatchMessage = z.infer<typeof sqsMatchMessageSchema>;
```

**Implementation**:

```typescript
import { parser } from '@aws-lambda-powertools/parser/middleware';
import { sqsMatchMessageSchema } from '../shared/schemas';
import type { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import middy from '@middy/core';

const processMatchHandler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      // Parse and validate message
      const message = sqsMatchMessageSchema.parse(JSON.parse(record.body));
      
      // Process with idempotency
      await processMatchIdempotent(message);
      
      logger.info('Match processed successfully', { matchId: message.matchId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Invalid SQS message schema', { error: error.errors });
      } else {
        logger.error('Failed to process record', { error });
      }
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};

// Export with Middy middleware for automatic parsing
export const handler = middy(processMatchHandler);
```

**Benefits**:
- Rejects malformed SQS messages before processing
- Prevents downstream errors from missing fields
- Dead letter queue receives only truly problematic messages

#### 2.3 EventBridge Event Schema (Parser)

**Why**: Validates Step Functions input to ensure all agent orchestrators receive correctly structured data.

**Schema Definition** (`src/shared/schemas.ts`):

```typescript
export const eventBridgeMatchEventSchema = z.object({
  source: z.literal('hexcore.match.processor'),
  'detail-type': z.literal('match.filtered.ready'),
  detail: z.object({
    keys: z.array(z.string()).min(1),
    sessionId: z.string().uuid(),
    matchId: z.string().min(1),
    puuid: z.string().min(1),
    region: z.enum(['americas', 'europe', 'asia']),
    year: z.number().int(),
    schemaVersion: z.literal('1.0'),
  }),
});

export type EventBridgeMatchEvent = z.infer<typeof eventBridgeMatchEventSchema>;
```

**Usage in Agent Orchestrators**:

```typescript
import { eventBridgeMatchEventSchema } from '../../shared/schemas';

export const handler = async (event: unknown) => {
  try {
    // Validate EventBridge event structure
    const validatedEvent = eventBridgeMatchEventSchema.parse(event);
    const { keys, sessionId, matchId, puuid } = validatedEvent.detail;

    // Process with validated data
    return await invokeBuildAgentIdempotent({ keys, sessionId, matchId, puuid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Invalid EventBridge event', { error: error.errors });
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

## Lambda Function Utility Matrix

| Lambda Function | Idempotency | Parser | Why |
|-----------------|-------------|--------|-----|
| **WebSocket Connect** | ✅ Yes | ✅ Yes | Prevents duplicate match enqueueing on reconnect; validates query params |
| **WebSocket Disconnect** | ❌ No | ❌ No | Simple cleanup operation, naturally idempotent |
| **Match Processor** | ✅ Yes | ✅ Yes | Prevents duplicate Riot API calls and EventBridge events; validates SQS message structure |
| **Build Agent Orchestrator** | ✅ Yes | ✅ Yes | Prevents duplicate Bedrock invocations; validates Step Functions input |
| **Combat Agent Orchestrator** | ✅ Yes | ✅ Yes | Same as Build Agent |
| **Vision Agent Orchestrator** | ✅ Yes | ✅ Yes | Same as Build Agent |
| **Economy Agent Orchestrator** | ✅ Yes | ✅ Yes | Same as Build Agent |
| **Champion Agent Orchestrator** | ✅ Yes | ✅ Yes | Same as Build Agent |
| **Competitive Agent Orchestrator** | ✅ Yes | ✅ Yes | Same as Build Agent |
| **Synthesizer** | ✅ Yes | ✅ Yes | Prevents duplicate S3 writes and result creation; validates agent results |
| **Action Group Tools** | ❌ No | ✅ Yes | Called by Bedrock Agents, idempotency handled by orchestrators; validates tool parameters |

## SAM Template Updates

Add environment variables to all affected Lambda functions:

```yaml
Globals:
  Function:
    Environment:
      Variables:
        IDEMPOTENCY_TABLE: !Ref IdempotencyTable
        POWERTOOLS_SERVICE_NAME: hexcore-ai
        LOG_LEVEL: INFO

Resources:
  # All Lambda functions get idempotency table access
  MatchProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      # ... existing properties
      Environment:
        Variables:
          IDEMPOTENCY_TABLE: !Ref IdempotencyTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref IdempotencyTable
```

## Key Takeaways

**Idempotency** is critical for HexCore AI's event-driven architecture to prevent duplicate processing, reduce costs, and ensure correctness across retries. The **Match Processor** and **Agent Orchestrators** benefit most from idempotency due to their high retry probability and expensive operations.

**Parser** provides type safety and early validation, reducing downstream errors and improving debugging. All Lambda functions receiving external input (WebSocket, SQS, EventBridge) should use Parser for validation.

Together, these utilities implement AWS serverless best practices for production-grade reliability.
