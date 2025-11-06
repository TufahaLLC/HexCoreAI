/**
 * HexCore AI - Synthesizer Lambda Function
 *
 * This function aggregates all agent analysis results from Phase 7, persists them to S3 and DynamoDB,
 * and delivers the final synthesis to the client via WebSocket.
 *
 * Phase 8 Implementation:
 * - Task 8.1: Infrastructure scaffolding (this file)
 * - Task 8.2: Idempotent synthesis core implementation
 * - Task 8.3: Handler and WebSocket delivery
 * - Task 8.4: Cached analysis short-circuit
 */

import { makeIdempotent } from "@aws-lambda-powertools/idempotency";
import { DynamoDBPersistenceLayer } from "@aws-lambda-powertools/idempotency/dynamodb";
import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";
import {
  MILLISECONDS_TO_SECONDS,
  NINETY_DAYS_IN_SECONDS,
  PERCENTAGE_MULTIPLIER,
  RADIX_DECIMAL,
} from "../shared/constants";
import {
  type AgentAnalysisResult,
  agentAnalysisResultSchema,
  type SynthesizerInput,
  synthesizerInputSchema,
} from "../shared/schemas";

// Initialize Powertools Logger
const logger = new Logger({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME || "hexcore-synthesizer",
  logLevel:
    (process.env.LOG_LEVEL as "DEBUG" | "INFO" | "WARN" | "ERROR") || "INFO",
});

// Initialize AWS SDK clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const s3Client = new S3Client({});

// Initialize DynamoDB Persistence Layer for Idempotency
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE || "HexCore-Idempotency",
});

// Define synthesis result interface
type SynthesisResult = {
  resultId: string;
  s3Key: string;
  synthesis: {
    matchId: string;
    puuid: string;
    timestamp: number;
    agents: AgentAnalysisResult[];
    summary: {
      overallScore: number;
      strengths: string[];
      improvements: string[];
    };
  };
};

// Define summary interface
type Summary = {
  overallScore: number;
  strengths: string[];
  improvements: string[];
};

// Define parameters for writeSummaryToDynamoDB
type WriteSummaryParams = {
  resultId: string;
  puuid: string;
  matchId: string;
  s3Key: string;
  summary: Summary;
  timestamp: number;
  correlationId: string;
};

/**
 * Helper function to generate summary from agent results
 */
function generateSummary(agents: AgentAnalysisResult[]): Summary {
  const overallScore = calculateOverallScore(agents);
  const strengths = identifyStrengths(agents);
  const improvements = identifyImprovements(agents);

  return { overallScore, strengths, improvements };
}

/**
 * Helper function to calculate overall performance score
 */
function calculateOverallScore(agents: AgentAnalysisResult[]): number {
  // For now, return a placeholder score based on successful agents
  const successfulAgents = agents.filter((agent) => agent.status === "success");
  const baseScore =
    (successfulAgents.length / agents.length) * PERCENTAGE_MULTIPLIER;

  // Add some variance based on analysis content length (proxy for quality)
  const avgAnalysisLength =
    successfulAgents.reduce((sum, agent) => sum + agent.analysis.length, 0) /
      successfulAgents.length || 0;

  const qualityBonus = Math.min(avgAnalysisLength / PERCENTAGE_MULTIPLIER, 10); // Max 10 point bonus

  return (
    Math.round(
      Math.min(baseScore + qualityBonus, PERCENTAGE_MULTIPLIER) * RADIX_DECIMAL
    ) / RADIX_DECIMAL
  ); // Round to 1 decimal
}

// Mapping of agent names to strength indicators
const STRENGTH_INDICATORS: Record<
  string,
  { keywords: string[]; label: string }
> = {
  BuildAgent: {
    keywords: ["efficient", "optimal"],
    label: "Build optimization",
  },
  VisionAgent: { keywords: ["vision", "ward"], label: "Vision control" },
  EconomyAgent: { keywords: ["cs", "gold"], label: "Economic efficiency" },
  CombatAgent: {
    keywords: ["teamfight", "damage"],
    label: "Combat effectiveness",
  },
  ChampionAgent: {
    keywords: ["mastery", "champion"],
    label: "Champion proficiency",
  },
  CompetitiveAgent: {
    keywords: ["rank", "climb"],
    label: "Competitive progression",
  },
};

/**
 * Helper function to identify key strengths
 */
function identifyStrengths(agents: AgentAnalysisResult[]): string[] {
  const strengths: string[] = [];

  // Analyze each successful agent's output for positive indicators
  for (const agent of agents) {
    if (agent.status !== "success") {
      continue;
    }

    const analysis = agent.analysis.toLowerCase();
    const indicator = STRENGTH_INDICATORS[agent.agentName];

    if (indicator?.keywords.some((keyword) => analysis.includes(keyword))) {
      strengths.push(indicator.label);
    }
  }

  return strengths.length > 0 ? strengths : ["Consistent performance"];
}

