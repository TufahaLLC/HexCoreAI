# HexCore AI Architecture Design - Event-Driven Serverless Pipeline

## Overview

The recommended design is a fully serverless, event-driven pipeline: Client initiates a WebSocket connection via API Gateway, triggering match analysis; a Lambda consumes match IDs from SQS in batches of 10 to fetch and filter Riot data, writes filtered slices to DynamoDB, then publishes a "match.filtered.ready" event that starts a Step Functions workflow which fans out to multi-agent analysis. Throughout the entire flow, progress updates are sent back to the client via WebSocket connections. This approach decouples ingestion from analysis, enables robust retries and parallelism, provides real-time progress feedback, and leverages DynamoDB's serverless scalability without VPC cold start penalties.

## Architecture Diagram

```
Client (Next.js)
    ↓
API Gateway WebSocket API ($connect)
    ↓
Lambda: WebSocket Connect Handler
    ├─→ Store connectionId in DynamoDB (Connections table)
    ├─→ Enqueue match IDs to SQS
    └─→ Send initial update: "Processing started"
    ↓
SQS Standard Queue (with DLQ)
    ↓
Lambda: Match Data Processor (batch=10, SQS trigger)
    ├─→ Fetch MATCH-V5 & TIMELINE from Riot API
    ├─→ Filter to agent-required fields
    ├─→ Write to DynamoDB (MatchData table)
    ├─→ Publish EventBridge event: "match.filtered.ready"
    └─→ Send WebSocket update: "Data fetching complete (X/Y matches)"
    ↓
EventBridge
    ↓
Step Functions (State Machine)
    ├─→ Parallel execution of agent Lambdas:
    │   ├─ Build Optimization Agent
    │   ├─ Combat Analysis Agent
    │   ├─ Vision Control Agent
    │   ├─ Economy Management Agent
    │   ├─ Champion Meta Agent
    │   └─ Competitive Insight Agent
    │   (Each agent sends WebSocket update on completion)
    ├─→ Aggregation & Synthesis Task
    │   └─→ Send WebSocket update: "Agent analysis X of 6 completed"
    └─→ Write final results to S3/DynamoDB
        └─→ Send WebSocket update: "Analysis complete"
    ↓
Lambda: WebSocket Disconnect Handler
    └─→ Delete connectionId from DynamoDB
```

## Components

### API Gateway WebSocket API
- **Purpose**: Provides bidirectional real-time communication channel between client and backend
- **Routes**: 
  - `$connect`: Establishes connection, stores connectionId, initiates processing
  - `$disconnect`: Cleans up connection metadata
  - `$default`: Handles any custom client messages (optional)
- **Integration**: Lambda functions for each route
- **Connection duration**: Up to 2 hours (sufficient for 2-5 minute processing windows)

### Lambda: WebSocket Connect Handler
- **Trigger**: API Gateway WebSocket `$connect` route
- **Responsibilities**:
  - Extract sessionId and PUUID from query parameters
  - Store connectionId in DynamoDB Connections table with TTL (2 hours)
  - Retrieve yearly match IDs via Riot API (MATCH-V5/ids)
  - Enqueue match IDs to SQS with metadata: `{matchId, puuid, region, year, sessionId}`
  - Send initial WebSocket message: `{"status": "started", "message": "Processing initiated", "totalMatches": X}`
- **Timeout**: Must return within 29 seconds (API Gateway limit)
- **IAM**: Permissions for DynamoDB PutItem, SQS SendMessage, execute-api:ManageConnections

### DynamoDB: Connections Table
- **Purpose**: Stores active WebSocket connectionIds for routing updates
- **Schema**:
  - Partition Key: `connectionId` (String)
  - Attributes: `sessionId`, `puuid`, `connectedAt`, `ttl`
  - GSI: `SessionIndex` on `sessionId` for lookups during processing
- **TTL**: Automatically expires connections after 2 hours
- **Capacity**: On-demand mode for true serverless scaling

### SQS Standard Queue with DLQ
- **Purpose**: Buffers match work items, decouples processing, enables automatic scaling
- **Message format**: `{"matchId": "<id>", "puuid": "<puuid>", "region": "<platform>", "year": 2025, "sessionId": "<sessionId>"}`
- **Configuration**:
  - visibilityTimeout: 300 seconds (5 minutes, 2-6× Lambda timeout)
  - DLQ with maxReceiveCount=5
  - MessageRetentionPeriod: 4 days
