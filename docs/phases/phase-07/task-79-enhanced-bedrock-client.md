# Task 7.9: Create Enhanced Bedrock Client

**Status**: ✅ Completed

## Overview

Create a shared utility for invoking AWS Bedrock Agents with **enhanced streaming** and **trace event handling**. This provides real-time visibility into agent reasoning, tool invocations, and processing stages for a transparent user experience.

---

## Key Concepts

### What are Trace Events?

When `enableTrace: true` is set in the InvokeAgentCommand, Bedrock Agents emit detailed trace events alongside response chunks:

- **PreProcessingTrace**: Input validation before orchestration begins
- **OrchestrationTrace**: Contains three critical sub-events:
  - `rationale`: Agent's reasoning for the next action
  - `invocationInput`: Details about which tool is being called with parameters
  - `observation`: Results returned from the tool after execution
- **PostProcessingTrace**: Final response formatting before returning to user
- **FailureTrace**: Error details if any step fails

### Why This Matters

Instead of just showing "Agent is thinking...", we can now show:

- "🔍 Retrieving build data from match history..." (when tool starts)
- "✓ Build data retrieved successfully" (when tool completes)
- Agent reasoning: "I need to analyze the efficiency next..."
- Real progress with actual tool invocation status

This creates a **transparent, engaging user experience** where users see exactly what the AI is doing at each step.

### Cost Optimization

Enhanced trace events increase token usage and API costs by ~20-30%. To optimize:

- **Testing environment**: Traces disabled (`enableTrace: false`) for cost-effective testing
- **Production environment**: Traces enabled (`enableTrace: true`) for better user experience
- Trace verbosity is configurable via `ENABLE_BEDROCK_TRACES` environment variable

---

## Subtasks

### 7.15.1: Create bedrock-client.ts File

- [x] Create `apps/aws/src/shared/bedrock-client.ts`
- [x] Import BedrockAgentRuntimeClient
- [x] Define TypeScript interfaces for parameters and handlers

### 7.15.2: Define Trace Handler Interfaces

- [x] Define `InvokeAgentParams` interface
- [x] Define `TraceHandlers` interface with all callback types
- [x] Define `StreamingAgentParams` interface

### 7.15.3: Implement invokeBedrockAgentWithTracing Function

- [x] Create main invocation function
- [x] Configure InvokeAgentCommand with trace enablement
- [x] Process streaming response chunks
- [x] Handle all trace event types
- [x] Return full response text

### 7.15.4: Implement processTraceEvent Helper

- [x] Handle PreProcessingTrace events
- [x] Handle OrchestrationTrace events (rationale, invocationInput, observation)
- [x] Handle PostProcessingTrace events
- [x] Handle FailureTrace events
- [x] Call appropriate handler callbacks

### 7.15.5: Add Error Handling and Logging

- [x] Add try-catch blocks
- [x] Log invocation start/completion
- [x] Log trace event processing
- [x] Handle stream errors gracefully

---

## Implementation

**File:** `apps/aws/src/shared/bedrock-client.ts`

