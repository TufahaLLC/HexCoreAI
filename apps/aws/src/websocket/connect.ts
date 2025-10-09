import { makeIdempotent } from "@aws-lambda-powertools/idempotency";
import { DynamoDBPersistenceLayer } from "@aws-lambda-powertools/idempotency/dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { ZodError } from "zod";
import {
  MILLISECONDS_TO_SECONDS,
  RADIX_DECIMAL,
  TWO_HOURS_IN_SECONDS,
  YEAR_END_DAY,
  YEAR_END_MONTH,
  YEAR_START_DAY,
  YEAR_START_MONTH,
} from "../shared/constants";
import { getMatchIds } from "../shared/riot-api";
import {
  type ConnectionParams,
  connectionParamsSchema,
} from "../shared/schemas";
import type { SQSMatchMessage } from "../shared/types";
import { sendWebSocketUpdate } from "../shared/websocket-client";

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const sqs = new SQSClient({});
const logger = new Logger({ serviceName: "WebSocketConnect" });

// Configure idempotency persistence layer
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE || "HexCore-Idempotency",
});

// Idempotent function to prevent duplicate match enqueueing on reconnect
const enqueueMatchesIdempotent = makeIdempotent(
  async (params: ConnectionParams) => {
    const { sessionId, puuid, region, year } = params;

    logger.info("Fetching match IDs", {
      puuid,
      region,
      year,
      correlationId: sessionId,
    });

    // Fetch match IDs from Riot API
    const yearStart = Math.floor(
      new Date(
        `${year}-${YEAR_START_MONTH.toString().padStart(2, "0")}-${YEAR_START_DAY.toString().padStart(2, "0")}`
      ).getTime() / MILLISECONDS_TO_SECONDS
    );
    const yearEnd = Math.floor(
      new Date(
        `${year}-${YEAR_END_MONTH.toString().padStart(2, "0")}-${YEAR_END_DAY.toString().padStart(2, "0")}`
      ).getTime() / MILLISECONDS_TO_SECONDS
    );

    const matchIds = await getMatchIds({
      region,
      puuid,
      startTime: yearStart,
      endTime: yearEnd,
    });

    logger.info("Fetched match IDs from Riot API", {
      matchCount: matchIds.length,
      puuid,
      correlationId: sessionId,
    });

    // Enqueue match IDs to SQS
    const queuePromises = matchIds.map((matchId) => {
      const message: SQSMatchMessage = {
        matchId,
        puuid,
        region,
        year: Number.parseInt(year, RADIX_DECIMAL),
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

    logger.info("Enqueued messages to SQS successfully", {
      messageCount: matchIds.length,
      correlationId: sessionId,
    });

    return { totalMatches: matchIds.length, matchIds };
  },
  {
    persistenceStore,
    dataIndexArgument: 0, // Use params object for idempotency key
  }
);

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Type assertion for queryStringParameters which exists on WebSocket events
  const queryParams =
    (event as unknown as { queryStringParameters?: Record<string, string> })
      .queryStringParameters ?? {};

  try {
    // Validate query parameters using Zod schema
    const validatedParams = connectionParamsSchema.parse(queryParams);
    const { sessionId, puuid, region, year } = validatedParams;

    logger.info("Connection parameters validated", {
      connectionId,
      sessionId,
      puuid,
      region,
      year,
      correlationId: sessionId,
    });

    // Store connection in DynamoDB with 2-hour TTL
    const ttl =
      Math.floor(Date.now() / MILLISECONDS_TO_SECONDS) + TWO_HOURS_IN_SECONDS;
    await ddb.send(
      new PutCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: {
          connectionId,
          sessionId,
          puuid,
          connectedAt: Date.now(),
          ttl,
        },
      })
    );

    logger.info("Connection stored successfully", {
      connectionId,
      sessionId,
      puuid,
      correlationId: sessionId,
    });

    // Enqueue matches with idempotency - returns cached result on reconnect
    const { totalMatches } = await enqueueMatchesIdempotent(validatedParams);

    // Send initial WebSocket update
    await sendWebSocketUpdate(sessionId, {
      status: "started",
      message: `Processing initiated for ${totalMatches} matches`,
      progress: 0,
      data: { totalMatches },
    });

    logger.info("WebSocket connection established", {
      connectionId,
      sessionId,
      totalMatches,
      correlationId: sessionId,
    });

    return { statusCode: 200, body: "Connected" };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      logger.error("Invalid connection parameters", {
        errors: error.errors,
        connectionId,
      });
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid parameters",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        }),
      };
    }

    logger.error("Error in connect handler", {
      error: error instanceof Error ? error.message : "Unknown error",
      connectionId,
    });
    return { statusCode: 500, body: "Internal server error" };
  }
};
