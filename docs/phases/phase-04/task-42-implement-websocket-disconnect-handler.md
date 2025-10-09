# Task 4.2: Implement WebSocket Disconnect Handler ✅

Create the Lambda function that handles WebSocket disconnection with production-ready observability features.

**Subtasks:**
- [x] Create `src/websocket/disconnect.ts` file
- [x] Import required AWS SDK clients (DynamoDB, GetCommand, DeleteCommand)
- [x] Define handler function with APIGatewayProxyWebsocketHandlerV2 type
- [x] Extract connectionId from event context
- [x] **Fetch connection metadata before deletion** (for observability)
- [x] **Handle gracefully if connection already deleted** (idempotent behavior)
- [x] Calculate and log connection duration
- [x] Delete connection record from DynamoDB
- [x] **Add structured logging with correlation IDs**
- [x] Log session metadata (sessionId, puuid, duration)
- [x] Return 200 status
- [x] Add error handling with 500 response

**Production Features:**
- ✅ **Correlation ID Logging**: Includes sessionId for distributed tracing
- ✅ **Connection Duration Metrics**: Logs how long connection was active
- ✅ **Graceful Degradation**: Handles already-deleted connections without errors
- ✅ **Enhanced Observability**: Logs session metadata for debugging

**src/websocket/disconnect.ts:**
```typescript
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
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
```
