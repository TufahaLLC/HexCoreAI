/**
 * Macro Agent Orchestrator
 *
 * Orchestrates the Macro Analysis Agent with streaming and trace event handling.
 * Progress range: 50-60%
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

type MacroAgentOutput = {
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

const logger = new Logger({ serviceName: "MacroAgentOrchestrator" });

/**
 * Main handler for Macro Agent orchestration
 */
export const handler: Handler = async (
  event: unknown
): Promise<MacroAgentOutput> => {
  const startTime = Date.now();

  try {
    const validatedInput = agentOrchestratorInputSchema.parse(event);

    logger.info("Macro Agent orchestrator started", {
      matchId: validatedInput.matchId,
      sessionId: validatedInput.sessionId,
    });

    return await invokeMacroAgent(validatedInput, startTime);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input schema", { errors: error.errors });
      return {
        agentName: "MacroAgent",
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
 * Invoke Macro Agent with trace event handling
 */
async function invokeMacroAgent(
  input: AgentOrchestratorInput,
  startTime: number
): Promise<MacroAgentOutput> {
  const { sessionId, matchId, puuid } = input;
  let toolInvocationCount = 0;
  const currentProgress = 50;
  const { agentId, agentAliasId } = resolveAgentEnvironment("macro", {
    agentLabel: "MacroAgent",
  });

  const agentSessionId = generateSessionId("MacroAgent", matchId);

  try {
    await registerSession({
      sessionId: agentSessionId,
      agentName: "MacroAgent",
      matchId,
      puuid,
    });

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: "Macro Agent initializing...",
      agent: "MacroAgent",
      progress: currentProgress,
    });

    const result = await invokeBedrockAgentWithTracing({
      agentId,
      agentAliasId,
      sessionId: agentSessionId,
      inputText: formatAgentInput({
        analysisType: "macro gameplay",
        matchId,
        puuid,
        context: {
          instructions:
            "Analyze map movements, roaming efficiency, objective control timing, and strategic decision-making. Compare to high-elo benchmarks.",
        },
      }),
      enableTrace: process.env.ENABLE_BEDROCK_TRACES === "true",
    });

    toolInvocationCount = result.metadata.toolInvocations;
    const executionTimeMs = Date.now() - startTime;

    await sendWebSocketUpdate(sessionId, {
      status: "processing",
      message: `Macro Agent analysis complete (${toolInvocationCount} tools used)`,
      agent: "MacroAgent",
      progress: 60,
    });

    await completeSession({
      sessionId: agentSessionId,
      metadata: {
        executionTimeMs,
        toolInvocations: toolInvocationCount,
        tokensUsed: result.metadata.tokensUsed,
      },
    });

    logger.info("Macro Agent analysis complete", {
      matchId,
      executionTimeMs,
      toolInvocations: toolInvocationCount,
    });

    return {
      agentName: "MacroAgent",
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
    logger.error("Macro Agent orchestration failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      matchId,
    });

    await failSession({
      sessionId: agentSessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      agentName: "MacroAgent",
      status: "failed",
      analysis: "Macro analysis failed",
      timestamp: Date.now(),
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolInvocations: toolInvocationCount,
      },
    };
  }
}
