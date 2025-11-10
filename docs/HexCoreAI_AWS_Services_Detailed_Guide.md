# HexCore AI - AWS Services Detailed Guide

## Overview

HexCore AI leverages a comprehensive suite of AWS services to create a serverless, event-driven platform for League of Legends match analysis. This guide provides detailed explanations of each AWS service used, its configuration, purpose, and how it integrates into the overall architecture.

## Core AWS Services

### 1. Amazon API Gateway (WebSocket API)

**Service**: `AWS::ApiGatewayV2::Api`
**Resource Name**: `HexCoreWebSocketApi`

#### Purpose
Provides real-time, bidirectional communication between the Next.js frontend and AWS backend. Enables live progress updates during match analysis.

#### Configuration
- **Protocol Type**: WebSocket
- **Route Selection Expression**: `$request.body.action`
- **Routes**:
  - `$connect`: Establishes WebSocket connection, initiates match processing
  - `$disconnect`: Cleans up connection metadata
  - `$default`: Handles custom client messages

#### Key Features
- **Connection Duration**: Up to 2 hours (sufficient for complete analysis workflows)
- **Throttling**: 10,000 requests/second, 5,000 concurrent connections
- **Integration**: Lambda proxy integration for all routes

#### Usage Flow
```
Client → wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}?sessionId={uuid}&puuid={puuid}
```

#### IAM Permissions Required
- `execute-api:ManageConnections` for sending messages
- `lambda:InvokeFunction` for route integrations

---

### 2. AWS Lambda Functions

HexCore AI uses multiple Lambda functions for different processing stages:

#### 2.1 WebSocket Connect Handler
**Function Name**: `HexCore-WebSocket-Connect`
**Handler**: `websocket/connect.handler`
**Timeout**: 29 seconds (API Gateway limit)
**Memory**: 1024 MB

**Responsibilities**:
- Extract sessionId and PUUID from query parameters
- Store connectionId in DynamoDB Connections table
- Fetch yearly match IDs from Riot API
- Enqueue match IDs to SQS queue
- Send initial WebSocket progress message

**Environment Variables**:
- `CONNECTIONS_TABLE`: DynamoDB table for connection tracking
- `MATCH_QUEUE_URL`: SQS queue URL for match processing
- `WEBSOCKET_ENDPOINT`: WebSocket API endpoint
- `RIOT_API_KEY_SECRET`: Secrets Manager secret name

#### 2.2 WebSocket Disconnect Handler
**Function Name**: `HexCore-WebSocket-Disconnect`
**Handler**: `websocket/disconnect.handler`
**Timeout**: 10 seconds
**Memory**: 512 MB

**Responsibilities**:
- Extract connectionId from event context
- Remove connection record from DynamoDB
- Log disconnection for observability

#### 2.3 Match Data Processor
**Function Name**: `HexCore-Match-Processor`
**Handler**: `processor/match-processor.handler`
**Timeout**: 60 seconds
**Memory**: 1024 MB
**Reserved Concurrency**: 50

**Trigger**: SQS queue with batch size of 10

**Responsibilities**:
- Process batches of 10 match IDs from SQS
- Fetch MATCH-V5 and TIMELINE data from Riot API
- Filter data to agent-required fields only
- Write filtered data to DynamoDB MatchData table
- Send progress updates via WebSocket
- Publish EventBridge events for each processed match
- Handle partial batch failures

**Key Features**:
- **Batch Processing**: Processes 10 matches simultaneously for efficiency
- **Error Handling**: Returns `batchItemFailures` for partial success
- **Rate Limiting**: Reserved concurrency prevents overwhelming Riot API
- **Idempotency**: Uses Lambda Powertools for safe retries

#### 2.4 Agent Orchestrators (11 Functions)
Each agent has an orchestrator Lambda that coordinates with Bedrock agents:

**Core Agents**:
- `HexCore-BuildAgent-Orchestrator`
- `HexCore-CombatAgent-Orchestrator`
- `HexCore-VisionAgent-Orchestrator`
- `HexCore-EconomyAgent-Orchestrator`
- `HexCore-ChampionAgent-Orchestrator`
- `HexCore-CompetitiveAgent-Orchestrator`

**Advanced Agents**:
- `HexCore-MacroAgent-Orchestrator`
- `HexCore-PositioningAgent-Orchestrator`
- `HexCore-TemporalAgent-Orchestrator`
- `HexCore-SynergyAgent-Orchestrator`
- `HexCore-AdaptationAgent-Orchestrator`

