# Task 7.17: Implement Session Management Utilities

**Status**: ✅ Complete

## Overview

Implement session lifecycle management for Bedrock Agent invocations with automatic TTL-based cleanup. This prevents session accumulation and provides visibility into active sessions for debugging and monitoring.

---

## The Session Accumulation Challenge

The Phase 7 implementation generates unique session IDs using the pattern `${sessionId}-build-${Date.now()}` for agent isolation. While this prevents session collisions, it creates orphaned session state in Bedrock that accumulates over time.

**The Problem:**

- Bedrock Agent sessions don't automatically expire
- Stale session data consumes memory
- Potential performance degradation as session counts grow
- Debugging challenges with expired session context

**Scale Impact:**

- 1 year analysis = 6 sessions (one per agent)
- 100 users/day = 600 sessions/day = **219,000 sessions/year**

---

## Subtasks

### 7.17.1: Create AgentSessionsTable in SAM Template

- [x] Add DynamoDB table definition
- [x] Configure TTL attribute for automatic expiration
- [x] Create GSI for querying sessions by user
- [x] Add table name to environment variables

**SAM Template Addition:**

```yaml
AgentSessionsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: HexCore-AgentSessions
    BillingMode: PAY_PER_REQUEST
    AttributeDefinitions:
      - AttributeName: sessionId
        AttributeType: S
      - AttributeName: userSessionId
        AttributeType: S
      - AttributeName: createdAt
        AttributeType: N
    KeySchema:
      - AttributeName: sessionId
        KeyType: HASH
    GlobalSecondaryIndexes:
      - IndexName: UserSessionIndex
        KeySchema:
          - AttributeName: userSessionId
            KeyType: HASH
          - AttributeName: createdAt
            KeyType: RANGE
        Projection:
          ProjectionType: ALL
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
    Tags:
      - Key: Project
        Value: HexCoreAI
```

### 7.17.2: Add IAM Permissions

- [x] Grant DynamoDB PutItem permission
- [x] Grant DynamoDB UpdateItem permission
- [x] Grant DynamoDB Query permission
- [x] Add to all orchestrator function roles

**IAM Policy:**

```yaml
- Effect: Allow
  Action:
    - dynamodb:PutItem
    - dynamodb:UpdateItem
    - dynamodb:Query
  Resource:
    - !GetAtt AgentSessionsTable.Arn
    - !Sub "${AgentSessionsTable.Arn}/index/*"
```

### 7.17.3: Create Session Manager Utility

- [x] Create `apps/aws/src/shared/session-manager.ts`
- [x] Define SessionRecord interface
- [x] Implement registerAgentSession function
- [x] Implement markSessionComplete function
- [x] Implement markSessionFailed function
- [x] Implement getUserSessions function
- [x] Implement getSessionStats function

**File:** `apps/aws/src/shared/session-manager.ts`

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "SessionManager" });
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const SESSIONS_TABLE = process.env.AGENT_SESSIONS_TABLE!;
const SESSION_TTL_HOURS = 24;

export interface SessionRecord {
  sessionId: string; // PK: Bedrock session ID
  agentType: string; // Build, Combat, Vision, etc.
  userSessionId: string; // Original WebSocket session ID
  matchId?: string; // Optional match context
  createdAt: number; // Unix timestamp (seconds)
  ttl: number; // Auto-delete timestamp
  status: "active" | "completed" | "failed";
  completedAt?: number; // Completion timestamp
  errorMessage?: string; // Error details if failed
}

/**
 * Register a new agent session for tracking
 */
export async function registerAgentSession(params: {
  sessionId: string;
  agentType: string;
  userSessionId: string;
  matchId?: string;
}): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + SESSION_TTL_HOURS * 60 * 60;

  const record: SessionRecord = {
    sessionId: params.sessionId,
    agentType: params.agentType,
    userSessionId: params.userSessionId,
    matchId: params.matchId,
    createdAt: now,
    ttl,
    status: "active",
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: SESSIONS_TABLE,
        Item: record,
      })
    );

    logger.info("Agent session registered", {
      sessionId: params.sessionId,
      agentType: params.agentType,
      ttlExpiration: new Date(ttl * 1000).toISOString(),
    });
  } catch (error) {
    logger.error("Failed to register session", { error, params });
    // Don't throw - session tracking is non-critical
  }
}

/**
 * Mark a session as completed
 */
export async function markSessionComplete(
  sessionId: string,
  metadata?: { toolsInvoked?: string[]; responseLength?: number }
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: SESSIONS_TABLE,
        Key: { sessionId },
        UpdateExpression:
          "SET #status = :status, completedAt = :completedAt, metadata = :metadata",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "completed",
          ":completedAt": now,
          ":metadata": metadata || {},
        },
      })
    );

    logger.info("Session marked complete", { sessionId, metadata });
  } catch (error) {
    logger.error("Failed to mark session complete", { error, sessionId });
  }
}

/**
 * Mark a session as failed
 */