- **Benefits**: Handles bursts, isolates failures, enables batch processing

### Lambda: Match Data Processor
- **Trigger**: SQS with batchSize=10, FunctionResponseTypes=ReportBatchItemFailures
- **Processing flow**:
  1. Receive batch of 10 match IDs from SQS
  2. Fetch MATCH-V5 and TIMELINE data from Riot API (parallel requests)
  3. Apply exponential backoff on transient errors (429, 503)
  4. Filter to agent-required fields: items, gold, KDA, damage, vision, CS, timeline metrics, rank metadata
  5. Write filtered data to DynamoDB MatchData table: `match:{matchId}:puuid:{puuid}`
  6. Look up connectionId from Connections table using sessionId (GSI query)
  7. Send progress update via WebSocket: `{"status": "processing", "message": "Data fetching complete", "progress": X/Y}`
  8. Publish EventBridge event: "match.filtered.ready" with DynamoDB keys
  9. Return batchItemFailures for partial success handling
- **Timeout**: 60 seconds
- **Memory**: 1024 MB (balanced for API calls and data transformation)
- **IAM**: SQS read/delete, DynamoDB read/write, EventBridge PutEvents, execute-api:ManageConnections

### DynamoDB: MatchData Table
- **Purpose**: Stores filtered match slices for fast agent reads
- **Schema**:
  - Partition Key: `dataKey` (String) - format: `match:{matchId}:puuid:{puuid}`
  - Attributes: Filtered JSON documents grouped by agent domain (build, combat, vision, economy, championMeta)
  - TTL: `expiresAt` (7-30 days depending on data retention policy)
- **Capacity**: On-demand mode - scales automatically with agent reads
- **Read pattern**: Single-digit millisecond latency (adequate for agent processing)
- **Benefits**: No VPC required, zero cold start penalty, pay-per-request pricing

### EventBridge
- **Event pattern**: `{"source": ["hexcore.match.processor"], "detail-type": ["match.filtered.ready"]}`
- **Event detail**: 
  ```json
  {
    "keys": ["match:{matchId}:puuid:{puuid}"],
    "sessionId": "<sessionId>",
    "matchId": "<id>",
    "puuid": "<puuid>",
    "region": "<platform>",
    "year": 2025,
    "schemaVersion": "1.0"
  }
  ```
- **Target**: Step Functions state machine execution
- **Purpose**: Decouples data ingestion from orchestration

### Step Functions: Multi-Agent Orchestration
- **Workflow type**: Express Workflow (high-volume, short-duration)
- **Structure**:
  1. **Parallel State**: Fan out to 6 agent Lambdas concurrently
     - Each agent reads from DynamoDB using provided keys
     - Agents process independently with 60s timeout per agent
     - Each agent sends WebSocket update on completion
  2. **Aggregation Task**: Collect and synthesize agent outputs
     - Send WebSocket update: "Synthesizing results"
  3. **Persistence Task**: Write final analysis to S3/DynamoDB
     - Send WebSocket update: "Analysis complete" with result location
- **Error handling**: Retry with exponential backoff, Catch blocks for graceful degradation
- **Timeout**: 5 minutes total execution time
- **IAM**: Lambda invoke, DynamoDB read, S3/DynamoDB write, execute-api:ManageConnections

### Agent Lambdas (6 agents)
Each agent Lambda performs specialized analysis:

1. **Build Optimization Agent**: Analyzes itemization paths, build efficiency, power spikes
2. **Combat Analysis Agent**: Evaluates KDA, damage patterns, combat participation
3. **Vision Control Agent**: Assesses ward placement, vision score, map control
4. **Economy Management Agent**: Tracks gold efficiency, CS patterns, resource optimization
5. **Champion Meta Agent**: Contextualizes performance against champion benchmarks
6. **Competitive Insight Agent**: Analyzes rank-appropriate strategies and improvement areas

**Agent responsibilities**:
- Read filtered match data from DynamoDB using provided keys
- Execute specialized analysis logic (may call Bedrock agents)
- Look up connectionId from Connections table using sessionId
- Send progress update via WebSocket: `{"status": "processing", "message": "{AgentName} completed", "progress": X}`
- Return structured output to Step Functions
- **Timeout**: 60 seconds per agent
- **Memory**: 512-1024 MB depending on analysis complexity
- **IAM**: DynamoDB read, Bedrock invoke (if applicable), execute-api:ManageConnections

