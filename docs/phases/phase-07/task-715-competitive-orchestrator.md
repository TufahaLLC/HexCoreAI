# Task 7.15: Implement Competitive Agent Orchestrator

**Status**: ✅ Complete

## Overview

Implement the Lambda orchestrator function for the Competitive Progression Agent with **enhanced streaming** and **trace event handling**. This orchestrator provides real-time transparency into rank progression analysis, climb efficiency, and skill development insights.

---

## Prerequisites

Before implementing this orchestrator:

- [x] [Task 7.14: Champion Agent Orchestrator](./task-714-champion-orchestrator.md) completed
- [x] [Task 7.8: Competitive Action Group](./task-78-competitive-action-groups.md) implemented
- [x] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.15.1: Create Competitive Agent Orchestrator File

- [x] Create `apps/aws/src/agents/orchestrators/competitive-agent.ts`
- [x] Import required dependencies
- [x] Configure idempotency persistence layer
- [x] Define CompetitiveAgentOutput interface

### 7.15.2: Implement Core Handler Logic

- [x] Validate input using Zod schema
- [x] Wrap agent invocation with makeIdempotent
- [x] Set progress range to 85-90%
- [x] Track tools invoked
- [x] Return structured analysis result

### 7.15.3: Implement Competitive-Specific Trace Handlers

- [x] Add competitive-specific tool messages:
  - 📈 `getRankData`: "Retrieving rank progression data..."
  - 🎯 `analyzeClimbEfficiency`: "Analyzing climb efficiency and LP gains..."
  - 💪 `assessSkillDevelopment`: "Assessing skill development and improvement areas..."
- [x] Implement progress updates (85-90%)
- [x] Add WebSocket streaming for real-time feedback

### 7.15.4: Integrate Session Management

- [x] Register session with agentType: 'CompetitiveAgent'
- [x] Mark session complete on success
- [x] Mark session failed on error
- [x] Include competitive-specific metadata

**Key Features:**

- Progress range: 85-90%
- Tool messages: 📈 (rank data), 🎯 (climb efficiency), 💪 (skill development)
- Session tracking with completion metadata

---

## Implementation Pattern

Follow the same pattern as previous orchestrators, with these adjustments:

**Progress Range:** 85-90%

**Tool Messages:**

```typescript
const toolMessages: Record<string, string> = {
  getRankData: "📈 Retrieving rank progression data...",
  analyzeClimbEfficiency: "🎯 Analyzing climb efficiency and LP gains...",
  assessSkillDevelopment:
    "💪 Assessing skill development and improvement areas...",
};

const completionMessages: Record<string, string> = {
  getRankData: "✓ Rank data retrieved",
  analyzeClimbEfficiency: "✓ Climb efficiency analysis complete",
  assessSkillDevelopment: "✓ Skill development assessment complete",
};
```

**Agent Prompt:**

```typescript
inputText: `Analyze competitive progression for match ${matchId} and player ${puuid}. 
            Retrieve rank data, analyze climb efficiency and LP gains, and assess 
            skill development and improvement areas.`;
```

---

## Testing

### Validation Checklist

- [x] Progress range stays within 85-90%
- [x] Competitive-specific tool messages display correctly
- [x] All trace event handlers execute
- [x] Session tracking works correctly
- [x] WebSocket messages sent in order
- [x] Idempotency prevents duplicate invocations

---

## Next Steps

After completing this task:

1. Proceed to [Task 7.17: Session Management](./task-717-session-management.md)
2. Test with sample rank data
3. Validate climb efficiency calculations
4. All agent orchestrators will return results to Step Functions
5. Phase 8 Synthesizer Lambda will aggregate and store final reports

---

## References

- [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md) - Reference pattern
- [Task 7.8: Competitive Action Groups](./task-78-competitive-action-groups.md)
- [Phase 7 Update Guide](../../phase_7_update.md)
