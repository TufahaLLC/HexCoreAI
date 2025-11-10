/**
 * Bedrock Agent Session Manager
 *
 * Tracks Bedrock Agent sessions in DynamoDB to prevent session accumulation
 * and enable session lifecycle management with automatic cleanup via TTL.
 */

import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DYNAMODB_ENDPOINT,
  MILLISECONDS_TO_SECONDS_DIVISOR,
  RANDOM_STRING_RADIX,
  RANDOM_SUBSTRING_LENGTH,
  RANDOM_SUBSTRING_START,
  SECONDS_PER_HOUR,
  SESSION_TTL_HOURS,
  SESSIONS_TABLE,
} from "./constants";

const logger = new Logger({ serviceName: "session-manager" });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: DYNAMODB_ENDPOINT,
});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Session status types
 */
export type SessionStatus = "active" | "completed" | "failed";

/**
 * Agent session record stored in DynamoDB
 */
export type AgentSession = {
  sessionId: string;
  agentName: string;
  matchId: string;
  puuid: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  expiresAt: number; // TTL for automatic cleanup
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    toolInvocations?: number;
    error?: string;
  };
};

/**
 * Register a new agent session at the start of orchestration
 *
 * @param params - Session creation parameters
 * @returns Created session record
 */
export async function registerSession(params: {
  sessionId: string;
  agentName: string;
  matchId: string;
  puuid: string;
}): Promise<AgentSession> {
  const now = Date.now();
  const expiresAt =
    Math.floor(now / MILLISECONDS_TO_SECONDS_DIVISOR) +
    SESSION_TTL_HOURS * SECONDS_PER_HOUR;

  const session: AgentSession = {
    sessionId: params.sessionId,
    agentName: params.agentName,
    matchId: params.matchId,
    puuid: params.puuid,
    status: "active",
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: SESSIONS_TABLE,
        Item: session,
      })
    );

    logger.info("Session registered", {
      sessionId: params.sessionId,
      agentName: params.agentName,
      expiresAt,
    });

    return session;
  } catch (error) {
    logger.error("Failed to register session", {
      error,
      sessionId: params.sessionId,
    });
    throw error;
  }
}

/**
 * Mark a session as completed with final metadata
 *
 * @param params - Session completion parameters
 */
export async function completeSession(params: {
  sessionId: string;
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    toolInvocations?: number;
  };
}): Promise<void> {
  const now = Date.now();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: SESSIONS_TABLE,
        Key: { sessionId: params.sessionId },
        UpdateExpression:
          "SET #status = :status, updatedAt = :updatedAt, completedAt = :completedAt, metadata = :metadata",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "completed",
          ":updatedAt": now,
          ":completedAt": now,
          ":metadata": params.metadata || {},
        },
      })
    );

    logger.info("Session completed", {
      sessionId: params.sessionId,
      metadata: params.metadata,
    });
  } catch (error) {
    logger.error("Failed to complete session", {
      error,
      sessionId: params.sessionId,
    });
    throw error;
  }
}

/**
 * Mark a session as failed with error information
 *
 * @param params - Session failure parameters
 */
export async function failSession(params: {
  sessionId: string;
  error: string;
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    toolInvocations?: number;
  };
}): Promise<void> {
  const now = Date.now();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: SESSIONS_TABLE,
        Key: { sessionId: params.sessionId },
        UpdateExpression:
          "SET #status = :status, updatedAt = :updatedAt, completedAt = :completedAt, metadata = :metadata",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "failed",
          ":updatedAt": now,
          ":completedAt": now,
          ":metadata": {
            ...(params.metadata || {}),
            error: params.error,
          },
        },
      })
    );

    logger.warn("Session marked as failed", {
      sessionId: params.sessionId,
      error: params.error,
    });
  } catch (error) {
    logger.error("Failed to mark session as failed", {
      error,
      sessionId: params.sessionId,
    });
    // Don't throw - this is best-effort cleanup
  }
}

/**
 * Get session details by session ID
 *
 * @param sessionId - Session identifier
 * @returns Session record or null if not found
 */
export async function getSession(
  sessionId: string
): Promise<AgentSession | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: SESSIONS_TABLE,
        Key: { sessionId },
      })
    );

    if (!result.Item) {
      return null;
    }

    return result.Item as AgentSession;
  } catch (error) {
    logger.error("Failed to get session", {
      error,
      sessionId,
    });
    throw error;
  }
}

/**
 * Delete a session record (for testing/manual cleanup)
 *
 * Note: In production, sessions are automatically cleaned up via DynamoDB TTL
 *
 * @param sessionId - Session identifier
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: SESSIONS_TABLE,
        Key: { sessionId },
      })
    );

    logger.info("Session deleted", { sessionId });
  } catch (error) {
    logger.error("Failed to delete session", {
      error,
      sessionId,
    });
    throw error;
  }
}

/**
 * Generate a unique session ID for agent invocation
 *
 * Format: {agentName}-{matchId}-{timestamp}-{random}
 *
 * @param agentName - Name of the agent
 * @param matchId - Match identifier
 * @returns Unique session ID
 */
export function generateSessionId(agentName: string, matchId: string): string {
  const timestamp = Date.now();
  const random = Math.random()
    .toString(RANDOM_STRING_RADIX)
    .substring(
      RANDOM_SUBSTRING_START,
      RANDOM_SUBSTRING_LENGTH + RANDOM_SUBSTRING_START
    );
  return `${agentName}-${matchId}-${timestamp}-${random}`;
}