### Lambda: WebSocket Disconnect Handler
- **Trigger**: API Gateway WebSocket `$disconnect` route
- **Responsibilities**:
  - Extract connectionId from event context
  - Delete connection record from DynamoDB Connections table
  - Log disconnection for observability
- **Timeout**: 10 seconds
- **IAM**: DynamoDB DeleteItem

### Durable Storage (S3/DynamoDB)
- **S3**: Stores complete analysis reports, raw agent outputs, large artifacts
- **DynamoDB**: Stores indexed analysis results for quick retrieval, user-facing data
- **Access pattern**: Results table with userId/puuid keys for efficient queries

## End-to-End Flow

### Step 1: WebSocket Connection Initiation
```
Client → API Gateway WebSocket API
  wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}?sessionId={uuid}&puuid={puuid}&year=2025
    ↓
$connect Lambda executes:
  - Store connectionId in DynamoDB
  - Call Riot API: GET /lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=100&startTime={yearStart}&endTime={yearEnd}
  - Enqueue each matchId to SQS
  - Send WebSocket: {"status": "started", "totalMatches": 87}
  - Return 200 (connection established)
```

### Step 2: Match Data Processing
```
SQS delivers batch of 10 messages to Match Processor Lambda:
  - Fetch MATCH-V5 and TIMELINE for 10 matches (parallel)
  - Filter to agent fields
  - Write to DynamoDB: match:{matchId}:puuid:{puuid}
  - Query Connections table GSI for connectionId using sessionId
  - Send WebSocket: {"status": "processing", "message": "Fetched 10/87 matches", "progress": 11}
  - Publish EventBridge: match.filtered.ready
  - Repeat until all matches processed
```

### Step 3: Agent Orchestration
```
EventBridge triggers Step Functions per match:
  - Parallel state invokes 6 agent Lambdas
  - Each agent:
    → Reads from DynamoDB using keys
    → Performs analysis
    → Queries Connections table for connectionId
    → Sends WebSocket: {"status": "processing", "agent": "BuildOptimization", "message": "Build analysis complete", "progress": 50}
  - Aggregation synthesizes outputs
  - Send WebSocket: {"status": "processing", "message": "Synthesizing insights", "progress": 90}
```

### Step 4: Completion and Cleanup
```
Step Functions final task:
  - Write results to S3/DynamoDB
  - Query Connections table for connectionId
  - Send WebSocket: {"status": "complete", "message": "Analysis complete", "resultId": "{id}", "progress": 100}
  - (Optional) Close WebSocket connection programmatically via DeleteConnectionCommand
    ↓
Client closes connection or 2-hour timeout triggers:
  - $disconnect Lambda removes connectionId from DynamoDB
```

## Data Contracts

### SQS Message Schema
```json
{
  "matchId": "NA1_4567890123",
  "puuid": "abc123...",
  "region": "americas",
  "year": 2025,
  "sessionId": "uuid-v4"
}
```

### EventBridge Event Schema
```json
{
  "source": "hexcore.match.processor",
  "detail-type": "match.filtered.ready",
  "detail": {
    "keys": ["match:NA1_4567890123:puuid:abc123..."],
    "sessionId": "uuid-v4",
    "matchId": "NA1_4567890123",
    "puuid": "abc123...",
    "region": "americas",
    "year": 2025,
    "schemaVersion": "1.0"
  }
}
```

### DynamoDB MatchData Schema
```json
{
  "dataKey": "match:NA1_4567890123:puuid:abc123...",
  "matchId": "NA1_4567890123",
  "puuid": "abc123...",
  "build": {
    "items": [...],
    "itemTimeline": [...],
    "goldPerMinute": [...]
  },
  "combat": {
    "kills": 7,
    "deaths": 3,
    "assists": 12,
    "damageDealt": {...},
    "damageReceived": {...}
  },
  "vision": {
    "wardsPlaced": 15,
    "wardsDestroyed": 8,
    "visionScore": 42
  },
  "economy": {
    "totalGold": 12500,
    "csPerMinute": 7.2,
    "goldEfficiency": 0.87
  },
  "championMeta": {
    "champion": "Jinx",
    "role": "ADC",
    "tier": "S",
    "winRate": 0.52
  },
  "expiresAt": 1735689600
}
```