**Configuration**:
- **Timeout**: 60 seconds
- **Memory**: 512-1024 MB
- **Trigger**: Step Functions tasks

**Responsibilities**:
- Read filtered match data from DynamoDB
- Invoke corresponding Bedrock Agent with streaming
- Send rich WebSocket progress updates
- Track session lifecycle in AgentSessions table
- Return structured analysis results

#### 2.5 Agent Action Groups (11 Functions)
Each Bedrock Agent has corresponding Action Group Lambdas that provide data access tools:

**Examples**:
- `HexCore-BuildAgent-ActionGroup`
- `HexCore-CombatAgent-ActionGroup`
- etc.

**Configuration**:
- **Timeout**: 60 seconds
- **Memory**: 512 MB
- **Access**: Read-only access to MatchData table

#### 2.6 Synthesizer
**Function Name**: `HexCore-Synthesizer`
**Handler**: `aggregation/synthesizer.handler`
**Timeout**: 60 seconds
**Memory**: 1024 MB

**Responsibilities**:
- Aggregate results from all agent orchestrators
- Generate comprehensive analysis summary
- Write final results to S3 and DynamoDB
- Send completion notification via WebSocket

---

### 3. Amazon DynamoDB (6 Tables)

#### 3.1 Connections Table
**Table Name**: `HexCore-Connections`
**Billing Mode**: Pay-per-request
**TTL Attribute**: `ttl` (2 hours)

**Schema**:
- **Partition Key**: `connectionId` (String)
- **Attributes**: `sessionId`, `puuid`, `connectedAt`, `ttl`
- **GSI**: `SessionIndex` on `sessionId`

**Purpose**: Tracks active WebSocket connections for routing progress updates.

#### 3.2 Match Data Table
**Table Name**: `HexCore-MatchData`
**Billing Mode**: Pay-per-request
**TTL Attribute**: `expiresAt` (30 days)
**Point-in-Time Recovery**: Enabled

**Schema**:
- **Partition Key**: `dataKey` (String) - format: `match:{matchId}:puuid:{puuid}`
- **Attributes**: Filtered JSON data grouped by domain (build, combat, vision, economy, championMeta)

**Purpose**: Stores filtered match data optimized for fast agent reads.

#### 3.3 Analysis Results Table
**Table Name**: `HexCore-AnalysisResults`
**Billing Mode**: Pay-per-request
**TTL Attribute**: `expiresAt` (90 days)

**Schema**:
- **Partition Key**: `resultId` (String) - format: `{puuid}-{matchId}-{timestamp}`
- **Attributes**: `puuid`, `matchId`, `s3Key`, `summary`, `createdAt`
- **GSI**: `PuuidIndex` on `puuid`

**Purpose**: Stores analysis metadata and summaries for quick client retrieval.

#### 3.4 Agent Sessions Table
**Table Name**: `HexCore-AgentSessions`
**Billing Mode**: Pay-per-request
**TTL Attribute**: `expiresAt` (24 hours)

**Schema**:
- **Partition Key**: `sessionId` (String) - Bedrock session identifier
- **Attributes**: `agentType`, `userSessionId`, `matchId`, `status`, `createdAt`
- **GSI**: `MatchIndex` on (`matchId`, `createdAt`)

**Purpose**: Tracks Bedrock Agent session lifecycle for debugging and monitoring.

#### 3.5 Idempotency Table
**Table Name**: `HexCore-Idempotency`
**Billing Mode**: Pay-per-request
**TTL Attribute**: `expiration`

**Schema**:
- **Partition Key**: `id` (String)
- **Attributes**: Lambda Powertools idempotency data

**Purpose**: Ensures exactly-once processing for critical operations.

#### 3.6 External Data Cache Table
**Table Name**: `HexCore-ExternalDataCache`
**Billing Mode**: Pay-per-request
**TTL Attribute**: `ttl`

**Schema**:
- **Partition Key**: `cacheKey` (String)
- **Attributes**: Cached external API responses

**Purpose**: Caches external data (champion info, rank metadata) for performance.

---

### 4. Amazon Simple Queue Service (SQS)

#### 4.1 Main Queue
**Queue Name**: `HexCore-MatchQueue`
**Type**: Standard Queue

**Configuration**:
- **Visibility Timeout**: 300 seconds (5 minutes)
- **Message Retention**: 4 days (345,600 seconds)
- **Receive Message Wait Time**: 20 seconds (long polling)
- **Maximum Receive Count**: 5 (before DLQ)
- **DLQ**: `HexCore-MatchQueue-DLQ`