export async function markSessionFailed(
  sessionId: string,
  errorMessage: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: SESSIONS_TABLE,
        Key: { sessionId },
        UpdateExpression:
          "SET #status = :status, completedAt = :completedAt, errorMessage = :errorMessage",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "failed",
          ":completedAt": now,
          ":errorMessage": errorMessage,
        },
      })
    );

    logger.info("Session marked failed", { sessionId, errorMessage });
  } catch (error) {
    logger.error("Failed to mark session as failed", { error, sessionId });
  }
}

/**
 * Query all sessions for a user's WebSocket session
 */
export async function getUserSessions(
  userSessionId: string
): Promise<SessionRecord[]> {
  try {
    const response = await ddb.send(
      new QueryCommand({
        TableName: SESSIONS_TABLE,
        IndexName: "UserSessionIndex",
        KeyConditionExpression: "userSessionId = :userSessionId",
        ExpressionAttributeValues: {
          ":userSessionId": userSessionId,
        },
        ScanIndexForward: false, // Most recent first
      })
    );

    return (response.Items || []) as SessionRecord[];
  } catch (error) {
    logger.error("Failed to query user sessions", { error, userSessionId });
    return [];
  }
}

/**
 * Get session statistics for monitoring
 */
export async function getSessionStats(userSessionId: string): Promise<{
  total: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const sessions = await getUserSessions(userSessionId);

  return {
    total: sessions.length,
    active: sessions.filter((s) => s.status === "active").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    failed: sessions.filter((s) => s.status === "failed").length,
  };
}
```

### 7.17.4: Integrate into Agent Orchestrators

- [x] Import session manager functions in all orchestrators
- [x] Call registerAgentSession() on start
- [x] Call markSessionComplete() on success
- [x] Call markSessionFailed() on error
- [x] Add AGENT_SESSIONS_TABLE environment variable

**Integration Pattern:**

```typescript
import {
  registerAgentSession,
  markSessionComplete,
  markSessionFailed,
} from "../../shared/session-manager";

// At start of handler
const agentSessionId = `${sessionId}-build-${Date.now()}`;

await registerAgentSession({
  sessionId: agentSessionId,
  agentType: "BuildAgent",
  userSessionId: sessionId,
  matchId,
});

// On success
await markSessionComplete(agentSessionId, {
  toolsInvoked,
  responseLength: fullResponse.length,
});

// On error
await markSessionFailed(agentSessionId, error.message);
```

### 7.17.5: Add Monitoring and Debugging Tools

- [x] Create CloudWatch dashboard for session metrics
- [x] Add session cleanup verification script

**CloudWatch Dashboard:**

```yaml
SessionMetricsDashboard:
  Type: AWS::CloudWatch::Dashboard
  Properties:
    DashboardName: HexCore-AgentSessions
    DashboardBody: !Sub |
      {
        "widgets": [
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["AWS/DynamoDB", "ConsumedReadCapacityUnits"],
                [".", "ConsumedWriteCapacityUnits"]
              ],
              "period": 300,
              "stat": "Average",
              "region": "${AWS::Region}",
              "title": "Session Table Activity"
            }
          }
        ]
      }
```

---

## Session Lifecycle

```
1. Creation
   ↓
   registerAgentSession()
   • Status: 'active'
   • TTL: now + 24 hours

2. Processing
   ↓
   Agent invocation in progress

3. Completion
   ↓
   markSessionComplete() or markSessionFailed()
   • Status: 'completed' or 'failed'
   • Metadata saved

4. Expiration (24 hours later)
   ↓
   DynamoDB TTL auto-deletes record
   • No manual cleanup needed
   • Free deletion (no write capacity)
```

---

## TTL Behavior

- DynamoDB TTL cleanup runs approximately every 48 hours
- Expired items may remain visible for up to 48 hours after TTL
- TTL deletion is free (no write capacity consumed)
- Deleted items don't appear in queries or scans

---

## Debugging Sessions

```bash
# Query sessions for a specific user
aws dynamodb query \
  --table-name HexCore-AgentSessions \
  --index-name UserSessionIndex \
  --key-condition-expression "userSessionId = :sessionId" \
  --expression-attribute-values '{":sessionId":{"S":"ws-session-123"}}'

# Check for failed sessions
aws dynamodb scan \
  --table-name HexCore-AgentSessions \
  --filter-expression "#status = :failed" \
  --expression-attribute-names '{"#status":"status"}' \
  --expression-attribute-values '{":failed":{"S":"failed"}}'
```

---

## Benefits

1. **Automatic Cleanup**: DynamoDB TTL removes sessions after 24 hours
2. **User Correlation**: GSI enables querying all sessions for a user
3. **Status Tracking**: Monitor active, completed, and failed sessions
4. **Non-Blocking**: Session tracking failures don't impact agent execution
5. **Cost-Effective**: Pay-per-request billing, TTL deletion is free
6. **Debugging**: Correlate session IDs to user requests and errors
7. **Monitoring**: CloudWatch metrics for session activity

---

## Next Steps

After completing this task:

1. Proceed to [Task 7.18: Deploy & Test Bedrock Agents](./task-718-deployment-testing.md)
2. Validate session tracking in production

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 3968-4247
- [DynamoDB TTL Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
