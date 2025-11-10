# Task 3.4: Create WebSocket Utility Module ✅

Implement utility functions for WebSocket communication.

**Subtasks:**
- [x] Create `src/shared/websocket-client.ts` file
- [x] Import required AWS SDK clients
- [x] Initialize DynamoDB DocumentClient
- [x] Initialize API Gateway Management API client
- [x] Implement `sendWebSocketUpdate()` function:
  - [x] Query Connections table GSI by sessionId
  - [x] Handle case when no connection found
  - [x] Post message to WebSocket connection
  - [x] Handle GoneException (410 errors)
  - [x] Clean up stale connections on 410 error
  - [x] Add error logging

**src/shared/websocket-client.ts:**
```typescript
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
import { Logger } from "@aws-lambda-powertools/logger";
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
```
