# Task 7.10: Implement Build Agent Orchestrator

**Status**: ✅ Complete

## Overview

Implement the Lambda orchestrator function for the Build Analysis Agent with **enhanced streaming** and **trace event handling**. This orchestrator replaces the direct analysis Lambda function with an AI-powered agent invocation that provides real-time transparency into agent reasoning and tool usage.

---

## Key Concepts

### What are Agent Orchestrators?

Orchestrators are Lambda functions that:
1. **Receive analysis requests** from Step Functions
2. **Invoke Bedrock Agents** with streaming enabled
3. **Handle trace events** for real-time progress updates
4. **Send WebSocket messages** showing agent reasoning and tool calls
5. **Return final analysis** to Step Functions

### Enhanced Streaming with Trace Events

When `enableTrace: true` is set, Bedrock Agents emit detailed events:

- **PreProcessingTrace**: Input validation before orchestration begins
- **OrchestrationTrace**: Contains three critical sub-events:
  - `rationale`: Agent's reasoning for the next action
  - `invocationInput`: Which tool is being called with parameters
  - `observation`: Results returned from the tool after execution
- **PostProcessingTrace**: Final response formatting
- **FailureTrace**: Error details if any step fails

**User Experience Benefit:**

Instead of seeing "Agent is thinking...", users now see:
- "🔍 Retrieving build data from match history..." (tool starts)
- "✓ Build data retrieved successfully" (tool completes)
- "Agent reasoning: I need to analyze the efficiency next..."

### Cost Optimization

Trace events increase token usage by ~20-30%. To optimize:
- **Testing**: `ENABLE_BEDROCK_TRACES=false` (saves costs)
- **Production**: `ENABLE_BEDROCK_TRACES=true` (better UX)

---

## Prerequisites

Before implementing this orchestrator:
- [x] [Task 7.1: Project Setup](./task-71-update-project-setup.md) completed
- [x] [Task 7.2: SAM Template](./task-72-define-bedrock-agents.md) deployed
- [x] [Task 7.3: Build Action Group](./task-73-build-action-groups.md) implemented
- [x] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.10.1: Create Build Agent Orchestrator File

Create orchestrator for Build Analysis Agent with trace handlers, **Zod validation**, and **Idempotency**.

- [x] Create `apps/aws/src/agents/orchestrators/build-agent.ts`
- [x] Import bedrock client and session manager
- [x] Import Powertools utilities (Idempotency, Logger)
- [x] Import Zod schemas (agentOrchestratorInputSchema)
- [x] Configure idempotency persistence layer
- [x] Define input/output interfaces

### 7.10.2: Implement Core Handler Logic

- [x] **Validate EventBridge input using Zod schema**
- [x] **Wrap agent invocation with makeIdempotent**
- [x] Implement handler with trace event callbacks
- [x] Add WebSocket progress updates (20-35%)
- [x] Track tools invoked
- [x] Return structured analysis result
- [x] Add correlation ID logging

### 7.10.3: Implement Trace Event Handlers

- [x] Implement `onChunk` handler for text streaming
- [x] Implement `onPreProcessing` handler for input validation
- [x] Implement `onRationale` handler for agent reasoning
- [x] Implement `onToolInvocationStart` handler
- [x] Implement `onToolInvocationComplete` handler
- [x] Implement `onPostProcessing` handler
- [x] Implement `onError` handler

### 7.10.4: Integrate Session Management

- [x] Register session at start with `registerAgentSession()`
- [x] Mark session complete on success with `markSessionComplete()`
- [x] Mark session failed on error with `markSessionFailed()`
- [x] Include metadata (tools invoked, response length)

**Key Features:**
- Progress range: 20-35%
- Tool messages: 🔍 (data retrieval), 📊 (analysis), 💡 (recommendations)
- Session tracking with completion metadata

---

## Implementation Example

**File:** `apps/aws/src/agents/orchestrators/build-agent.ts`

