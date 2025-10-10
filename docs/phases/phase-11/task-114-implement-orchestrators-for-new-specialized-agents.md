# Task 11.4: Implement Orchestrators for New Specialized Agents

**Status:** 🔄 Pending

## Overview

Implement orchestrators for the newly defined specialized agents (Macro, Positioning, Temporal, Synergy, Adaptation). Orchestrators invoke the corresponding Bedrock Agent with streaming, manage progress updates over WebSocket, and record session status.

Follow the same structure as the BuildAgent orchestrator from Phase 7 (see `phase-07/task-710-build-orchestrator.md`).

---

## Files to Add

- `src/agents/orchestrators/macro-agent.ts`
- `src/agents/orchestrators/positioning-agent.ts`
- `src/agents/orchestrators/temporal-agent.ts`
- `src/agents/orchestrators/synergy-agent.ts`
- `src/agents/orchestrators/adaptation-agent.ts`

Each should mirror the pattern below.

---

## Example: MacroAgent Orchestrator

```ts
// src/agents/orchestrators/macro-agent.ts
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
  markSessionFailed,
} from '../../shared/session-manager';
import { agentOrchestratorInputSchema, type AgentOrchestratorInput } from '../../shared/schemas';

const logger = new Logger({ serviceName: 'MacroAgentOrchestrator' });

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

interface MacroAgentOutput {
  agentName: string;
  status: 'success' | 'failed';
  analysis: string;
  timestamp: number;
  toolsInvoked: string[];
}

const invokeMacroAgentIdempotent = makeIdempotent(
  async (input: AgentOrchestratorInput): Promise<MacroAgentOutput> => {
    const { keys, sessionId, matchId, puuid } = input;
    const toolsInvoked: string[] = [];
    let currentProgress = 36; // MacroAgent progress range: 36-50%
    
    const agentSessionId = `${sessionId}-macro-${Date.now()}`;

    logger.info('Macro Agent orchestrator started', { matchId, sessionId });

    try {
      await registerAgentSession({
        sessionId: agentSessionId,
        agentType: 'MacroAgent',
        userSessionId: sessionId,
        matchId,
      });

      await sendWebSocketUpdate(sessionId, {
        status: 'processing',
        message: 'Macro Agent initializing...',
        agent: 'MacroAgent',
        progress: currentProgress,
      });

      let chunkCount = 0;

      const fullResponse = await invokeBedrockAgentWithTracing({
        agentId: process.env.BEDROCK_AGENT_ID!,
        agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID!,
        sessionId: agentSessionId,
        inputText: `Analyze the macro gameplay for match ${matchId} and player ${puuid}. 
                    Evaluate map movements, roaming efficiency, objective control timing, and 
                    strategic decision-making. Compare to high-elo benchmarks.`,
        handlers: {
          onChunk: async (chunk) => {
            chunkCount++;
            if (chunkCount % 10 === 0) {
              currentProgress = Math.min(currentProgress + 1, 49);
              await sendWebSocketUpdate(sessionId, {
                status: 'processing',
                message: `Macro Agent analyzing... (${chunkCount} chunks)`,
                agent: 'MacroAgent',
                progress: currentProgress,
              });
            }
          },

          onPreProcessing: async (validation) => {
            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: validation.isValid 
                ? 'Macro Agent: Input validated ✓' 
                : 'Macro Agent: Input needs clarification',
              agent: 'MacroAgent',
              progress: 37,
            });
          },

          onRationale: async (reasoning) => {
            logger.info('Macro Agent reasoning', { reasoning: reasoning.substring(0, 100) });
            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: `Macro Agent: ${reasoning.substring(0, 80)}...`,
              agent: 'MacroAgent',
              progress: currentProgress,
            });
          },

          onToolInvocationStart: async (toolName, parameters) => {
            logger.info('Tool invocation started', { toolName, parameters });
            currentProgress = Math.min(currentProgress + 3, 49);
            
            const toolMessages: Record<string, string> = {
              getPlayerMovementPatterns: '🗺️ Analyzing map movement patterns...',
              getObjectiveControlAnalysis: '🐉 Evaluating objective control...',
              getRoamingEfficiencyMetrics: '🏃 Calculating roaming efficiency...',
              getMapPressureBenchmarks: '📊 Fetching high-elo benchmarks...',
            };

            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: toolMessages[toolName] || `Macro Agent: Calling ${toolName}...`,
              agent: 'MacroAgent',
              progress: currentProgress,
              toolInvocation: {
                tool: toolName,
                status: 'started',
                parameters,
              },
            });
          },

          onToolInvocationComplete: async (toolName, result) => {
            logger.info('Tool invocation completed', { toolName, resultLength: result.length });
            toolsInvoked.push(toolName);
            currentProgress = Math.min(currentProgress + 2, 49);

            const completionMessages: Record<string, string> = {
              getPlayerMovementPatterns: '✓ Movement patterns analyzed',
              getObjectiveControlAnalysis: '✓ Objective control evaluated',
              getRoamingEfficiencyMetrics: '✓ Roaming efficiency calculated',
              getMapPressureBenchmarks: '✓ Benchmarks retrieved',
            };

            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: completionMessages[toolName] || `Macro Agent: ${toolName} complete`,
              agent: 'MacroAgent',
              progress: currentProgress,
              toolInvocation: {
                tool: toolName,
                status: 'completed',
                resultPreview: result.substring(0, 100),
              },
            });
          },

          onPostProcessing: async (finalText) => {
            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: 'Macro Agent: Formatting analysis...'
            });
          },
        },
      });

      await markSessionComplete(agentSessionId);

      await sendWebSocketUpdate(sessionId, {
        status: 'processing',
        message: 'Macro Agent: Analysis complete',
        agent: 'MacroAgent',
        progress: 50,
      });

      return {
        agentName: 'MacroAgent',
        status: 'success',
        analysis: fullResponse,
        timestamp: Date.now(),
        toolsInvoked,
      };
    } catch (error) {
      logger.error('Macro Agent orchestrator failed', { error });
      await markSessionFailed(agentSessionId, String(error));
      throw error;
    }
  },
  { persistenceStore }
);

export const handler: Handler = async (raw) => {
  const parsed = agentOrchestratorInputSchema.parse(raw);
  return invokeMacroAgentIdempotent(parsed);
};
```

---

## Acceptance Criteria

- Orchestrators compile and run locally with mock events.
- Streaming progress updates are emitted during chunking and tool calls.
- Idempotency is applied using Powertools persistence layer.

## References

- Source: `docs/Enhance phase 11 to include Specific fields from t.md` → Section 4, Task 11.4
- Pattern: `docs/phases/phase-07/task-710-build-orchestrator.md`
