/**
 * AWS Bedrock Agent Client with Streaming and Trace Event Processing
 *
 * This module provides utilities for invoking Bedrock Agents with streaming support
 * and comprehensive trace event handling for transparent AI reasoning visibility.
 */

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  type InvokeAgentCommandInput,
  type ResponseStream,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { sendWebSocketUpdate as sendWebSocketMessage } from "./websocket-client";

const logger = new Logger({ serviceName: "bedrock-client" });
const tracer = new Tracer({ serviceName: "bedrock-client" });

const bedrockClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Configuration for agent invocation
 */
export interface BedrockAgentConfig {
  agentId: string;
  agentAliasId: string;
  sessionId: string;
  inputText: string;
  enableTrace?: boolean;
}

/**
 * Result from agent invocation including response and metadata
 */
export interface BedrockAgentResult {
  completion: string;
  sessionId: string;
  traceEvents?: TraceEvent[];
  metadata: {
    tokensUsed?: number;
    executionTimeMs: number;
    toolInvocations: number;
  };
}

/**
 * Trace event types for monitoring agent reasoning
 */
export interface TraceEvent {
  type: "reasoning" | "tool_invocation" | "tool_result" | "preprocessing" | "postprocessing";
  timestamp: number;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Invokes a Bedrock Agent with streaming and comprehensive trace event handling
 *
 * This function:
 * - Streams agent responses in real-time
 * - Processes all trace event types (PreProcessing, Orchestration, PostProcessing)
 * - Sends WebSocket updates for transparent AI reasoning
 * - Returns complete response with metadata
 *
 * @param config - Agent invocation configuration
 * @returns Complete agent response with trace events and metadata
 */
export async function invokeBedrockAgentWithTracing(
  config: BedrockAgentConfig
): Promise<BedrockAgentResult> {
  const startTime = Date.now();
  const traceEvents: TraceEvent[] = [];
  let completion = "";
  let toolInvocationCount = 0;

  logger.info("Invoking Bedrock Agent", {
    agentId: config.agentId,
    sessionId: config.sessionId,
    enableTrace: config.enableTrace,
  });

  try {
    const input: InvokeAgentCommandInput = {
      agentId: config.agentId,
      agentAliasId: config.agentAliasId,
      sessionId: config.sessionId,
      inputText: config.inputText,
      enableTrace: config.enableTrace ?? true,
    };

    const command = new InvokeAgentCommand(input);
    const response = await bedrockClient.send(command);

    // Process streaming response
    if (response.completion) {
      for await (const event of response.completion) {
        await processStreamEvent(event, {
          traceEvents,
          completion: (text: string) => {
            completion += text;
          },
          toolInvocationCount: () => toolInvocationCount++,
          sessionId: config.sessionId,
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;

    logger.info("Agent invocation completed", {
      sessionId: config.sessionId,
      completionLength: completion.length,
      toolInvocations: toolInvocationCount,
      executionTimeMs,
    });

    return {
      completion,
      sessionId: config.sessionId,
      traceEvents: config.enableTrace ? traceEvents : undefined,
      metadata: {
        executionTimeMs,
        toolInvocations: toolInvocationCount,
      },
    };
  } catch (error) {
    logger.error("Agent invocation failed", {
      error,
      agentId: config.agentId,
      sessionId: config.sessionId,
    });
    throw error;
  }
}

/**
 * Context type for trace processing
 */
type TraceContext = {
  traceEvents: TraceEvent[];
  completion: (text: string) => void;
  toolInvocationCount: () => void;
  sessionId: string;
};

/**
 * Process preprocessing trace events
 */
async function processPreProcessingTrace(
  preProcessingTrace: any,
  context: TraceContext
): Promise<void> {
  const modelInvocationInput = preProcessingTrace.modelInvocationInput;
  if (modelInvocationInput?.text) {
    context.traceEvents.push({
      type: "preprocessing",
      timestamp: Date.now(),
      content: modelInvocationInput.text,
    });

    await sendWebSocketMessage(context.sessionId, {
      status: "processing",
      message: "Agent initializing and preparing context...",
      timestamp: Date.now(),
      data: { phase: "preprocessing", sessionId: context.sessionId },
    });
  }
}

/**
 * Process agent rationale trace
 */
async function processRationaleTrace(
  rationale: any,
  context: TraceContext
): Promise<void> {
  if (rationale?.text) {
    context.traceEvents.push({
      type: "reasoning",
      timestamp: Date.now(),
      content: rationale.text,
    });

    await sendWebSocketMessage(context.sessionId, {
      status: "processing",
      message: rationale.text,
      timestamp: Date.now(),
      agent: undefined,
      data: { phase: "reasoning", sessionId: context.sessionId },
    });
  }
}

/**
 * Process tool invocation trace
 */
async function processToolInvocationTrace(
  invocationInput: any,
  context: TraceContext
): Promise<void> {
  const actionGroupInvocationInput = invocationInput.actionGroupInvocationInput;

  if (actionGroupInvocationInput) {
    context.toolInvocationCount();
    const toolName = actionGroupInvocationInput.apiPath || "unknown";

    context.traceEvents.push({
      type: "tool_invocation",
      timestamp: Date.now(),
      content: `Invoking tool: ${toolName}`,
      metadata: {
        actionGroup: actionGroupInvocationInput.actionGroupName,
        apiPath: actionGroupInvocationInput.apiPath,
        parameters: actionGroupInvocationInput.parameters,
      },
    });

    await sendWebSocketMessage(context.sessionId, {
      status: "processing",
      message: `Invoking tool: ${toolName}`,
      timestamp: Date.now(),
      data: {
        phase: "tool_invocation",
        sessionId: context.sessionId,
        toolName,
        actionGroup: actionGroupInvocationInput.actionGroupName,
      },
    });
  }
}

/**
 * Process tool observation trace
 */
async function processObservationTrace(
  observation: any,
  context: TraceContext
): Promise<void> {
  const actionGroupInvocationOutput = observation.actionGroupInvocationOutput;

  if (actionGroupInvocationOutput?.text) {
    context.traceEvents.push({
      type: "tool_result",
      timestamp: Date.now(),
      content: actionGroupInvocationOutput.text,
    });

    await sendWebSocketMessage(context.sessionId, {
      status: "processing",
      message: "Tool completed",
      timestamp: Date.now(),
      data: { phase: "tool_result", sessionId: context.sessionId, success: true },
    });
  }
}

/**
 * Process orchestration trace events
 */
async function processOrchestrationTrace(
  orchestrationTrace: any,
  context: TraceContext
): Promise<void> {
  // Rationale - Agent's reasoning before taking action
  if (orchestrationTrace.rationale) {
    await processRationaleTrace(orchestrationTrace.rationale, context);
  }

  // InvocationInput - Tool being invoked
  if (orchestrationTrace.invocationInput) {
    await processToolInvocationTrace(orchestrationTrace.invocationInput, context);
  }

  // Observation - Tool execution result
  if (orchestrationTrace.observation) {
    await processObservationTrace(orchestrationTrace.observation, context);
  }
}

/**
 * Process postprocessing trace events
 */
function processPostProcessingTrace(
  postProcessingTrace: any,
  context: TraceContext
): void {
  const modelInvocationOutput = postProcessingTrace.modelInvocationOutput;
  if (modelInvocationOutput) {
    context.traceEvents.push({
      type: "postprocessing",
      timestamp: Date.now(),
      content: "Agent finalizing response",
    });
  }
}

/**
 * Process individual stream events from Bedrock Agent response
 */
async function processStreamEvent(
  event: ResponseStream,
  context: TraceContext
): Promise<void> {
  // Chunk events - Agent response text
  if (event.chunk && event.chunk.bytes) {
    const text = new TextDecoder().decode(event.chunk.bytes);
    context.completion(text);
  }

  // Trace events - Agent reasoning and tool invocations
  if (event.trace && event.trace.trace) {
    const trace = event.trace.trace;

    if (trace.preProcessingTrace) {
      await processPreProcessingTrace(trace.preProcessingTrace, context);
    }

    if (trace.orchestrationTrace) {
      await processOrchestrationTrace(trace.orchestrationTrace, context);
    }

    if (trace.postProcessingTrace) {
      processPostProcessingTrace(trace.postProcessingTrace, context);
    }
  }
}

/**
 * Helper function to format agent input for specific analysis types
 */
export function formatAgentInput(params: {
  analysisType: string;
  matchId: string;
  puuid: string;
  context?: Record<string, unknown>;
}): string {
  const { analysisType, matchId, puuid, context } = params;

  let prompt = `Analyze ${analysisType} for match ${matchId} and player ${puuid}.\n\n`;

  if (context) {
    prompt += "Additional context:\n";
    for (const [key, value] of Object.entries(context)) {
      prompt += `- ${key}: ${JSON.stringify(value)}\n`;
    }
  }

  prompt += "\nPlease provide a detailed analysis with specific recommendations.";

  return prompt;
}