```typescript
import { Handler } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { ZodError } from 'zod';
import { sendWebSocketUpdate } from '../../shared/websocket-client';
import { invokeBedrockAgentWithTracing } from '../../shared/bedrock-client';
import { 
  registerAgentSession, 
  markSessionComplete, 
  markSessionFailed 
} from '../../shared/session-manager';
import { agentOrchestratorInputSchema, type AgentOrchestratorInput } from '../../shared/schemas';

interface BuildAgentOutput {
  agentName: string;
  status: 'success' | 'failed';
  analysis: string;
  timestamp: number;
  toolsInvoked: string[];
}

const logger = new Logger({ serviceName: 'BuildAgentOrchestrator' });

// Configure idempotency persistence layer
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

// Idempotent agent invocation function
// Returns cached result if Step Functions retries
const invokeBuildAgentIdempotent = makeIdempotent(
  async (input: AgentOrchestratorInput): Promise<BuildAgentOutput> => {
    const { keys, sessionId, matchId, puuid } = input;
    const toolsInvoked: string[] = [];
    let currentProgress = 20;
    
    // Generate isolated session ID
    const agentSessionId = `${sessionId}-build-${Date.now()}`;

    logger.info('Build Agent orchestrator started', { 
      matchId, 
      sessionId,
      correlationId: sessionId 
    });

    try {
    // Register session for tracking
    await registerAgentSession({
      sessionId: agentSessionId,
      agentType: 'BuildAgent',
      userSessionId: sessionId,
      matchId
    });

    // Initial update
    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Build Agent initializing...',
      agent: 'BuildAgent',
      progress: currentProgress,
    });

    let chunkCount = 0;

    // Invoke agent with enhanced trace handling
    const fullResponse = await invokeBedrockAgentWithTracing({
      agentId: process.env.BEDROCK_AGENT_ID!,
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID!,
      sessionId: agentSessionId,
      inputText: `Analyze the build optimization for match ${matchId} and player ${puuid}. 
                  Retrieve the match build data, analyze build efficiency, and provide 
                  situational item recommendations.`,
      handlers: {
        // Text chunks
        onChunk: async (chunk) => {
          chunkCount++;
          
          // Send periodic updates
          if (chunkCount % 10 === 0) {
            currentProgress = Math.min(currentProgress + 1, 34);
            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: `Build Agent generating insights... (${chunkCount} chunks)`,
              agent: 'BuildAgent',
              progress: currentProgress,
            });
          }
        },

        // Pre-processing validation
        onPreProcessing: async (validation) => {
          await sendWebSocketUpdate(sessionId, {
            status: 'processing',
            message: validation.isValid 
              ? 'Build Agent: Input validated ✓' 
              : 'Build Agent: Input needs clarification',
            agent: 'BuildAgent',
            progress: 21,
          });
        },

        onRationale: async (reasoning) => {
          logger.info('Build Agent reasoning received', { reasoning: reasoning.substring(0, 100) });
          await sendWebSocketUpdate(sessionId, {
            status: 'processing',
            message: `Build Agent: ${reasoning.substring(0, 80)}...`,
            agent: 'BuildAgent',
            progress: currentProgress,
          });
        },

        onToolInvocationStart: async (toolName, parameters) => {
          logger.info('Tool invocation started', { toolName, parameters });
          currentProgress = Math.min(currentProgress + 3, 34);
          
          const toolMessages: Record<string, string> = {
            getMatchBuildData: '🔍 Retrieving build data from match history...',
            analyzeBuildEfficiency: '📊 Analyzing build efficiency and power spikes...',
            recommendItemAdaptations: '💡 Generating situational recommendations...',
          };

          await sendWebSocketUpdate(sessionId, {
            status: 'processing',
            message: toolMessages[toolName] || `Build Agent: Calling ${toolName}...`,
            agent: 'BuildAgent',
            progress: currentProgress,
            toolInvocation: {
              tool: toolName,
              status: 'started',
              parameters,
            },
          });
        },

        // Tool invocation completed
        onToolInvocationComplete: async (toolName, result) => {
          logger.info('Tool invocation completed', { toolName, resultLength: result.length });
          toolsInvoked.push(toolName);
          currentProgress = Math.min(currentProgress + 2, 34);

          const completionMessages: Record<string, string> = {
            getMatchBuildData: '✓ Build data retrieved successfully',
            analyzeBuildEfficiency: '✓ Efficiency analysis complete',
            recommendItemAdaptations: '✓ Recommendations generated',
          };

          await sendWebSocketUpdate(sessionId, {
            status: 'processing',
            message: completionMessages[toolName] || `Build Agent: ${toolName} complete`,
            agent: 'BuildAgent',
            progress: currentProgress,
            toolInvocation: {
              tool: toolName,
              status: 'completed',
              resultPreview: result.substring(0, 100),
            },
          });
        },

        // Post-processing
        onPostProcessing: async (finalText) => {
          await sendWebSocketUpdate(sessionId, {
            status: 'processing',
            message: 'Build Agent: Formatting final response...',
            agent: 'BuildAgent',
            progress: 34,
          });
        },

        // Error handling
        onError: async (error) => {
          await sendWebSocketUpdate(sessionId, {
            status: 'error',
            message: `Build Agent error: ${error}`,
            agent: 'BuildAgent',
          });
        },
      },
    });

    // Final completion update
    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: `Build Agent analysis complete (${toolsInvoked.length} tools used)`,
      agent: 'BuildAgent',
      progress: 35,
      toolsInvoked,
    });

    // Mark session as complete
    await markSessionComplete(agentSessionId, {
      toolsInvoked,
      responseLength: fullResponse.length
    });

    logger.info('Build Agent analysis complete', { 
      matchId, 
      sessionId: agentSessionId,
      responseLength: fullResponse.length,
      chunks: chunkCount,
      toolsInvoked,
      correlationId: sessionId 
    });

    return {
      agentName: 'BuildAgent',
      status: 'success',
      analysis: fullResponse,
      timestamp: Date.now(),
      toolsInvoked,
    };

  } catch (error) {
    logger.error('Build Agent error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      matchId,
      correlationId: sessionId 
    });

    // Mark session as failed
    await markSessionFailed(
      agentSessionId, 
      error instanceof Error ? error.message : 'Unknown error'
    );

    await sendWebSocketUpdate(sessionId, {
      status: 'error',
      message: 'Build Agent analysis failed',
      agent: 'BuildAgent',
    });

    return {
      agentName: 'BuildAgent',
      status: 'failed',
      analysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
      toolsInvoked,
    };
  }
  },
  {
    persistenceStore,
    dataIndexArgument: 0, // Use input object for idempotency key
  }
);

// Main handler with input validation
export const handler: Handler = async (event: unknown): Promise<BuildAgentOutput> => {
  try {
    // Validate input using Zod schema
    const validatedInput = agentOrchestratorInputSchema.parse(event);
    
    logger.info('Input validated', { 
      matchId: validatedInput.matchId,
      correlationId: validatedInput.sessionId 
    });

    // Invoke with idempotency - returns cached result on retry
    return await invokeBuildAgentIdempotent(validatedInput);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Invalid input schema', { errors: error.errors });
      return {
        agentName: 'BuildAgent',
        status: 'failed',
        analysis: 'Invalid input event',
        timestamp: Date.now(),
        toolsInvoked: [],
      };
    }
    throw error;
  }
};
```

