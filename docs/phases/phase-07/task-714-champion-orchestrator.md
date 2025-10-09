# Task 7.14: Implement Champion Agent Orchestrator

**Status**: 🔄 Pending

## Overview

Implement the Lambda orchestrator function for the Champion Performance Agent with **enhanced streaming** and **trace event handling**. This orchestrator provides real-time transparency into champion mastery analysis, champion pool optimization, and performance metrics.

---

## Prerequisites

Before implementing this orchestrator:
- [ ] [Task 7.13: Economy Agent Orchestrator](./task-713-economy-orchestrator.md) completed
- [ ] [Task 7.7: Champion Action Group](./task-77-champion-action-groups.md) implemented
- [ ] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.14.1: Create Champion Agent Orchestrator File

- [ ] Create `apps/aws/src/agents/orchestrators/champion-agent.ts`
- [ ] Import required dependencies
- [ ] Configure idempotency persistence layer
- [ ] Define ChampionAgentOutput interface

### 7.14.2: Implement Core Handler Logic

- [ ] Validate input using Zod schema
- [ ] Wrap agent invocation with makeIdempotent
- [ ] Set progress range to 75-85%
- [ ] Track tools invoked
- [ ] Return structured analysis result

### 7.14.3: Implement Champion-Specific Trace Handlers

- [ ] Add champion-specific tool messages:
  - 🎮 `getChampionData`: "Retrieving champion performance data..."
  - 🏆 `analyzeChampionPool`: "Analyzing champion pool and mastery..."
  - ⭐ `evaluateChampionMastery`: "Evaluating champion mastery and performance..."
- [ ] Implement progress updates (75-85%)
- [ ] Add WebSocket streaming for real-time feedback

### 7.14.4: Integrate Session Management

- [ ] Register session with agentType: 'ChampionAgent'
- [ ] Mark session complete on success
- [ ] Mark session failed on error
- [ ] Include champion-specific metadata

**Key Features:**
- Progress range: 75-85%
- Tool messages: 🎮 (champion data), 🏆 (pool analysis), ⭐ (mastery)
- Session tracking with completion metadata

---

## Implementation Pattern

Follow the same pattern as previous orchestrators, with these adjustments:

**Progress Range:** 75-85%

**Tool Messages:**
```typescript
const toolMessages: Record<string, string> = {
  getChampionData: '🎮 Retrieving champion performance data...',
  analyzeChampionPool: '🏆 Analyzing champion pool and mastery...',
  evaluateChampionMastery: '⭐ Evaluating champion mastery and performance...',
};

const completionMessages: Record<string, string> = {
  getChampionData: '✓ Champion data retrieved',
  analyzeChampionPool: '✓ Champion pool analysis complete',
  evaluateChampionMastery: '✓ Mastery evaluation complete',
};
```

**Agent Prompt:**
```typescript
inputText: `Analyze champion performance for match ${matchId} and player ${puuid}. 
            Retrieve champion data, analyze champion pool diversity, and evaluate 
            champion mastery and performance metrics.`
```

---

## Testing

### Validation Checklist

- [ ] Progress range stays within 75-85%
- [ ] Champion-specific tool messages display correctly
- [ ] All trace event handlers execute
- [ ] Session tracking works correctly
- [ ] WebSocket messages sent in order
- [ ] Idempotency prevents duplicate invocations

---

## Next Steps

After completing this task:
1. Proceed to [Task 7.15: Competitive Agent Orchestrator](./task-715-competitive-orchestrator.md)
2. Test with sample champion data
3. Validate champion pool analysis

---

## References

- [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md) - Reference pattern
- [Task 7.7: Champion Action Groups](./task-77-champion-action-groups.md)
- [Phase 7 Update Guide](../../phase_7_update.md)
