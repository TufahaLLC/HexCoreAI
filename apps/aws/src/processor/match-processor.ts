import { makeIdempotent } from "@aws-lambda-powertools/idempotency";
import { DynamoDBPersistenceLayer } from "@aws-lambda-powertools/idempotency/dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSBatchResponse, SQSHandler } from "aws-lambda";
import { ZodError } from "zod";
import {
  MILLISECONDS_TO_SECONDS,
  THIRTY_DAYS_IN_SECONDS,
} from "../shared/constants";
import {
  filterMatchData,
  getMatchData,
  getMatchTimeline,
  getSummonerRank,
} from "../shared/riot-api";
import { type SQSMatchMessage, sqsMatchMessageSchema } from "../shared/schemas";
import type { EventBridgeMatchEvent, RankInfoData } from "../shared/types";
import { sendWebSocketUpdate } from "../shared/websocket-client";

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const eventbridge = new EventBridgeClient({});
const logger = new Logger({ serviceName: "MatchProcessor" });

// Configure idempotency persistence layer
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE ?? "HexCore-Idempotency",
});

// Idempotent function for individual record processing
// Returns cached result if SQS retries the same message
const processMatchIdempotent = makeIdempotent(
  async (message: SQSMatchMessage) => {
    const { matchId, puuid, region, sessionId } = message;

    logger.info("Processing match", {
      matchId,
      puuid,
      region,
      correlationId: sessionId,
    });

    try {
      // Fetch match data and timeline in parallel
      const results = await Promise.all([
        getMatchData(region, matchId),
        getMatchTimeline(region, matchId),
      ]);

      const [matchData, timelineData] = results as [
        Awaited<ReturnType<typeof getMatchData>>,
        Awaited<ReturnType<typeof getMatchTimeline>>,
      ];

      // Fetch rank data using PUUID directly
      let rankData: RankInfoData;
      try {
        rankData = await getSummonerRank(region, puuid);
      } catch (rankError) {
        logger.warn("Failed to fetch rank data, using default", {
          error: rankError,
          puuid,
        });
        rankData = {
          tier: "UNRANKED",
          rank: "",
          leaguePoints: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
        };
      }

      // Filter to agent-required fields
      const filteredData = filterMatchData(matchData, timelineData, puuid);

      // Write to DynamoDB with 30-day TTL
      const dataKey = `match:${matchId}:puuid:${puuid}`;
      const expiresAt =
        Math.floor(Date.now() / MILLISECONDS_TO_SECONDS) +
        THIRTY_DAYS_IN_SECONDS;

      await ddb.send(
        new PutCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Item: {
            dataKey,
            matchId,
            puuid,
            ...filteredData,
            rankInfo: rankData, // ADD rank data
            expiresAt,
          },
        })
      );

      logger.info("Match data written to DynamoDB", {
        dataKey,
        matchId,
        hasRankData: !!rankData,
        correlationId: sessionId,
      });

      // Send progress update via WebSocket
      await sendWebSocketUpdate(sessionId, {
        status: "processing",
        message: `Data fetching complete for match ${matchId}`,
        progress: 50,
      });

      // Publish EventBridge event
      const eventDetail: EventBridgeMatchEvent = {
        source: "hexcore.match.processor",
        "detail-type": "match.filtered.ready",
        detail: {
          keys: [dataKey],
          sessionId,
          matchId,
          puuid,
          region,
          year: message.year,
          schemaVersion: "1.0",
        },
      };

      await eventbridge.send(
        new PutEventsCommand({
          Entries: [
            {
              Source: eventDetail.source,
              DetailType: eventDetail["detail-type"],
              Detail: JSON.stringify(eventDetail.detail),
            },
          ],
        })
      );

      logger.info("EventBridge event published", {
        matchId,
        sessionId,
        correlationId: sessionId,
      });

      return { matchId, status: "success" };
    } catch (error) {
      logger.error("Error in processMatchIdempotent", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        matchId,
        puuid,
      });
      throw error;
    }
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

      logger.info("Match processed successfully", {
        matchId: message.matchId,
        correlationId: message.sessionId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error("Invalid SQS message schema", {
          errors: error.errors,
          messageId: record.messageId,
        });
      } else {
        logger.error("Failed to process record", {
          error: error instanceof Error ? error.message : "Unknown error",
          messageId: record.messageId,
        });
      }
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
