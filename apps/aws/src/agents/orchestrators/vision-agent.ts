/**
 * Vision Agent Orchestrator
 *
 * Orchestrates the Vision Control Agent with streaming and trace event handling.
 * Progress range: 50-65%
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

interface VisionAgentOutput {
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

const logger = new Logger({ serviceName: "VisionAgentOrchestrator" });
const tracer = new Tracer({ serviceName: "VisionAgentOrchestrator" });

/**
 * Main handler for Vision Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<VisionAgentOutput> => {
  const startTime = Date.now();

  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Vision Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeVisionAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "VisionAgent",
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
 * Invoke Vision Agent with trace event handling
 */
async function invokeVisionAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<VisionAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  let currentProgress = 50;

  // Generate isolated session ID for this agent
  const agentSessionId = generateSessionId("VisionAgent", matchId);

  try {
    // Register session for tracking
    await registerSession({
      sessionId: agentSessionId,
      agentName: "VisionAgent",
      matchId,
      puuid,
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Vision Agent initializing...",
      agent: "VisionAgent",
      progress: currentProgress,
    });

    // Invoke agent with enhanced trace handling
    const result = await invokeBedrockAgentWithTracing({
      agentId: process.env.VISION_AGENT_ID!,
      agentAliasId: process.env.VISION_AGENT_ALIAS_ID!,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "vision control",
        matchId,
        puuid,
        context: {
          instructions:
            "Retrieve vision data, analyze ward placement patterns, and assess map awareness",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Vision Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "VisionAgent",
      progress: 65,
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

    logger.info("Vision Agent analysis complete", {
      matchId,
      sessionId: agentSessionId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "VisionAgent",
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

    logger.error("Vision Agent error", {
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
      message: "Vision Agent analysis failed",
      agent: "VisionAgent",
    });

    return {
      agentName: "VisionAgent",
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
