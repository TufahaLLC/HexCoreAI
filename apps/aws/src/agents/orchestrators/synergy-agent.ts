/**
 * Synergy Agent Orchestrator - Progress range: 80-90%
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

type SynergyAgentOutput = {
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

const logger = new Logger({ serviceName: "SynergyAgentOrchestrator" });

export const handler: Handler = async (
  event: unknown
): Promise<SynergyAgentOutput> => {
  const startTime = Date.now();

  try {
    const validatedInput = agentOrchestratorInputSchema.parse(event);
    logger.info("Synergy Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    const { sessionId, matchId, puuid } = validatedInput;
    let toolInvocationCount = 0;
    const { agentId, agentAliasId } = resolveAgentEnvironment("synergy", {
      agentLabel: "SynergyAgent",
    });

    const agentSessionId = generateSessionId("SynergyAgent", matchId);

    await registerSession({
      sessionId: agentSessionId,
      agentName: "SynergyAgent",
      matchId,
      puuid,
    });

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Synergy Agent initializing...",
      agent: "SynergyAgent",
      progress: 80,
    });

    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "team synergy",
        matchId,
        puuid,
        context: {
          instructions:
            "Analyze team composition synergies, champion pairing effectiveness, and coordinated play patterns.",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Synergy Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "SynergyAgent",
      progress: 90,
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
      agentName: "SynergyAgent",
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
        agentName: "SynergyAgent",
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
