/**
 * HexCore AI - Cache Utilities for Analysis Results
 *
 * This module provides utilities for finding and retrieving cached analysis results
 * to avoid reprocessing the same puuid/region/year combinations.
 *
 * Task 8.4: Enable Cached Analysis Short-Circuit
 */

import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { TIMESTAMP_TO_MILLISECONDS } from "./constants";

const logger = new Logger({
  serviceName: "hexcore-cache",
  logLevel:
    (process.env.LOG_LEVEL as "DEBUG" | "INFO" | "WARN" | "ERROR") || "INFO",
});

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const s3Client = new S3Client({});

export type CachedAnalysis = {
  resultId: string;
  s3Key: string;
  synthesis: {
    matchId: string;
    puuid: string;
    timestamp: number;
    agents: Array<{ name: string; status: string; result?: unknown }>;
    summary: {
      overallScore: number;
      strengths: string[];
      improvements: string[];
    };
  };
};

export type CacheLookupParams = {
  puuid: string;
  region: string;
  year: string;
};

/**
 * Find cached analysis for a given puuid/region/year combination
 *
 * @param params - The lookup parameters
 * @returns Promise<CachedAnalysis | null> - The cached analysis or null if not found
 */
export async function findCachedAnalysis(
  params: CacheLookupParams
): Promise<CachedAnalysis | null> {
  const { puuid, region, year } = params;
  const correlationId = `cache-${puuid}-${region}-${year}`;

  logger.info("Looking for cached analysis", {
    correlationId,
    puuid,
    region,
    year,
  });

  try {
    // Query DynamoDB PuuidIndex for existing results
    const queryCommand = new QueryCommand({
      TableName:
        process.env.ANALYSIS_RESULTS_TABLE ?? "HexCore-AnalysisResults",
      IndexName: "PuuidIndex",
      KeyConditionExpression: "puuid = :puuid",
      ExpressionAttributeValues: {
        ":puuid": puuid,
      },
      // Sort by createdAt descending to get most recent first
      ScanIndexForward: false,
      Limit: 10, // Only check recent results
    });

    const queryResult = await docClient.send(queryCommand);

    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info("No cached results found for puuid", {
        correlationId,
        puuid,
      });
      return null;
    }

    // Filter results by region/year match
    // Note: This is a simplified approach. In production, you might want to add
    // regionYear as a sort key in the GSI for more efficient querying
    const matchingResults = queryResult.Items.filter((item) => {
      // Extract region and year from matchId (format: REGION_MATCHNUMBER)
      const matchId = item.matchId as string;
      const matchRegion = matchId.split("_")[0]?.toLowerCase();

      // For year matching, we'd need to store it separately or extract from timestamp
      // For now, we'll use a simplified approach based on recent results
      const itemYear = new Date(item.createdAt * TIMESTAMP_TO_MILLISECONDS)
        .getFullYear()
        .toString();

      return matchRegion === region.toLowerCase() && itemYear === year;
    });

    if (matchingResults.length === 0) {
      logger.info("No matching cached results found", {
        correlationId,
        puuid,
        region,
        year,
        totalResults: queryResult.Items.length,
      });
      return null;
    }

    // Get the most recent matching result
    const cachedResult = matchingResults[0];

    logger.info("Found cached result, fetching from S3", {
      correlationId,
      resultId: cachedResult.resultId,
      s3Key: cachedResult.s3Key,
    });

    // Fetch the full synthesis from S3
    try {
      const s3Command = new GetObjectCommand({
        Bucket: process.env.RESULTS_BUCKET ?? "hexcore-results",
        Key: cachedResult.s3Key as string,
      });

      const s3Response = await s3Client.send(s3Command);

      if (!s3Response.Body) {
        logger.warn("S3 object has no body", {
          correlationId,
          s3Key: cachedResult.s3Key,
        });
        return null;
      }

      const synthesisData = await s3Response.Body.transformToString();
      const synthesis = JSON.parse(synthesisData);

      logger.info("Successfully retrieved cached analysis", {
        correlationId,
        resultId: cachedResult.resultId,
        agentCount: synthesis.agents?.length || 0,
      });

      return {
        resultId: cachedResult.resultId as string,
        s3Key: cachedResult.s3Key as string,
        synthesis,
      };
    } catch (s3Error) {
      logger.error("Failed to fetch synthesis from S3", {
        correlationId,
        s3Key: cachedResult.s3Key,
        error: s3Error instanceof Error ? s3Error.message : "Unknown error",
      });
      return null;
    }
  } catch (error) {
    logger.error("Error looking up cached analysis", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}