### WebSocket Message Schema
```json
{
  "status": "processing|complete|error",
  "message": "Human-readable progress update",
  "progress": 45,
  "agent": "BuildOptimization (optional)",
  "totalMatches": 87,
  "processedMatches": 40,
  "resultId": "uuid (on completion)"
}
```

## Key Configurations

### API Gateway WebSocket
- **Routes**: $connect, $disconnect, $default
- **Route selection expression**: `$request.body.action`
- **Connection timeout**: 2 hours (default)
- **Throttle settings**: 10,000 requests/second, 5,000 concurrent connections

### SQS
- **Queue type**: Standard (high throughput)
- **visibilityTimeout**: 300 seconds (5 minutes)
- **receiveMessageWaitTimeSeconds**: 20 (long polling)
- **maxReceiveCount**: 5 (DLQ redrive)
- **MessageRetentionPeriod**: 4 days

### Lambda: Match Data Processor
- **batchSize**: 10
- **maximumBatchingWindowInSeconds**: 5 (micro-batching)
- **FunctionResponseTypes**: ReportBatchItemFailures
- **reservedConcurrentExecutions**: 50 (prevent overwhelming Riot API)
- **timeout**: 60 seconds
- **memory**: 1024 MB

### DynamoDB Tables
- **Connections Table**:
  - Billing mode: On-demand
  - TTL enabled on `ttl` attribute
  - GSI: SessionIndex on `sessionId`
- **MatchData Table**:
  - Billing mode: On-demand
  - TTL enabled on `expiresAt` attribute
  - Point-in-time recovery: Enabled

### Step Functions
- **Workflow type**: Express (sub-5 minute executions)
- **Timeout**: 300 seconds (5 minutes)
- **Parallel state MaxConcurrency**: 6 (one per agent)
- **Retry policy**: ExponentialBackoff with 3 attempts
- **Catch blocks**: Per-agent graceful degradation

## Error Handling and Retries

### Partial Batch Failures (SQS Lambda)
- Lambda returns `batchItemFailures` with failed message IDs
- Successful messages are deleted; failed messages return to queue
- Prevents reprocessing entire batch on single failure

### Dead Letter Queues
- DLQ configured with maxReceiveCount=5
- CloudWatch alarm on DLQ depth > 0
- Manual investigation and replay of poison messages

### Step Functions Retries
- Per-agent Retry blocks with exponential backoff
- Catch blocks route errors to synthesis with partial results
- Orchestration-level timeout prevents infinite loops

### WebSocket Connection Errors
- 410 Gone (stale connection): Remove from DynamoDB, log, continue
- Connection lookup failure: Log error, skip update, continue processing
- Send error messages to client on catastrophic failures

### Idempotency
- DynamoDB conditional writes using matchId+puuid keys
- SQS message deduplication via content-based deduplication (not FIFO)
- Agent outputs versioned to handle retries safely

## Security and IAM

### IAM Roles and Policies

**WebSocket Connect Lambda**:
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "sqs:SendMessage",
    "execute-api:ManageConnections"
  ],
  "Resource": [
    "arn:aws:dynamodb:region:account:table/Connections",
    "arn:aws:sqs:region:account:MatchQueue",
    "arn:aws:execute-api:region:account:api-id/*"
  ]
}
```

**Match Processor Lambda**:
```json
{
  "Effect": "Allow",
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
    "dynamodb:PutItem",
    "dynamodb:Query",
    "events:PutEvents",
    "execute-api:ManageConnections"
  ],
  "Resource": [
    "arn:aws:sqs:region:account:MatchQueue",
    "arn:aws:dynamodb:region:account:table/MatchData",
    "arn:aws:dynamodb:region:account:table/Connections*",
    "arn:aws:events:region:account:event-bus/default",
    "arn:aws:execute-api:region:account:api-id/*"
  ]
}
```

**Agent Lambdas**:
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:Query",
    "bedrock:InvokeAgent",
    "execute-api:ManageConnections"
  ],
  "Resource": [
    "arn:aws:dynamodb:region:account:table/MatchData",
    "arn:aws:dynamodb:region:account:table/Connections*",
    "arn:aws:bedrock:region:account:agent/*",
    "arn:aws:execute-api:region:account:api-id/*"
  ]
}
```

