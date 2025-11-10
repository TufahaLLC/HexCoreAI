/**
 * Adaptation Agent Orchestrator - Progress range: 90-95%
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

type AdaptationAgentOutput = {
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

const logger = new Logger({ serviceName: "AdaptationAgentOrchestrator" });

export const handler: Handler = async (
  event: unknown
): Promise<AdaptationAgentOutput> => {
  const startTime = Date.now();

  try {
    const validatedInput = agentOrchestratorInputSchema.parse(event);
    logger.info("Adaptation Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    const { sessionId, matchId, puuid } = validatedInput;
    let toolInvocationCount = 0;
    const { agentId, agentAliasId } = resolveAgentEnvironment("adaptation", {
      agentLabel: "AdaptationAgent",
    });

    const agentSessionId = generateSessionId("AdaptationAgent", matchId);

    await registerSession({
      sessionId: agentSessionId,
      agentName: "AdaptationAgent",
      matchId,
      puuid,
    });

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Adaptation Agent initializing...",
      agent: "AdaptationAgent",
      progress: 90,
    });

    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "adaptation analysis",
        matchId,
        puuid,
        context: {
          instructions:
            "Analyze how player adapted strategy based on game state, enemy composition, and match conditions. Evaluate build adaptation, playstyle flexibility, and strategic pivoting.",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Adaptation Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "AdaptationAgent",
      progress: 95,
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
      agentName: "AdaptationAgent",
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
        agentName: "AdaptationAgent",
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