// Mapping of agent names to improvement indicators
const IMPROVEMENT_INDICATORS: Record<
  string,
  { keywords: string[]; label: string }
> = {
  BuildAgent: { keywords: ["improve", "better"], label: "Build adaptation" },
  CombatAgent: {
    keywords: ["positioning", "engage"],
    label: "Combat positioning",
  },
  VisionAgent: { keywords: ["more", "better"], label: "Vision coverage" },
  EconomyAgent: { keywords: ["farm", "cs"], label: "Farming efficiency" },
};

const FAILED_AGENT_LABELS: Record<string, string> = {
  BuildAgent: "Build analysis",
  CombatAgent: "Combat analysis",
  VisionAgent: "Vision analysis",
  EconomyAgent: "Economic analysis",
  ChampionAgent: "Champion analysis",
  CompetitiveAgent: "Competitive analysis",
};

/**
 * Helper function to identify areas for improvement
 */
function identifyImprovements(agents: AgentAnalysisResult[]): string[] {
  const improvements: string[] = [];

  // Analyze each agent's output for improvement areas
  for (const agent of agents) {
    if (agent.status === "success") {
      const analysis = agent.analysis.toLowerCase();
      const indicator = IMPROVEMENT_INDICATORS[agent.agentName];

      if (indicator?.keywords.some((keyword) => analysis.includes(keyword))) {
        improvements.push(indicator.label);
      }
    } else {
      // Failed agents indicate areas needing attention
      const label = FAILED_AGENT_LABELS[agent.agentName];
      if (label) {
        improvements.push(label);
      }
    }
  }

  return improvements.length > 0 ? improvements : ["Overall consistency"];
}

