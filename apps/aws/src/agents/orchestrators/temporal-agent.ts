/**
 * Temporal Agent Orchestrator - Progress range: 70-80%
 */

import { Logger } from "@aws-lambda-powertools/logger";
import type { Handler } from "aws-lambda";
import { ZodError } from "zod";
import {
  formatAgentInput,
  invokeBedrockAgentWithTracing,
  resolveAgentEnvironment,
} from "../../shared/bedrock-client";
import { agentOrchestratorInputSchema } from "../../shared/schemas";
import {
  completeSession,
  generateSessionId,
  registerSession,
} from "../../shared/session-manager";
import { sendWebSocketUpdate } from "../../shared/websocket-client";

type TemporalAgentOutput = {
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

const logger = new Logger({ serviceName: "TemporalAgentOrchestrator" });

export const handler: Handler = async (
  event: unknown
): Promise<TemporalAgentOutput> => {
  const startTime = Date.now();

  try {
    const validatedInput = agentOrchestratorInputSchema.parse(event);
    logger.info("Temporal Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    const { sessionId, matchId, puuid } = validatedInput;
    let toolInvocationCount = 0;
    const { agentId, agentAliasId } = resolveAgentEnvironment("temporal", {
      agentLabel: "TemporalAgent",
    });

    const agentSessionId = generateSessionId("TemporalAgent", matchId);

    await registerSession({
      sessionId: agentSessionId,
      agentName: "TemporalAgent",
      matchId,
      puuid,
    });

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Temporal Agent initializing...",
      agent: "TemporalAgent",
      progress: 70,
    });

    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "temporal performance",
        matchId,
        puuid,
        context: {
          instructions:
            "Analyze performance trends over time, power spike utilization, and game phase effectiveness.",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Temporal Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "TemporalAgent",
      progress: 80,
    });

    await completeSession({
      sessionId: agentSessionId,
      metadata: {
        executionTimeMs,
        toolInvocations: toolInvocationCount,
        tokensUsed: result.metadata.tokensUsed,
      },
    });

    return {
      agentName: "TemporalAgent",
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
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "TemporalAgent",
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