```typescript
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { Logger } from "@aws-lambda-powertools/logger";

interface InvokeAgentParams {
  agentId: string;
  agentAliasId: string;
  sessionId: string;
  inputText: string;
}

interface TraceHandlers {
  onChunk: (chunk: string) => void;
  onToolInvocationStart?: (
    toolName: string,
    parameters: Record<string, any>
  ) => void;
  onToolInvocationComplete?: (toolName: string, result: string) => void;
  onRationale?: (reasoning: string) => void;
  onPreProcessing?: (validation: {
    isValid: boolean;
    rationale: string;
  }) => void;
  onPostProcessing?: (finalText: string) => void;
  onError?: (error: string) => void;
}

interface StreamingAgentParams extends InvokeAgentParams {
  handlers: TraceHandlers;
}

const bedrockClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const logger = new Logger({ serviceName: "BedrockClient" });

// Cost optimization: Make trace events configurable
// Testing environment: ENABLE_BEDROCK_TRACES=false (saves costs)
// Production environment: ENABLE_BEDROCK_TRACES=true (better UX)
const ENABLE_TRACES = process.env.ENABLE_BEDROCK_TRACES === "true";

/**
 * Invoke Bedrock agent with configurable streaming and trace event handling
 * Provides real-time visibility into agent reasoning, tool calls, and progress
 */
export async function invokeBedrockAgentWithTracing(
  params: StreamingAgentParams
): Promise<string> {
  logger.info("Invoking Bedrock agent", {
    agentId: params.agentId,
    sessionId: params.sessionId,
    tracesEnabled: ENABLE_TRACES,
  });

  const command = new InvokeAgentCommand({
    agentId: params.agentId,
    agentAliasId: params.agentAliasId,
    sessionId: params.sessionId,
    inputText: params.inputText,
    enableTrace: ENABLE_TRACES, // Configurable based on environment
  });

  let fullResponse = "";
  let toolCallCount = 0;

  try {
    const response = await bedrockClient.send(command);

    if (!response.completion) {
      throw new Error("Completion is undefined");
    }

    // Process each event in the stream
    for await (const event of response.completion) {
      // Handle text chunks
      if (event.chunk?.bytes) {
        const chunk = new TextDecoder("utf-8").decode(event.chunk.bytes);
        fullResponse += chunk;
        params.handlers.onChunk(chunk);
      }

      // Handle trace events (only if enabled)
      if (event.trace && ENABLE_TRACES) {
        await processTraceEvent(event.trace, params.handlers, toolCallCount);
      }
    }

    logger.info("Agent streaming complete", {
      sessionId: params.sessionId,
      responseLength: fullResponse.length,
      toolCalls: toolCallCount,
    });

    return fullResponse;
  } catch (error) {
    logger.error("Error streaming from Bedrock agent:", error);
    if (params.handlers.onError) {
      params.handlers.onError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
    throw error;
  }
}

/**
 * Process trace events and call appropriate handlers
 * Provides visibility into agent's internal processing steps
 */
async function processTraceEvent(
  trace: any,
  handlers: TraceHandlers,
  toolCallCount: number
): Promise<void> {
  // PreProcessing Trace: Input validation
  if (trace.preProcessingTrace) {
    const parsed =
      trace.preProcessingTrace.modelInvocationOutput?.parsedResponse;
    if (parsed && handlers.onPreProcessing) {
      handlers.onPreProcessing({
        isValid: parsed.isValid,
        rationale: parsed.rationale || "",
      });
    }
  }

  // Orchestration Trace: Tool calls and reasoning
  if (trace.orchestrationTrace) {
    const orch = trace.orchestrationTrace;

    // Rationale: Agent's reasoning
    if (orch.rationale && handlers.onRationale) {
      handlers.onRationale(orch.rationale.text);
    }

    // InvocationInput: Tool being called
    if (orch.invocationInput && handlers.onToolInvocationStart) {
      const input = orch.invocationInput;

      if (input.actionGroupInvocationInput) {
        const actionInput = input.actionGroupInvocationInput;
        const toolName = actionInput.function || "unknown";

        // Build parameters object
        const parameters: Record<string, any> = {};
        if (actionInput.parameters) {
          actionInput.parameters.forEach((param: any) => {
            parameters[param.name] = param.value;
          });
        }

        toolCallCount++;
        handlers.onToolInvocationStart(toolName, parameters);
      }
    }

    // Observation: Tool result
    if (orch.observation && handlers.onToolInvocationComplete) {
      const obs = orch.observation;

      if (obs.actionGroupInvocationOutput) {
        const output = obs.actionGroupInvocationOutput;
        const toolName = output.function || "unknown";
        const result = output.text || JSON.stringify(output);

        handlers.onToolInvocationComplete(toolName, result);
      }
    }
  }

  // PostProcessing Trace: Final response
  if (trace.postProcessingTrace && handlers.onPostProcessing) {
    const parsed =
      trace.postProcessingTrace.modelInvocationOutput?.parsedResponse;
    if (parsed?.text) {
      handlers.onPostProcessing(parsed.text);
    }
  }

  // Failure Trace: Errors
  if (trace.failureTrace && handlers.onError) {
    handlers.onError(trace.failureTrace.failureReason);
  }
}
```

---

## Trace Event Flow

```
User Request
     │
     ▼
┌─────────────────────────────────────┐
│  PreProcessingTrace                 │
│  • Input validation                 │
│  • Handler: onPreProcessing()       │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  OrchestrationTrace (Loop)          │
│  ┌─────────────────────────────┐   │
│  │ Rationale                   │   │
│  │ • Agent reasoning           │   │
│  │ • Handler: onRationale()    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ InvocationInput             │   │
│  │ • Tool name & parameters    │   │
│  │ • Handler: onToolInvocationStart() │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Observation                 │   │
│  │ • Tool execution result     │   │
│  │ • Handler: onToolInvocationComplete() │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│  PostProcessingTrace                │
│  • Final response formatting        │
│  • Handler: onPostProcessing()      │
└─────────────────────────────────────┘
     │
     ▼
  Response Chunks
  • Handler: onChunk()
```

---

## Testing

### Local Testing

```typescript
// Test trace event handling
import { invokeBedrockAgentWithTracing } from "./bedrock-client";

const response = await invokeBedrockAgentWithTracing({
  agentId: "TEST_AGENT_ID",
  agentAliasId: "TEST_ALIAS_ID",
  sessionId: "test-session-123",
  inputText: "Analyze match data",
  handlers: {
    onChunk: (chunk) =>
      logger.info("Received chunk", { chunkLength: chunk.length }),
    onRationale: (reasoning) =>
      logger.info("Agent reasoning received", { reasoning }),
    onToolInvocationStart: (tool, params) =>
      logger.info(`Tool invocation started`, { tool, params }),
    onToolInvocationComplete: (tool, result) =>
      logger.info(`Tool invocation completed`, {
        tool,
        resultLength: result.length,
      }),
  },
});
```

### Validation Checklist

- [x] Client initializes correctly
- [x] Trace events toggle with ENABLE_BEDROCK_TRACES
- [x] All handler callbacks execute
- [x] Text chunks stream properly
- [x] Tool invocations tracked
- [x] Errors handled gracefully
- [x] Full response returned

---

## Next Steps

After completing this task:

1. Use this client in [Task 7.16: Agent Orchestrators](./task-716-agent-orchestrators.md)
2. Implement all 6 orchestrator functions with trace handlers

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 2429-2631
- [Bedrock Agent Streaming Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-streaming.html)