// Helper: Validate agent results
function validateAgentResults(
  agentResults: unknown[],
  correlationId: string
): AgentAnalysisResult[] {
  const validatedAgents: AgentAnalysisResult[] = [];

  for (const agentResult of agentResults) {
    try {
      const validated = agentAnalysisResultSchema.parse(agentResult);
      validatedAgents.push(validated);
    } catch (error) {
      logger.warn("Invalid agent result, skipping", {
        correlationId,
        agentName:
          (agentResult as { agentName?: string }).agentName || "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (validatedAgents.length === 0) {
    throw new Error("No valid agent results found");
  }

  return validatedAgents;
}

// Helper: Write synthesis to S3
async function writeSynthesisToS3(
  s3Key: string,
  synthesis: unknown,
  correlationId: string,
  resultId: string
): Promise<void> {
  const s3Command = new PutObjectCommand({
    Bucket: process.env.RESULTS_BUCKET ?? "",
    Key: s3Key,
    Body: JSON.stringify(synthesis, null, 2),
    ContentType: "application/json",
  });

  await s3Client.send(s3Command);
  logger.info("Successfully wrote synthesis to S3", {
    correlationId,
    s3Key,
    resultId,
  });
}

// Helper: Write summary to DynamoDB
async function writeSummaryToDynamoDB(
  params: WriteSummaryParams
): Promise<void> {
  const { resultId, puuid, matchId, s3Key, summary, timestamp, correlationId } =
    params;
  const expiresAt = timestamp + NINETY_DAYS_IN_SECONDS;

  const dynamoCommand = new PutCommand({
    TableName: process.env.ANALYSIS_RESULTS_TABLE ?? "",
    Item: {
      resultId,
      puuid,
      matchId,
      s3Key,
      summary,
      createdAt: timestamp,
      expiresAt,
    },
    ConditionExpression: "attribute_not_exists(resultId)",
  });

  await docClient.send(dynamoCommand);
  logger.info("Successfully wrote summary to DynamoDB", {
    correlationId,
    resultId,
    tableName: process.env.ANALYSIS_RESULTS_TABLE,
  });
}

// Helper: Rollback S3 object on DynamoDB failure
async function rollbackS3Object(
  s3Key: string,
  correlationId: string
): Promise<void> {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.RESULTS_BUCKET ?? "",
    Key: s3Key,
  });
  await s3Client.send(deleteCommand);
  logger.info("Successfully rolled back S3 object", {
    correlationId,
    s3Key,
  });
}

/**
 * Idempotent synthesis core implementation
 */
const synthesizeResultsIdempotent = makeIdempotent(
  async (input: SynthesizerInput): Promise<SynthesisResult> => {
    const correlationId = input.sessionId;
    logger.info("Starting synthesis process", {
      correlationId,
      matchId: input.matchId,
      puuid: input.puuid,
      agentCount: input.agentResults.length,
    });

    // 1. Capture shared timestamp for consistency
    const now = Date.now();
    const timestamp = Math.floor(now / MILLISECONDS_TO_SECONDS);
    const resultId = `${input.puuid}-${input.matchId}-${timestamp}`;
    const s3Key = `results/${input.puuid}/${input.matchId}.json`;

    // 2. Validate agent results
    const validatedAgents = validateAgentResults(
      input.agentResults,
      correlationId
    );

    // 3. Generate summary
    const summary = generateSummary(validatedAgents);

    // 4. Build synthesis object
    const synthesis = {
      matchId: input.matchId,
      puuid: input.puuid,
      timestamp,
      agents: validatedAgents,
      summary,
    };

    // 5. Write to S3
    try {
      await writeSynthesisToS3(s3Key, synthesis, correlationId, resultId);
    } catch (error) {
      logger.error("Failed to write synthesis to S3", {
        correlationId,
        s3Key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    // 6. Write summary to DynamoDB
    try {
      await writeSummaryToDynamoDB({
        resultId,
        puuid: input.puuid,
        matchId: input.matchId,
        s3Key,
        summary,
        timestamp,
        correlationId,
      });
    } catch (error) {
      logger.error(
        "Failed to write summary to DynamoDB, attempting S3 rollback",
        {
          correlationId,
          resultId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );

      try {
        await rollbackS3Object(s3Key, correlationId);
      } catch (rollbackError) {
        logger.error("Failed to rollback S3 object", {
          correlationId,
          s3Key,
          rollbackError:
            rollbackError instanceof Error
              ? rollbackError.message
              : "Unknown error",
        });
      }

      throw error; // Rethrow original error to signal retry
    }

    return { resultId, s3Key, synthesis };
  },
  {
    persistenceStore,
    dataIndexArgument: 0, // Use first argument (input) for idempotency key
  }
);

/**
 * Lambda handler for Step Functions synthesizer invocation
 */
export const handler = async (event: unknown, context: Context) => {
  logger.addContext(context);

  let correlationId = "unknown";

  try {
    logger.info("Synthesizer handler invoked", {
      event: JSON.stringify(event, null, 2),
    });

    // 1. Parse Step Functions input with synthesizerInputSchema
    const validatedInput = synthesizerInputSchema.parse(event);
    correlationId = validatedInput.sessionId;

    logger.info("Input validated successfully", {
      correlationId,
      matchId: validatedInput.matchId,
      puuid: validatedInput.puuid,
      agentCount: validatedInput.agentResults.length,
    });

    // 2. Send WebSocket progress update (90%)
    try {
      const { sendWebSocketUpdate } = await import(
        "../shared/websocket-client"
      );
      await sendWebSocketUpdate(validatedInput.sessionId, {
        status: "processing",
        message: "Synthesizing analysis results...",
        progress: 90,
        timestamp: Date.now(),
      });

      logger.info("Progress update sent", { correlationId, progress: 90 });
    } catch (wsError) {
      logger.warn("Failed to send progress update", {
        correlationId,
        error: wsError instanceof Error ? wsError.message : "Unknown error",
      });
      // Continue processing even if WebSocket update fails
    }

    // 3. Invoke synthesizeResultsIdempotent
    const result = await synthesizeResultsIdempotent(validatedInput);

    logger.info("Synthesis completed successfully", {
      correlationId,
      resultId: result.resultId,
      s3Key: result.s3Key,
    });

    // 4. Send WebSocket completion message (100%) with full synthesis
    try {
      const { sendWebSocketUpdate } = await import(
        "../shared/websocket-client"
      );
      await sendWebSocketUpdate(validatedInput.sessionId, {
        status: "completed",
        message: "Analysis complete - WebSocket will close",
        progress: 100,
        data: {
          resultId: result.resultId,
          s3Key: result.s3Key,
          synthesis: result.synthesis,
        },
        timestamp: Date.now(),
      });

      logger.info("Completion message sent", { correlationId, progress: 100 });
    } catch (wsError) {
      logger.error("Failed to send completion message", {
        correlationId,
        error: wsError instanceof Error ? wsError.message : "Unknown error",
      });
      // Don't throw here - the synthesis succeeded, WebSocket is just delivery
    }

    // 5. Return { resultId, s3Key } to Step Functions
    const response = {
      resultId: result.resultId,
      s3Key: result.s3Key,
    };

    logger.info("Handler completed successfully", { correlationId, response });
    return response;
  } catch (error) {
    // 6. Handle errors with proper logging and correlation IDs
    if (error instanceof Error && error.name === "ZodError") {
      logger.error("Invalid synthesizer input", {
        correlationId,
        error: error.message,
        event: JSON.stringify(event, null, 2),
      });
      throw new Error("Invalid synthesizer input");
    }

    logger.error("Synthesizer handler failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Rethrow for Step Functions retry
    throw error;
  }
};

// Export the idempotent function for testing
export { synthesizeResultsIdempotent };
