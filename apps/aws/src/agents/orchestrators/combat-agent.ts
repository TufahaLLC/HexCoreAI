/**
 * Combat Agent Orchestrator
 *
 * Orchestrates the Combat Analysis Agent with streaming and trace event handling.
 * Progress range: 35-50%
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

type CombatAgentOutput = {
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

const logger = new Logger({ serviceName: "CombatAgentOrchestrator" });

/**
 * Main handler for Combat Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<CombatAgentOutput> => {
  const startTime = Date.now();

  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Combat Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeCombatAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "CombatAgent",
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
 * Invoke Combat Agent with trace event handling
 */
async function invokeCombatAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<CombatAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  const currentProgress = 35;
  const { agentId, agentAliasId } = resolveAgentEnvironment("combat", {
    agentLabel: "CombatAgent",
  });

  // Generate isolated session ID for this agent
  const agentSessionId = generateSessionId("CombatAgent", matchId);

  try {
    // Register session for tracking
    await registerSession({
      sessionId: agentSessionId,
      agentName: "CombatAgent",
      matchId,
      puuid,
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Combat Agent initializing...",
      agent: "CombatAgent",
      progress: currentProgress,
    });

    // Invoke agent with enhanced trace handling
    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "combat performance",
        matchId,
        puuid,
        context: {
          instructions:
            "Retrieve combat statistics, analyze damage patterns, and evaluate teamfight positioning",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Combat Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "CombatAgent",
      progress: 50,
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

    logger.info("Combat Agent analysis complete", {
      matchId,
      sessionId: agentSessionId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "CombatAgent",
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

    logger.error("Combat Agent error", {
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
      message: "Combat Agent analysis failed",
      agent: "CombatAgent",
    });

    return {
      agentName: "CombatAgent",
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
