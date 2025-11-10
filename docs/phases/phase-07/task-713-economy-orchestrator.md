# Task 7.13: Implement Economy Agent Orchestrator

**Status**: ✅ Complete 

## Overview

Implement the Lambda orchestrator function for the Economy Management Agent with **enhanced streaming** and **trace event handling**. This orchestrator provides real-time transparency into gold efficiency analysis, farming patterns, and resource optimization insights.

---

## Prerequisites

Before implementing this orchestrator:
- [x] [Task 7.12: Vision Agent Orchestrator](./task-712-vision-orchestrator.md) completed
- [x] [Task 7.6: Economy Action Group](./task-76-economy-action-groups.md) implemented
- [x] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.13.1: Create Economy Agent Orchestrator File

- [x] Create `apps/aws/src/agents/orchestrators/economy-agent.ts`
- [x] Import required dependencies
- [x] Configure idempotency persistence layer
- [x] Define EconomyAgentOutput interface

### 7.13.2: Implement Core Handler Logic

- [x] Validate input using Zod schema
- [x] Wrap agent invocation with makeIdempotent
- [x] Set progress range to 65-75%
- [x] Track tools invoked
- [x] Return structured analysis result

### 7.13.3: Implement Economy-Specific Trace Handlers

- [x] Add economy-specific tool messages:
  - 💰 `getGoldData`: "Retrieving gold and economy data..."
  - 📊 `analyzeGoldEfficiency`: "Analyzing gold efficiency and income..."
  - 🌾 `evaluateFarmingPatterns`: "Evaluating farming patterns and CS optimization..."
- [x] Implement progress updates (65-75%)
- [x] Add WebSocket streaming for real-time feedback

### 7.13.4: Integrate Session Management

- [x] Register session with agentType: 'EconomyAgent'
- [x] Mark session complete on success
- [x] Mark session failed on error
- [x] Include economy-specific metadata

**Key Features:**
- Progress range: 65-75%
- Tool messages: 💰 (gold data), 📊 (efficiency), 🌾 (farming)
- Session tracking with completion metadata

---

## Implementation Pattern

Follow the same pattern as previous orchestrators, with these adjustments:

**Progress Range:** 65-75%

**Tool Messages:**
```typescript
const toolMessages: Record<string, string> = {
  getGoldData: '💰 Retrieving gold and economy data...',
  analyzeGoldEfficiency: '📊 Analyzing gold efficiency and income...',
  evaluateFarmingPatterns: '🌾 Evaluating farming patterns and CS optimization...',
};

const completionMessages: Record<string, string> = {
  getGoldData: '✓ Gold data retrieved',
  analyzeGoldEfficiency: '✓ Efficiency analysis complete',
  evaluateFarmingPatterns: '✓ Farming pattern evaluation complete',
};
```

**Agent Prompt:**
```typescript
inputText: `Analyze economy management for match ${matchId} and player ${puuid}. 
            Retrieve gold data, analyze gold efficiency, and evaluate farming 
            patterns and CS optimization.`
```

---

## Testing

### Validation Checklist

- [x] Progress range stays within 65-75%
- [x] Economy-specific tool messages display correctly
- [x] All trace event handlers execute
- [x] Session tracking works correctly
- [x] WebSocket messages sent in order
- [x] Idempotency prevents duplicate invocations

---

## Next Steps

After completing this task:
1. Proceed to [Task 7.14: Champion Agent Orchestrator](./task-714-champion-orchestrator.md)
2. Test with sample economy data
3. Validate gold efficiency calculations

---

## References

- [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md) - Reference pattern
- [Task 7.6: Economy Action Groups](./task-76-economy-action-groups.md)
- [Phase 7 Update Guide](../../phase_7_update.md)