**Step Functions Execution Role**:
```json
{
  "Effect": "Allow",
  "Action": [
    "lambda:InvokeFunction",
    "dynamodb:PutItem",
    "s3:PutObject",
    "execute-api:ManageConnections"
  ],
  "Resource": [
    "arn:aws:lambda:region:account:function:Agent*",
    "arn:aws:dynamodb:region:account:table/AnalysisResults",
    "arn:aws:s3:::hexcore-results/*",
    "arn:aws:execute-api:region:account:api-id/*"
  ]
}
```

### Network Security
- **No VPC required**: All services use AWS-managed endpoints (DynamoDB, SQS, EventBridge, Step Functions)
- **API Gateway**: Public endpoint with IAM authorization or API keys
- **Secrets**: Riot API key stored in AWS Secrets Manager, accessed via Lambda
- **TLS**: All communication over HTTPS/WSS

### Data Protection
- **Encryption at rest**: DynamoDB tables encrypted with AWS managed keys
- **Encryption in transit**: TLS 1.2+ for all service communication
- **PII handling**: PUUID and summoner names considered sensitive, logged minimally

## Observability

### CloudWatch Metrics
- **SQS**: ApproximateNumberOfMessagesVisible, ApproximateAgeOfOldestMessage
- **Lambda**: Invocations, Duration, Errors, ConcurrentExecutions, IteratorAge
- **DynamoDB**: ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits, UserErrors
- **Step Functions**: ExecutionsFailed, ExecutionsSucceeded, ExecutionTime
- **API Gateway**: ConnectCount, MessageCount, IntegrationLatency, ClientError, ServerError

### CloudWatch Alarms
- DLQ message count > 0 (critical)
- SQS age of oldest message > 10 minutes (warning)
- Lambda error rate > 5% (critical)
- Step Functions execution failures > 10% (warning)
- DynamoDB throttled requests > 0 (critical)
- WebSocket connection errors > 5% (warning)

### Structured Logging
```javascript
// Use AWS Lambda Powertools for structured logs
const logger = new Logger();
logger.addContext({
  correlationId: event.sessionId,
  matchId: event.matchId,
  puuid: event.puuid
});
logger.info("Processing match", { stage: "data_fetch", progress: "10/87" });
```

### Tracing with X-Ray
- Enable X-Ray tracing on all Lambda functions
- Trace WebSocket connections end-to-end
- Visualize service map: API Gateway → Lambda → DynamoDB → EventBridge → Step Functions → Agents

### Correlation IDs
- Use `sessionId` from initial WebSocket connection as correlation ID
- Propagate through SQS message attributes, EventBridge events, Step Functions input
- Include in all logs and WebSocket messages for end-to-end traceability

## Performance Notes

### Batching Strategy
- **Batch size 10**: Balances API round trips vs Lambda duration
- **Riot API rate limits**: 20 requests/second, 100 requests/2 minutes
- **Reserved concurrency**: 50 concurrent Lambda executions = max 500 matches/minute

### DynamoDB Performance
- **Read latency**: Single-digit milliseconds (5-10ms p50, 10-20ms p99)
- **Write latency**: Single-digit milliseconds
- **On-demand mode**: Auto-scales to handle bursts without throttling
- **No cold starts**: HTTP-based access, no VPC networking overhead

### WebSocket Latency
- **Message delivery**: < 100ms from Lambda to client
- **Update frequency**: Send updates on meaningful progress milestones (every 10 matches, per agent completion)
- **Avoid spam**: Batch updates to prevent overwhelming client UI

### Lambda Cold Starts
- **Match Processor**: ~1-2 second cold start (no VPC)
- **Agent Lambdas**: ~500ms-1s cold start (no VPC)
- **Mitigation**: Use provisioned concurrency for critical paths if needed

### Caching Strategy
- **DynamoDB TTL**: Expire filtered match data after 7-30 days
- **Connection TTL**: Expire stale WebSocket connections after 2 hours
- **Client-side caching**: Cache analysis results in browser/app for instant re-access

## Scalability

### Horizontal Scaling
- **SQS**: Unlimited queue depth, automatic scaling
- **Lambda**: Auto-scales to 1,000 concurrent executions (default), request increase if needed
- **DynamoDB**: On-demand mode scales to millions of requests/second
- **Step Functions**: 1 million concurrent executions (soft limit)
- **API Gateway WebSocket**: 10,000 connections/second (default), request increase if needed

### Vertical Scaling
- Increase Lambda memory for faster processing (linear performance improvement)
- Use provisioned concurrency to eliminate cold starts during peak hours
- Batch larger groups of matches if Riot API rate limits allow

