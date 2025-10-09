# Task 7.11: Implement Combat Agent Orchestrator

**Status**: 🔄 Pending

## Overview

Implement the Lambda orchestrator function for the Combat Analysis Agent with **enhanced streaming** and **trace event handling**. This orchestrator provides real-time transparency into combat analysis, damage calculations, and teamfight positioning insights.

---

## Prerequisites

Before implementing this orchestrator:
- [ ] [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md) completed
- [ ] [Task 7.4: Combat Action Group](./task-74-combat-action-groups.md) implemented
- [ ] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.11.1: Create Combat Agent Orchestrator File

- [ ] Create `apps/aws/src/agents/orchestrators/combat-agent.ts`
- [ ] Import bedrock client and session manager
- [ ] Import Powertools utilities (Idempotency, Logger)
- [ ] Import Zod schemas (agentOrchestratorInputSchema)
- [ ] Configure idempotency persistence layer
- [ ] Define CombatAgentOutput interface

### 7.11.2: Implement Core Handler Logic

- [ ] Validate EventBridge input using Zod schema
- [ ] Wrap agent invocation with makeIdempotent
- [ ] Set progress range to 35-50%
- [ ] Track tools invoked
- [ ] Return structured analysis result

### 7.11.3: Implement Combat-Specific Trace Handlers

- [ ] Add combat-specific tool messages:
  - ⚔️ `getCombatStats`: "Retrieving combat statistics..."
  - 📈 `analyzeDamagePatterns`: "Analyzing damage output and patterns..."
  - 🎯 `evaluateTeamfightPositioning`: "Evaluating teamfight positioning..."
- [ ] Implement progress updates (35-50%)
- [ ] Add WebSocket streaming for real-time feedback

### 7.11.4: Integrate Session Management

- [ ] Register session with agentType: 'CombatAgent'
- [ ] Mark session complete on success
- [ ] Mark session failed on error
- [ ] Include combat-specific metadata

**Key Features:**
- Progress range: 35-50%
- Tool messages: ⚔️ (stats), 📈 (damage), 🎯 (teamfight)
- Session tracking with completion metadata

---

## Implementation Pattern

**File:** `apps/aws/src/agents/orchestrators/combat-agent.ts`

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

interface CombatAgentOutput {
  agentName: string;
  status: 'success' | 'failed';
  analysis: string;
  timestamp: number;
  toolsInvoked: string[];
}

const logger = new Logger({ serviceName: 'CombatAgentOrchestrator' });

const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE!,
});

