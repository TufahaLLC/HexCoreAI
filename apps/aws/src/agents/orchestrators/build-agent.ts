/**
 * Build Agent Orchestrator
 *
 * Orchestrates the Build Analysis Agent with streaming and trace event handling.
 * Progress range: 20-35%
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

interface BuildAgentOutput {
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

const logger = new Logger({ serviceName: "BuildAgentOrchestrator" });
const tracer = new Tracer({ serviceName: "BuildAgentOrchestrator" });

/**
 * Main handler for Build Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<BuildAgentOutput> => {
  const startTime = Date.now();

  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Build Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeBuildAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "BuildAgent",
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
 * Invoke Build Agent with trace event handling
 */
async function invokeBuildAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<BuildAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  let currentProgress = 20;

  // Generate isolated session ID for this agent
  const agentSessionId = generateSessionId("BuildAgent", matchId);

  try {
    // Register session for tracking
    await registerSession({
      sessionId: agentSessionId,
      agentName: "BuildAgent",
      matchId,
      puuid,
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Build Agent initializing...",
      agent: "BuildAgent",
      progress: currentProgress,
    });

    // Invoke agent with enhanced trace handling
    const result = await invokeBedrockAgentWithTracing({
      agentId: process.env.BUILD_AGENT_ID!,
      agentAliasId: process.env.BUILD_AGENT_ALIAS_ID!,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "build optimization",
        matchId,
        puuid,
        context: {
          instructions:
            "Retrieve build data, analyze efficiency, and provide recommendations",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Build Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "BuildAgent",
      progress: 35,
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

    logger.info("Build Agent analysis complete", {
      matchId,
      sessionId: agentSessionId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "BuildAgent",
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

    logger.error("Build Agent error", {
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
      message: "Build Agent analysis failed",
      agent: "BuildAgent",
    });

    return {
      agentName: "BuildAgent",
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
