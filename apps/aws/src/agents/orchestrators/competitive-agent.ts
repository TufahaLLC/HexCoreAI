/**
 * Competitive Agent Orchestrator
 *
 * Orchestrates the Competitive Progression Agent with streaming and trace event handling.
 * Progress range: 85-90%
 */

import type { Handler } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { ZodError } from "zod";
import { sendWebSocketUpdate } from "../../shared/websocket-client";
import {
  invokeBedrockAgentWithTracing,
  formatAgentInput,
} from "../../shared/bedrock-client";
import {
  registerSession,
  completeSession,
  failSession,
  generateSessionId,
} from "../../shared/session-manager";
import {
  agentOrchestratorInputSchema,
  type AgentOrchestratorInput,
} from "../../shared/schemas";

interface CompetitiveAgentOutput {
  agentName: string;
  status: "success" | "failed";
  analysis: string;
  timestamp: number;
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    toolInvocations?: number;
  };
}

const logger = new Logger({ serviceName: "CompetitiveAgentOrchestrator" });
const tracer = new Tracer({ serviceName: "CompetitiveAgentOrchestrator" });

/**
 * Main handler for Competitive Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<CompetitiveAgentOutput> => {
  const startTime = Date.now();

  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Competitive Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeCompetitiveAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "CompetitiveAgent",
        status: "failed",
        analysis: "Invalid input event",
        timestamp: Date.now(),
        metadata: {
          executionTimeMs: Date.now() - startTime,
          toolInvocations: 0,
        },
      };
    }
    throw error;
  }
};

/**
 * Invoke Competitive Agent with trace event handling
 */
async function invokeCompetitiveAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<CompetitiveAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  let currentProgress = 85;

  // Generate isolated session ID for this agent
  const agentSessionId = generateSessionId("CompetitiveAgent", matchId);

  try {
    // Register session for tracking
    await registerSession({
      sessionId: agentSessionId,
      agentName: "CompetitiveAgent",
      matchId,
      puuid,
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Competitive Agent initializing...",
      agent: "CompetitiveAgent",
      progress: currentProgress,
    });

    // Invoke agent with enhanced trace handling
    const result = await invokeBedrockAgentWithTracing({
      agentId: process.env.COMPETITIVE_AGENT_ID!,
      agentAliasId: process.env.COMPETITIVE_AGENT_ALIAS_ID!,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "competitive progression",
        matchId,
        puuid,
        context: {
          instructions:
            "Retrieve rank data, analyze climb efficiency, and assess skill development",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Competitive Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "CompetitiveAgent",
      progress: 90,
    });

    // Mark session as complete
    await completeSession({
      sessionId: agentSessionId,
      metadata: {
        executionTimeMs,
        toolInvocations: toolInvocationCount,
        tokensUsed: result.metadata.tokensUsed,
      },
    });

    logger.info("Competitive Agent analysis complete", {
      matchId,
      sessionId: agentSessionId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "CompetitiveAgent",
      status: "success",
      analysis: result.completion,
      timestamp: Date.now(),
      metadata: {
        executionTimeMs,
        toolInvocations: toolInvocationCount,
        tokensUsed: result.metadata.tokensUsed,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Competitive Agent error", {
      error: errorMessage,
      matchId,
      sessionId: agentSessionId,
    });

    // Mark session as failed
    await failSession({
      sessionId: agentSessionId,
      error: errorMessage,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolInvocations: toolInvocationCount,
      },
    });

    await sendWebSocketUpdate(sessionId, {
      status: "error",
      message: "Competitive Agent analysis failed",
      agent: "CompetitiveAgent",
    });

    return {
      agentName: "CompetitiveAgent",
      status: "failed",
      analysis: `Error: ${errorMessage}`,
      timestamp: Date.now(),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolInvocations: toolInvocationCount,
      },
    };
  }
}