**Purpose**: Buffers match processing work, decouples ingestion from analysis, enables batch processing.

#### 4.2 Dead Letter Queue (DLQ)
**Queue Name**: `HexCore-MatchQueue-DLQ`
**Message Retention**: 14 days (1,209,600 seconds)

**Purpose**: Captures failed messages for manual investigation and replay.

---

### 5. Amazon S3 (Simple Storage Service)

#### Results Bucket
**Bucket Name**: `hexcore-results-{account-id}`
**Encryption**: AES-256 server-side encryption
**Lifecycle**: Objects deleted after 90 days

**Purpose**: Stores complete analysis results including:
- Full agent analysis reports
- Synthesized insights
- Historical analysis data

**Access Pattern**: `results/{puuid}/{matchId}.json`

---

### 6. Amazon EventBridge

#### Event Rule
**Rule Name**: `HexCore-MatchFilteredReady`
**Event Pattern**:
```json
{
  "source": ["hexcore.match.processor"],
  "detail-type": ["match.filtered.ready"]
}
```

**Target**: Step Functions state machine
**Purpose**: Decouples data processing from agent orchestration using event-driven architecture.

---

### 7. AWS Step Functions

#### State Machine
**Name**: `HexCore-Multi-Agent-Orchestration`
**Type**: Express Workflow
**Timeout**: 5 minutes
**Logging**: Full execution data in CloudWatch

**Workflow Structure**:
1. **Parallel State**: Executes 11 agent orchestrators concurrently
2. **Transform Results**: Normalizes agent outputs
3. **Synthesizer**: Aggregates results and persists to storage

**Error Handling**:
- **Retry Policies**: Exponential backoff for transient failures
- **Catch Blocks**: Graceful degradation for failed agents
- **Timeout Protection**: Prevents infinite execution

---

### 8. AWS Bedrock

#### 8.1 Bedrock Agents (11 Agents)
Each agent specializes in specific analysis domains:

**Core Analysis Agents**:
- **Build Analysis Agent**: Itemization and build optimization
- **Combat Analysis Agent**: KDA, damage patterns, combat participation
- **Vision Analysis Agent**: Ward placement and map control
- **Economy Analysis Agent**: Gold efficiency and CS patterns
- **Champion Analysis Agent**: Champion-specific performance
- **Competitive Analysis Agent**: Rank-appropriate strategies

**Advanced Analysis Agents**:
- **Macro Analysis Agent**: Strategic decision-making and objective control
- **Positioning Analysis Agent**: Combat and map positioning
- **Temporal Analysis Agent**: Timing patterns and power spikes
- **Synergy Analysis Agent**: Team composition effectiveness
- **Adaptation Analysis Agent**: Game state adaptation

#### 8.2 Agent Configuration
- **Foundation Model**: Custom inference profile (qo7gqdwc3pvd)
- **Service Role**: `BedrockAgentServiceRole`
- **Auto Prepare**: Disabled (manual preparation)
- **Aliases**: Production and test aliases

#### 8.3 Action Groups
Each agent has corresponding Lambda action groups that provide:
- Data retrieval tools from DynamoDB
- Match-specific analysis functions
- Real-time data access capabilities

---

### 9. AWS CloudWatch

#### 9.1 Log Groups
- **Lambda Logs**: `/aws/lambda/function-name`
- **Step Functions**: `/aws/stepfunctions/HexCore-MultiAgent`
- **Retention**: 7-30 days depending on service

#### 9.2 Metrics Monitoring
**SQS Metrics**:
- `ApproximateNumberOfMessagesVisible`
- `ApproximateAgeOfOldestMessage`
- `NumberOfMessagesReceived`

**Lambda Metrics**:
- `Invocations`, `Duration`, `Errors`
- `ConcurrentExecutions`, `Throttles`

**DynamoDB Metrics**:
- `ConsumedReadCapacityUnits`
- `ConsumedWriteCapacityUnits`
- `SystemErrors`, `UserErrors`

#### 9.3 Alarms
**Critical Alarms**:
- DLQ message count > 0
- Lambda error rate > 5%
- DynamoDB throttled requests > 0

**Warning Alarms**:
- Queue age > 10 minutes
- Step Functions failure rate > 10%
- WebSocket connection errors > 5%

---

### 10. AWS X-Ray

**Tracing**: Enabled on all Lambda functions and Step Functions
**Purpose**: End-to-end request tracing and performance analysis
**Service Map**: Visualizes complete request flow through all services

---

### 11. AWS Secrets Manager

