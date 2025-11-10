/**
 * Positioning Agent Orchestrator
 *
 * Orchestrates the Positioning Analysis Agent with streaming and trace event handling.
 * Progress range: 60-70%
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

type PositioningAgentOutput = {
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

const logger = new Logger({ serviceName: "PositioningAgentOrchestrator" });

export const handler: Handler = async (
  event: unknown
): Promise<PositioningAgentOutput> => {
  const startTime = Date.now();

  try {
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Positioning Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokePositioningAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "PositioningAgent",
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

async function invokePositioningAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<PositioningAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  const currentProgress = 60;
  const { agentId, agentAliasId } = resolveAgentEnvironment("positioning", {
    agentLabel: "PositioningAgent",
  });

  const agentSessionId = generateSessionId("PositioningAgent", matchId);

  try {
    await registerSession({
      sessionId: agentSessionId,
      agentName: "PositioningAgent",
      matchId,
      puuid,
    });

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Positioning Agent initializing...",
      agent: "PositioningAgent",
      progress: currentProgress,
    });

    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "positioning analysis",
        matchId,
        puuid,
        context: {
          instructions:
            "Analyze lane positioning, teamfight positioning, and objective positioning. Generate heat maps and calculate risk scores.",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Positioning Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "PositioningAgent",
      progress: 70,
    });

    await completeSession({
      sessionId: agentSessionId,
      metadata: {
        executionTimeMs,
        toolInvocations: toolInvocationCount,
        tokensUsed: result.metadata.tokensUsed,
      },
    });

    logger.info("Positioning Agent analysis complete", {
      matchId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "PositioningAgent",
      status: "success",
      analysis: result.completion,
      timestamp: Date.now(),
      metadata: {
        tokensUsed: result.metadata.tokensUsed,
        executionTimeMs,
        toolInvocations: toolInvocationCount,
      },
    };
  } catch (error) {
    logger.error("Positioning Agent orchestration failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      matchId,
    });

    await failSession({
      sessionId: agentSessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      agentName: "PositioningAgent",
      status: "failed",
      analysis: "Positioning analysis failed",
      timestamp: Date.now(),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolInvocations: toolInvocationCount,
      },
    };
  }
}