### Cost Optimization
- **On-demand pricing**: Pay only for actual usage, no idle costs
- **Lambda memory tuning**: Right-size memory to minimize duration × GB-seconds
- **SQS long polling**: Reduces empty receives and costs
- **DynamoDB TTL**: Automatic cleanup prevents unbounded storage costs
- **Step Functions Express**: 25× cheaper than Standard workflows

## Example Code Patterns

### WebSocket Message Sender Utility
```javascript
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const apigwClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

async function sendUpdate(sessionId, message) {
  try {
    // Look up connectionId from sessionId
    const result = await ddb.send(new QueryCommand({
      TableName: 'Connections',
      IndexName: 'SessionIndex',
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: { ':sessionId': sessionId }
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log('No active connection found');
      return;
    }

    const connectionId = result.Items[0].connectionId;

    await apigwClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message)
    }));

    console.log('Update sent:', message);
  } catch (error) {
    if (error.statusCode === 410) {
      console.log('Stale connection, cleaning up');
      // Remove from DynamoDB
    } else {
      console.error('Error sending update:', error);
    }
  }
}
```

### Match Processor Lambda Pattern
```javascript
exports.handler = async (event) => {
  const records = event.Records;
  const failures = [];

  for (const record of records) {
    try {
      const { matchId, puuid, region, year, sessionId } = JSON.parse(record.body);

      // Fetch and filter match data
      const matchData = await fetchAndFilterMatch(matchId, puuid, region);

      // Write to DynamoDB
      await ddb.send(new PutCommand({
        TableName: 'MatchData',
        Item: {
          dataKey: `match:${matchId}:puuid:${puuid}`,
          ...matchData,
          expiresAt: Math.floor(Date.now() / 1000) + 2592000 // 30 days
        }
      }));

      // Send progress update
      await sendUpdate(sessionId, {
        status: 'processing',
        message: 'Match data fetched',
        progress: calculateProgress(matchId)
      });

      // Publish event
      await events.send(new PutEventsCommand({
        Entries: [{
          Source: 'hexcore.match.processor',
          DetailType: 'match.filtered.ready',
          Detail: JSON.stringify({ matchId, puuid, sessionId, keys: [`match:${matchId}:puuid:${puuid}`] })
        }]
      }));

    } catch (error) {
      console.error('Failed to process record:', error);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
```

## Deployment Checklist

### Infrastructure Setup
- [ ] Create API Gateway WebSocket API with $connect, $disconnect routes
- [ ] Create DynamoDB Connections table with SessionIndex GSI and TTL
- [ ] Create DynamoDB MatchData table with TTL
- [ ] Create SQS standard queue with DLQ
- [ ] Create EventBridge rule for match.filtered.ready
- [ ] Create Step Functions state machine with parallel agent tasks
- [ ] Deploy 6 agent Lambda functions
- [ ] Deploy Match Processor Lambda with SQS trigger
- [ ] Deploy WebSocket Connect/Disconnect Lambdas
- [ ] Configure IAM roles with least-privilege permissions
- [ ] Store Riot API key in Secrets Manager
- [ ] Set up CloudWatch alarms and dashboards
- [ ] Enable X-Ray tracing on all Lambdas

### Testing
- [ ] Unit test each Lambda function
- [ ] Integration test WebSocket connection flow
- [ ] Load test SQS → Lambda → DynamoDB pipeline
- [ ] Test partial batch failure handling
- [ ] Verify DLQ redrive behavior
- [ ] Test Step Functions error handling and retries
- [ ] Validate WebSocket updates reach client
- [ ] Test connection cleanup and TTL expiration
- [ ] Performance test with 100+ matches
- [ ] Chaos testing (inject API failures, throttling)

### Monitoring
- [ ] Configure CloudWatch log groups with retention policies
- [ ] Set up CloudWatch alarms for critical metrics
- [ ] Create CloudWatch dashboard for real-time monitoring
- [ ] Enable X-Ray service map visualization
- [ ] Set up SNS notifications for alarm triggers
- [ ] Document runbook for common failure scenarios

---

This architecture provides a fully serverless, event-driven pipeline with real-time client feedback via WebSocket, leveraging DynamoDB for fast, scalable data access without VPC complexity or cold start penalties. The design supports 100+ matches per request with sub-5-minute total processing time and graceful error handling throughout the flow.