**Secret Name**: Configurable via `RiotApiKeySecretName` parameter
**Purpose**: Securely stores Riot API key
**Rotation**: Manual rotation recommended
**Access**: Lambda functions access via IAM permissions

---

### 12. AWS IAM (Identity and Access Management)

#### 12.1 Execution Roles
Each service has dedicated IAM roles following least-privilege principle:

**WebSocket Connect Role**:
- DynamoDB PutItem (Connections table)
- SQS SendMessage
- execute-api:ManageConnections

**Match Processor Role**:
- SQS Receive/Delete messages
- DynamoDB Read/Write (MatchData, Connections)
- EventBridge PutEvents
- execute-api:ManageConnections

**Agent Orchestrator Roles**:
- DynamoDB Read (MatchData, Connections, AgentSessions)
- Bedrock InvokeAgent
- execute-api:ManageConnections

**Step Functions Role**:
- Lambda Invoke (all agent functions)
- DynamoDB Write (AnalysisResults)
- S3 PutObject
- execute-api:ManageConnections

#### 12.2 Service Roles
**Bedrock Agent Service Role**:
- Bedrock model invocation
- Lambda function invocation (action groups)

---

## Service Integration Flow

### End-to-End Request Processing

1. **Connection Establishment**
   ```
   Client → API Gateway WebSocket → Connect Lambda
   → DynamoDB (store connection) → SQS (enqueue matches)
   → WebSocket (initial update)
   ```

2. **Data Processing**
   ```
   SQS → Match Processor Lambda → Riot API
   → DynamoDB (filtered data) → EventBridge (publish event)
   → WebSocket (progress update)
   ```

3. **Agent Orchestration**
   ```
   EventBridge → Step Functions → Parallel Agent Lambdas
   → Bedrock Agents → DynamoDB (session tracking)
   → WebSocket (rich updates)
   ```

4. **Results Synthesis**
   ```
   Step Functions → Synthesizer Lambda → S3 (full results)
   → DynamoDB (metadata) → WebSocket (completion)
   ```

5. **Cleanup**
   ```
   Client Disconnect → Disconnect Lambda
   → DynamoDB (remove connection)
   ```

## Configuration Best Practices

### Performance Optimization
- **Lambda Memory**: Right-sized for each function (512-1024 MB)
- **Batch Processing**: SQS batches of 10 for efficiency
- **Long Polling**: 20-second wait time reduces costs
- **On-demand DynamoDB**: Auto-scales with workload

### Cost Management
- **Pay-per-request**: DynamoDB and Lambda pricing models
- **TTL Policies**: Automatic cleanup of old data
- **Express Workflows**: 25× cheaper than Standard Step Functions
- **Reserved Concurrency**: Prevents cost overruns

### Security & Compliance
- **Encryption**: All data encrypted at rest and in transit
- **VPC-less Design**: No VPC required, reduces complexity
- **IAM Roles**: Least-privilege access patterns
- **Secrets Management**: Secure API key storage

### Reliability & Monitoring
- **DLQ**: Handles poison messages
- **Retry Policies**: Exponential backoff throughout
- **Circuit Breakers**: Step Functions catch blocks
- **Observability**: Comprehensive logging and metrics

## Scaling Characteristics

### Horizontal Scaling
- **API Gateway**: 10,000 connections/second (configurable)
- **Lambda**: 1,000 concurrent executions (requestable increase)
- **SQS**: Unlimited queue depth
- **DynamoDB**: Millions of requests/second on-demand
- **Step Functions**: 1 million concurrent executions

### Vertical Scaling
- **Lambda Memory**: Up to 10 GB available
- **Provisioned Concurrency**: Eliminate cold starts
- **DynamoDB Capacity**: On-demand with automatic scaling

## Monitoring & Troubleshooting

### Key Metrics to Watch
1. **Queue Depth**: Messages waiting in SQS
2. **Processing Latency**: Time from connection to completion
3. **Error Rates**: Per-function and overall system errors
4. **Agent Success**: Bedrock agent invocation success rates
5. **WebSocket Health**: Connection establishment and message delivery

### Common Issues & Solutions
1. **Riot API Rate Limits**: Handled by reserved concurrency and backoff
2. **Stale WebSocket Connections**: TTL cleanup and 410 Gone handling
3. **Bedrock Agent Timeouts**: 60-second limits with retry logic
4. **DynamoDB Throttling**: On-demand mode prevents most issues
5. **Step Functions Timeouts**: 5-minute limit with parallel processing

This architecture provides a robust, scalable, and cost-effective foundation for real-time League of Legends match analysis using modern AWS serverless technologies.