const invokeCombatAgentIdempotent = makeIdempotent(
  async (input: AgentOrchestratorInput): Promise<CombatAgentOutput> => {
    const { keys, sessionId, matchId, puuid } = input;
    const toolsInvoked: string[] = [];
    let currentProgress = 35;
    
    const agentSessionId = `${sessionId}-combat-${Date.now()}`;

    logger.info('Combat Agent orchestrator started', { 
      matchId, 
      sessionId,
      correlationId: sessionId 
    });

    try {
      await registerAgentSession({
        sessionId: agentSessionId,
        agentType: 'CombatAgent',
        userSessionId: sessionId,
        matchId
      });

      await sendWebSocketUpdate(sessionId, {
        status: 'processing',
        message: 'Combat Agent initializing...',
        agent: 'CombatAgent',
        progress: currentProgress,
      });

      let chunkCount = 0;

      const fullResponse = await invokeBedrockAgentWithTracing({
        agentId: process.env.COMBAT_AGENT_ID!,
        agentAliasId: process.env.COMBAT_AGENT_ALIAS_ID!,
        sessionId: agentSessionId,
        inputText: `Analyze combat performance for match ${matchId} and player ${puuid}. 
                    Retrieve combat statistics, analyze damage patterns, and evaluate 
                    teamfight positioning.`,
        handlers: {
          onChunk: async (chunk) => {
            chunkCount++;
            if (chunkCount % 10 === 0) {
              currentProgress = Math.min(currentProgress + 1, 49);
              await sendWebSocketUpdate(sessionId, {
                status: 'processing',
                message: `Combat Agent generating insights... (${chunkCount} chunks)`,
                agent: 'CombatAgent',
                progress: currentProgress,
              });
            }
          },

          onPreProcessing: async (validation) => {
            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: validation.isValid 
                ? 'Combat Agent: Input validated ✓' 
                : 'Combat Agent: Input needs clarification',
              agent: 'CombatAgent',
              progress: 36,
            });
          },

          onRationale: async (reasoning) => {
            logger.info('Combat Agent reasoning', { reasoning: reasoning.substring(0, 100) });
            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: `Combat Agent: ${reasoning.substring(0, 80)}...`,
              agent: 'CombatAgent',
              progress: currentProgress,
            });
          },

          onToolInvocationStart: async (toolName, parameters) => {
            logger.info('Tool invocation started', { toolName, parameters });
            currentProgress = Math.min(currentProgress + 3, 49);
            
            const toolMessages: Record<string, string> = {
              getCombatStats: '⚔️ Retrieving combat statistics...',
              analyzeDamagePatterns: '📈 Analyzing damage output and patterns...',
              evaluateTeamfightPositioning: '🎯 Evaluating teamfight positioning...',
            };

            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: toolMessages[toolName] || `Combat Agent: Calling ${toolName}...`,
              agent: 'CombatAgent',
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
              getCombatStats: '✓ Combat statistics retrieved',
              analyzeDamagePatterns: '✓ Damage analysis complete',
              evaluateTeamfightPositioning: '✓ Positioning evaluation complete',
            };

            await sendWebSocketUpdate(sessionId, {
              status: 'processing',
              message: completionMessages[toolName] || `Combat Agent: ${toolName} complete`,
              agent: 'CombatAgent',
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
              message: 'Combat Agent: Formatting final response...',
              agent: 'CombatAgent',
              progress: 49,
            });
          },

          onError: async (error) => {
            await sendWebSocketUpdate(sessionId, {
              status: 'error',
              message: `Combat Agent error: ${error}`,
              agent: 'CombatAgent',
            });
          },
        },
      });

      await sendWebSocketUpdate(sessionId, {
        status: 'processing',
        message: `Combat Agent analysis complete (${toolsInvoked.length} tools used)`,
        agent: 'CombatAgent',
        progress: 50,
        toolsInvoked,
      });

      await markSessionComplete(agentSessionId, {
        toolsInvoked,
        responseLength: fullResponse.length
      });

      logger.info('Combat Agent analysis complete', { 
        matchId, 
        sessionId: agentSessionId,
        responseLength: fullResponse.length,
        chunks: chunkCount,
        toolsInvoked,
        correlationId: sessionId 
      });

      return {
        agentName: 'CombatAgent',
        status: 'success',
        analysis: fullResponse,
        timestamp: Date.now(),
        toolsInvoked,
      };

    } catch (error) {
      logger.error('Combat Agent error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        matchId,
        correlationId: sessionId 
      });

      await markSessionFailed(
        agentSessionId, 
        error instanceof Error ? error.message : 'Unknown error'
      );

      await sendWebSocketUpdate(sessionId, {
        status: 'error',
        message: 'Combat Agent analysis failed',
        agent: 'CombatAgent',
      });

      return {
        agentName: 'CombatAgent',
        status: 'failed',
        analysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        toolsInvoked,
      };
    }
  },
  {
    persistenceStore,
    dataIndexArgument: 0,
  }
);

export const handler: Handler = async (event: unknown): Promise<CombatAgentOutput> => {
  try {
    const validatedInput = agentOrchestratorInputSchema.parse(event);
    
    logger.info('Input validated', { 
      matchId: validatedInput.matchId,
      correlationId: validatedInput.sessionId 
    });

    return await invokeCombatAgentIdempotent(validatedInput);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Invalid input schema', { errors: error.errors });
      return {
        agentName: 'CombatAgent',
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

## Testing

### Validation Checklist

- [ ] Progress range stays within 35-50%
- [ ] Combat-specific tool messages display correctly
- [ ] All trace event handlers execute
- [ ] Session tracking works correctly
- [ ] WebSocket messages sent in order
- [ ] Idempotency prevents duplicate invocations

---

## Next Steps

After completing this task:
1. Proceed to [Task 7.12: Vision Agent Orchestrator](./task-712-vision-orchestrator.md)
2. Test with sample combat data
3. Validate tool invocations

---

## References

- [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md) - Reference pattern
- [Task 7.4: Combat Action Groups](./task-74-combat-action-groups.md)
- [Phase 7 Update Guide](../../phase_7_update.md)