---

## WebSocket Message Timeline

**Build Agent execution:**

| **Event** | **Message** | **Progress** | **Timing** |
|-----------|-------------|--------------|------------|
| Start | "Build Agent initializing..." | 20% | t=0s |
| Pre-processing | "Build Agent: Input validated ✓" | 21% | t=0.5s |
| Reasoning | "Build Agent: I need to retrieve build data..." | 21% | t=1s |
| Tool #1 start | "🔍 Retrieving build data from match history..." | 24% | t=1.2s |
| Tool #1 complete | "✓ Build data retrieved successfully" | 26% | t=2s |
| Tool #2 start | "📊 Analyzing build efficiency and power spikes..." | 29% | t=3s |
| Tool #2 complete | "✓ Efficiency analysis complete" | 31% | t=4s |
| Tool #3 start | "💡 Generating situational recommendations..." | 34% | t=4.5s |
| Tool #3 complete | "✓ Recommendations generated" | 36% | t=5.5s |
| Post-processing | "Build Agent: Formatting final response..." | 34% | t=7s |
| Complete | "Build Agent analysis complete (3 tools used)" | 35% | t=8s |

---

## Testing

### Local Testing

```bash
# Test with SAM local
sam local invoke BuildAgentOrchestratorFunction \
  --event test-events/build-agent-event.json

# Test with environment variables
BEDROCK_AGENT_ID=XXX \
BEDROCK_AGENT_ALIAS_ID=YYY \
ENABLE_BEDROCK_TRACES=true \
sam local invoke BuildAgentOrchestratorFunction
```

### Validation Checklist

- [x] All trace event handlers execute
- [x] WebSocket messages sent in correct order
- [x] Progress percentages within allocated range (20-35%)
- [x] Tool invocations tracked correctly
- [x] Session registered and marked complete
- [x] Error handling catches failures
- [x] Logs include all relevant context
- [x] Idempotency prevents duplicate invocations

---

## Next Steps

After completing this task:
1. Proceed to [Task 7.11: Combat Agent Orchestrator](./task-711-combat-orchestrator.md)
2. Test orchestrator with sample match data
3. Monitor CloudWatch Logs for trace events
4. Validate WebSocket messages in frontend

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 2429-3893
- [Task 7.9: Enhanced Bedrock Client](./task-79-enhanced-bedrock-client.md)
- [Task 7.3: Build Action Groups](./task-73-build-action-groups.md)
- [Bedrock Agent Streaming](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-streaming.html)
