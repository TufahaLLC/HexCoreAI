# Task 5.1: Implement Match Processor Lambda

Create the Lambda function that processes match data from SQS with **Zod schema validation** and **Idempotency** to prevent duplicate processing.

**Subtasks:**
- [x] Create `src/processor/match-processor.ts` file
- [x] Import required AWS SDK clients and types
- [x] Import Powertools utilities (Idempotency, Logger)
- [x] Import Zod schemas from shared/schemas.ts
- [x] Configure idempotency persistence layer
- [x] Define handler function with SQSHandler type
- [x] Initialize batch failure tracking array
- [x] **Create idempotent processing function:**
  - [x] Wrap core processing logic with makeIdempotent
  - [x] Fetch match data and timeline in parallel
  - [x] Filter data to agent-required fields
  - [x] Write filtered data to DynamoDB
  - [x] Send WebSocket progress update
  - [x] Publish EventBridge event
  - [x] Return cached result on SQS retry
- [x] Process each SQS record:
  - [x] **Validate message body using sqsMatchMessageSchema (Zod)**
  - [x] Extract matchId, puuid, region, sessionId
  - [x] Call idempotent processing function
  - [x] Construct dataKey: `match:{matchId}:puuid:{puuid}`
  - [x] Calculate 30-day TTL
  - [x] Add to failures array on error
- [x] Return batchItemFailures for partial failure handling
- [x] Add comprehensive error logging with correlation IDs
- [x] Handle Zod validation errors separately

**src/processor/match-processor.ts:**
```typescript
import { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Logger } from '@aws-lambda-powertools/logger';
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { ZodError } from 'zod';
import { getMatchData, getMatchTimeline, filterMatchData } from '../shared/riot-api';
import { sendWebSocketUpdate } from '../shared/websocket-client';
import { sqsMatchMessageSchema, type SQSMatchMessage } from '../shared/schemas';
import { THIRTY_DAYS_IN_SECONDS, MILLISECONDS_TO_SECONDS } from '../shared/constants';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const eventbridge = new EventBridgeClient({});
const logger = new Logger({ serviceName: 'MatchProcessor' });

// Configure idempotency persistence layer
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

// Idempotent function for individual record processing
// Returns cached result if SQS retries the same message
const processMatchIdempotent = makeIdempotent(
  async (message: SQSMatchMessage) => {
    const { matchId, puuid, region, sessionId } = message;
    
    logger.info('Processing match', { 
      matchId, 
      puuid, 
      region,
      correlationId: sessionId 
    });

    // Fetch match data and timeline in parallel
    const [matchData, timelineData] = await Promise.all([
      getMatchData(region, matchId),
      getMatchTimeline(region, matchId),
    ]);

    // Filter to agent-required fields
    const filteredData = filterMatchData(matchData, timelineData, puuid);

    // Write to DynamoDB with 30-day TTL
    const dataKey = `match:${matchId}:puuid:${puuid}`;
    const expiresAt = Math.floor(Date.now() / MILLISECONDS_TO_SECONDS) + THIRTY_DAYS_IN_SECONDS;

    await ddb.send(
      new PutCommand({
        TableName: process.env.MATCH_DATA_TABLE,
        Item: {
          dataKey,
          matchId,
          puuid,
          ...filteredData,
          expiresAt,
        },
      })
    );

    logger.info('Match data written to DynamoDB', { 
      dataKey, 
      matchId,
      correlationId: sessionId 
    });

    // Send progress update via WebSocket
    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: `Data fetching complete for match ${matchId}`,
      progress: 50, // Would calculate actual progress
    });

    // Publish EventBridge event
    await eventbridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'hexcore.match.processor',
            DetailType: 'match.filtered.ready',
            Detail: JSON.stringify({
              keys: [dataKey],
              sessionId,
              matchId,
              puuid,
              region,
              year: message.year,
              schemaVersion: '1.0',
            }),
          },
        ],
      })
    );

    logger.info('EventBridge event published', { 
      matchId, 
      sessionId,
      correlationId: sessionId 
    });

    return { matchId, status: 'success' };
  },
  {
    persistenceStore,
    dataIndexArgument: 0, // Use message object for idempotency key
  }
);

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      // Validate SQS message using Zod schema
      const message = sqsMatchMessageSchema.parse(JSON.parse(record.body));
      
      // Process with idempotency - returns cached result on retry
      await processMatchIdempotent(message);
      
      logger.info('Match processed successfully', { 
        matchId: message.matchId,
        correlationId: message.sessionId 
      });
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error('Invalid SQS message schema', { 
          errors: error.errors,
          messageId: record.messageId 
        });
      } else {
        logger.error('Failed to process record', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          messageId: record.messageId 
        });
      }
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
```
