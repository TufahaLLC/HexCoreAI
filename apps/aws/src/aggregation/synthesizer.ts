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
import { NINETY_DAYS_IN_SECONDS } from "../shared/constants";
import {
  type AgentAnalysisResult,
  agentAnalysisResultSchema,
  type SynthesizerInput,
  synthesizerInputSchema,
} from "../shared/schemas";

// Initialize Powertools Logger
const logger = new Logger({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME || "hexcore-synthesizer",
  logLevel: (process.env.LOG_LEVEL as any) || "INFO",
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
  const baseScore = (successfulAgents.length / agents.length) * 100;

  // Add some variance based on analysis content length (proxy for quality)
  const avgAnalysisLength =
    successfulAgents.reduce((sum, agent) => sum + agent.analysis.length, 0) /
      successfulAgents.length || 0;

  const qualityBonus = Math.min(avgAnalysisLength / 100, 10); // Max 10 point bonus

  return Math.round(Math.min(baseScore + qualityBonus, 100) * 10) / 10; // Round to 1 decimal
}

/**
 * Helper function to identify key strengths
 */
function identifyStrengths(agents: AgentAnalysisResult[]): string[] {
  const strengths: string[] = [];

  // Analyze each successful agent's output for positive indicators
  agents.forEach((agent) => {
    if (agent.status === "success") {
      const analysis = agent.analysis.toLowerCase();

      switch (agent.agentName) {
        case "BuildAgent":
          if (analysis.includes("efficient") || analysis.includes("optimal")) {
            strengths.push("Build optimization");
          }
          break;
        case "VisionAgent":
          if (analysis.includes("vision") || analysis.includes("ward")) {
            strengths.push("Vision control");
          }
          break;
        case "EconomyAgent":
          if (analysis.includes("cs") || analysis.includes("gold")) {
            strengths.push("Economic efficiency");
          }
          break;
        case "CombatAgent":
          if (analysis.includes("teamfight") || analysis.includes("damage")) {
            strengths.push("Combat effectiveness");
          }
          break;
        case "ChampionAgent":
          if (analysis.includes("mastery") || analysis.includes("champion")) {
            strengths.push("Champion proficiency");
          }
          break;
        case "CompetitiveAgent":
          if (analysis.includes("rank") || analysis.includes("climb")) {
            strengths.push("Competitive progression");
          }
          break;
      }
    }
  });

  return strengths.length > 0 ? strengths : ["Consistent performance"];
}

/**
 * Helper function to identify areas for improvement
 */
function identifyImprovements(agents: AgentAnalysisResult[]): string[] {
  const improvements: string[] = [];

  // Analyze each agent's output for improvement areas
  agents.forEach((agent) => {
    if (agent.status === "success") {
      const analysis = agent.analysis.toLowerCase();

      switch (agent.agentName) {
        case "BuildAgent":
          if (analysis.includes("improve") || analysis.includes("better")) {
            improvements.push("Build adaptation");
          }
          break;
        case "CombatAgent":
          if (analysis.includes("positioning") || analysis.includes("engage")) {
            improvements.push("Combat positioning");
          }
          break;
        case "VisionAgent":
          if (analysis.includes("more") || analysis.includes("better")) {
            improvements.push("Vision coverage");
          }
          break;
        case "EconomyAgent":
          if (analysis.includes("farm") || analysis.includes("cs")) {
            improvements.push("Farming efficiency");
          }
          break;
      }
    } else {
      // Failed agents indicate areas needing attention
      switch (agent.agentName) {
        case "BuildAgent":
          improvements.push("Build analysis");
          break;
        case "CombatAgent":
          improvements.push("Combat analysis");
          break;
        case "VisionAgent":
          improvements.push("Vision analysis");
          break;
        case "EconomyAgent":
          improvements.push("Economic analysis");
          break;
        case "ChampionAgent":
          improvements.push("Champion analysis");
          break;
        case "CompetitiveAgent":
          improvements.push("Competitive analysis");
          break;
      }
    }
  });

  return improvements.length > 0 ? improvements : ["Overall consistency"];
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
    const timestamp = Math.floor(now / 1000); // Unix timestamp in seconds
    const resultId = `${input.puuid}-${input.matchId}-${timestamp}`;
    const s3Key = `results/${input.puuid}/${input.matchId}.json`;

    // 2. Validate agent results with Zod schemas
    const validatedAgents: AgentAnalysisResult[] = [];
    for (const agentResult of input.agentResults) {
      try {
        const validated = agentAnalysisResultSchema.parse(agentResult);
        validatedAgents.push(validated);
      } catch (error) {
        logger.warn("Invalid agent result, skipping", {
          correlationId,
          agentName: agentResult.agentName || "unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (validatedAgents.length === 0) {
      throw new Error("No valid agent results found");
    }

    // 3. Generate summary with helper functions
    const summary = generateSummary(validatedAgents);

    // 4. Build synthesis object
    const synthesis = {
      matchId: input.matchId,
      puuid: input.puuid,
      timestamp,
      agents: validatedAgents,
      summary,
    };

    // 5. Write to S3 with pretty formatting
    try {
      const s3Command = new PutObjectCommand({
        Bucket: process.env.RESULTS_BUCKET!,
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
    } catch (error) {
      logger.error("Failed to write synthesis to S3", {
        correlationId,
        s3Key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    // 6. Write summary record to DynamoDB with conditional expression
    try {
      const expiresAt = timestamp + NINETY_DAYS_IN_SECONDS; // 90 days TTL

      const dynamoCommand = new PutCommand({
        TableName: process.env.ANALYSIS_RESULTS_TABLE!,
        Item: {
          resultId,
          puuid: input.puuid,
          matchId: input.matchId,
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
    } catch (error) {
      // On DynamoDB failure, attempt to delete the S3 object
      logger.error(
        "Failed to write summary to DynamoDB, attempting S3 rollback",
        {
          correlationId,
          resultId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );

      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.RESULTS_BUCKET!,
          Key: s3Key,
        });
        await s3Client.send(deleteCommand);
        logger.info("Successfully rolled back S3 object", {
          correlationId,
          s3Key,
        });
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
export const handler = async (event: any, context: any) => {
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
