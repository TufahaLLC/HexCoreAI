import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const logger = new Logger({ serviceName: "WebSocketDisconnect" });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    // Fetch connection metadata before deletion for logging and observability
    const getResult = await ddb.send(
      new GetCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
      })
    );

    if (!getResult.Item) {
      logger.warn("Connection not found, may have already been deleted", {
        connectionId,
      });
      return { statusCode: 200, body: "Disconnected" };
    }

    const { sessionId, puuid, connectedAt } = getResult.Item;
    const connectionDuration = Date.now() - connectedAt;

    // Delete connection from DynamoDB
    await ddb.send(
      new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
      })
    );

    logger.info("Connection deleted successfully", {
      connectionId,
      sessionId,
      puuid,
      connectionDurationMs: connectionDuration,
      correlationId: sessionId,
    });

    return { statusCode: 200, body: "Disconnected" };
  } catch (error) {
    logger.error("Error in disconnect handler", {
      error: error instanceof Error ? error.message : "Unknown error",
      connectionId,
    });
    return { statusCode: 500, body: "Internal server error" };
  }
};
