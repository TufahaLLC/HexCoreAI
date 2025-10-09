# Task 7.13: Implement Economy Agent Orchestrator

**Status**: 🔄 Pending

## Overview

Implement the Lambda orchestrator function for the Economy Management Agent with **enhanced streaming** and **trace event handling**. This orchestrator provides real-time transparency into gold efficiency analysis, farming patterns, and resource optimization insights.

---

## Prerequisites

Before implementing this orchestrator:
- [ ] [Task 7.12: Vision Agent Orchestrator](./task-712-vision-orchestrator.md) completed
- [ ] [Task 7.6: Economy Action Group](./task-76-economy-action-groups.md) implemented
- [ ] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.13.1: Create Economy Agent Orchestrator File

- [ ] Create `apps/aws/src/agents/orchestrators/economy-agent.ts`
- [ ] Import required dependencies
- [ ] Configure idempotency persistence layer
- [ ] Define EconomyAgentOutput interface

### 7.13.2: Implement Core Handler Logic

- [ ] Validate input using Zod schema
- [ ] Wrap agent invocation with makeIdempotent
- [ ] Set progress range to 65-75%
- [ ] Track tools invoked
- [ ] Return structured analysis result

### 7.13.3: Implement Economy-Specific Trace Handlers

- [ ] Add economy-specific tool messages:
  - 💰 `getGoldData`: "Retrieving gold and economy data..."
  - 📊 `analyzeGoldEfficiency`: "Analyzing gold efficiency and income..."
  - 🌾 `evaluateFarmingPatterns`: "Evaluating farming patterns and CS optimization..."
- [ ] Implement progress updates (65-75%)
- [ ] Add WebSocket streaming for real-time feedback

### 7.13.4: Integrate Session Management

- [ ] Register session with agentType: 'EconomyAgent'
- [ ] Mark session complete on success
- [ ] Mark session failed on error
- [ ] Include economy-specific metadata

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

- [ ] Progress range stays within 65-75%
- [ ] Economy-specific tool messages display correctly
- [ ] All trace event handlers execute
- [ ] Session tracking works correctly
- [ ] WebSocket messages sent in order
- [ ] Idempotency prevents duplicate invocations

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
