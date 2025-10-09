import { Logger } from "@aws-lambda-powertools/logger";
import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { WebSocketMessage } from "./types";

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const apigwClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});

const logger = new Logger({ serviceName: "WebSocketClient" });

export async function sendWebSocketUpdate(
  sessionId: string,
  message: WebSocketMessage
): Promise<void> {
  try {
    // Query GSI to get connectionId from sessionId
    const result = await ddb.send(
      new QueryCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        IndexName: "SessionIndex",
        KeyConditionExpression: "sessionId = :sessionId",
        ExpressionAttributeValues: {
          ":sessionId": sessionId,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      logger.info("No active connection found for session", { sessionId });
      return;
    }

    const connectionId = result.Items[0].connectionId;

    // Send message to connection
    await apigwClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      })
    );

    logger.info("WebSocket update sent successfully", { sessionId, message });
  } catch (error) {
    if (error instanceof GoneException) {
      logger.info("Stale connection detected, cleaning up", { sessionId });

      // Remove stale connection
      const result = await ddb.send(
        new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: "SessionIndex",
          KeyConditionExpression: "sessionId = :sessionId",
          ExpressionAttributeValues: {
            ":sessionId": sessionId,
          },
        })
      );

      if (result.Items && result.Items.length > 0) {
        await ddb.send(
          new DeleteCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: result.Items[0].connectionId },
          })
        );
      }
    } else {
      logger.error("Error sending WebSocket update", { error, sessionId });
      throw error;
    }
  }
}
