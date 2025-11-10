# Task 7.12: Implement Vision Agent Orchestrator

**Status**: ✅ Complete

## Overview

Implement the Lambda orchestrator function for the Vision Control Agent with **enhanced streaming** and **trace event handling**. This orchestrator provides real-time transparency into vision control analysis, ward placement optimization, and map awareness insights.

---

## Prerequisites

Before implementing this orchestrator:
- [x] [Task 7.11: Combat Agent Orchestrator](./task-711-combat-orchestrator.md) completed
- [x] [Task 7.5: Vision Action Group](./task-75-vision-action-groups.md) implemented
- [x] [Task 7.9: Bedrock Client](./task-79-enhanced-bedrock-client.md) created

---

## Implementation Tasks

### 7.12.1: Create Vision Agent Orchestrator File

- [x] Create `apps/aws/src/agents/orchestrators/vision-agent.ts`
- [x] Import required dependencies
- [x] Configure idempotency persistence layer
- [x] Define VisionAgentOutput interface

### 7.12.2: Implement Core Handler Logic

- [x] Validate input using Zod schema
- [x] Wrap agent invocation with makeIdempotent
- [x] Set progress range to 50-65%
- [x] Track tools invoked
- [x] Return structured analysis result

### 7.12.3: Implement Vision-Specific Trace Handlers

- [x] Add vision-specific tool messages:
  - 👁️ `getVisionData`: "Retrieving vision control data..."
  - 🗺️ `analyzeWardPlacement`: "Analyzing ward placement patterns..."
  - 🎯 `assessMapAwareness`: "Assessing map awareness and vision denial..."
- [x] Implement progress updates (50-65%)
- [x] Add WebSocket streaming for real-time feedback

### 7.12.4: Integrate Session Management

- [x] Register session with agentType: 'VisionAgent'
- [x] Mark session complete on success
- [x] Mark session failed on error
- [x] Include vision-specific metadata

**Key Features:**
- Progress range: 50-65%
- Tool messages: 👁️ (vision data), 🗺️ (ward analysis), 🎯 (map awareness)
- Session tracking with completion metadata

---

## Implementation Pattern

Follow the same pattern as Build and Combat Agent Orchestrators, with these adjustments:

**Progress Range:** 50-65%

**Tool Messages:**
```typescript
const toolMessages: Record<string, string> = {
  getVisionData: '👁️ Retrieving vision control data...',
  analyzeWardPlacement: '🗺️ Analyzing ward placement patterns...',
  assessMapAwareness: '🎯 Assessing map awareness and vision denial...',
};

const completionMessages: Record<string, string> = {
  getVisionData: '✓ Vision data retrieved',
  analyzeWardPlacement: '✓ Ward analysis complete',
  assessMapAwareness: '✓ Map awareness assessment complete',
};
```

**Agent Prompt:**
```typescript
inputText: `Analyze vision control for match ${matchId} and player ${puuid}. 
            Retrieve vision data, analyze ward placement patterns, and assess 
            map awareness and vision denial strategies.`
```

---

## Testing

### Validation Checklist

- [x] Progress range stays within 50-65%
- [x] Vision-specific tool messages display correctly
- [x] All trace event handlers execute
- [x] Session tracking works correctly
- [x] WebSocket messages sent in order
- [x] Idempotency prevents duplicate invocations

---

## Next Steps

After completing this task:
1. Proceed to [Task 7.13: Economy Agent Orchestrator](./task-713-economy-orchestrator.md)
2. Test with sample vision data
3. Validate ward placement analysis

---

## References

- [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md) - Reference pattern
- [Task 7.5: Vision Action Groups](./task-75-vision-action-groups.md)
- [Phase 7 Update Guide](../../phase_7_update.md)
