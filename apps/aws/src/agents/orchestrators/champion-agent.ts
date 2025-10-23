/**
 * Champion Agent Orchestrator
 *
 * Orchestrates the Champion Performance Agent with streaming and trace event handling.
 * Progress range: 75-85%
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

interface ChampionAgentOutput {
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

const logger = new Logger({ serviceName: "ChampionAgentOrchestrator" });
const tracer = new Tracer({ serviceName: "ChampionAgentOrchestrator" });

/**
 * Main handler for Champion Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<ChampionAgentOutput> => {
  const startTime = Date.now();

  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Champion Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeChampionAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "ChampionAgent",
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
 * Invoke Champion Agent with trace event handling
 */
async function invokeChampionAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<ChampionAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  let currentProgress = 75;

  // Generate isolated session ID for this agent
  const agentSessionId = generateSessionId("ChampionAgent", matchId);

  try {
    // Register session for tracking
    await registerSession({
      sessionId: agentSessionId,
      agentName: "ChampionAgent",
      matchId,
      puuid,
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Champion Agent initializing...",
      agent: "ChampionAgent",
      progress: currentProgress,
    });

    // Invoke agent with enhanced trace handling
    const result = await invokeBedrockAgentWithTracing({
      agentId: process.env.CHAMPION_AGENT_ID!,
      agentAliasId: process.env.CHAMPION_AGENT_ALIAS_ID!,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "champion performance",
        matchId,
        puuid,
        context: {
          instructions:
            "Retrieve champion data, analyze champion pool diversity, and evaluate mastery",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Champion Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "ChampionAgent",
      progress: 85,
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

    logger.info("Champion Agent analysis complete", {
      matchId,
      sessionId: agentSessionId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "ChampionAgent",
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

    logger.error("Champion Agent error", {
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
      message: "Champion Agent analysis failed",
      agent: "ChampionAgent",
    });

    return {
      agentName: "ChampionAgent",
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
