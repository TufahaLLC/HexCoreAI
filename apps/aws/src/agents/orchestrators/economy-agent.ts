/**
 * Economy Agent Orchestrator
 *
 * Orchestrates the Economy Management Agent with streaming and trace event handling.
 * Progress range: 65-75%
 */

import { Logger } from "@aws-lambda-powertools/logger";
import type { Handler } from "aws-lambda";
import { ZodError } from "zod";
import {
  formatAgentInput,
  invokeBedrockAgentWithTracing,
  resolveAgentEnvironment,
} from "../../shared/bedrock-client";
import {
  type AgentOrchestratorInput,
  agentOrchestratorInputSchema,
} from "../../shared/schemas";
import {
  completeSession,
  failSession,
  generateSessionId,
  registerSession,
} from "../../shared/session-manager";
import { sendWebSocketUpdate } from "../../shared/websocket-client";

type EconomyAgentOutput = {
  agentName: string;
  status: "success" | "failed";
  analysis: string;
  timestamp: number;
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    toolInvocations?: number;
  };
};

const logger = new Logger({ serviceName: "EconomyAgentOrchestrator" });

/**
 * Main handler for Economy Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<EconomyAgentOutput> => {
  const startTime = Date.now();

  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Economy Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeEconomyAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "EconomyAgent",
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
 * Invoke Economy Agent with trace event handling
 */
async function invokeEconomyAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<EconomyAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  const currentProgress = 65;
  const { agentId, agentAliasId } = resolveAgentEnvironment("economy", {
    agentLabel: "EconomyAgent",
  });

  // Generate isolated session ID for this agent
  const agentSessionId = generateSessionId("EconomyAgent", matchId);

  try {
    // Register session for tracking
    await registerSession({
      sessionId: agentSessionId,
      agentName: "EconomyAgent",
      matchId,
      puuid,
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Economy Agent initializing...",
      agent: "EconomyAgent",
      progress: currentProgress,
    });

    // Invoke agent with enhanced trace handling
    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "economy management",
        matchId,
        puuid,
        context: {
          instructions:
            "Retrieve gold data, analyze gold efficiency, and evaluate farming patterns",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Economy Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "EconomyAgent",
      progress: 75,
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

    logger.info("Economy Agent analysis complete", {
      matchId,
      sessionId: agentSessionId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "EconomyAgent",
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

    logger.error("Economy Agent error", {
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
      message: "Economy Agent analysis failed",
      agent: "EconomyAgent",
    });

    return {
      agentName: "EconomyAgent",
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
