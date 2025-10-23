# Task 7.1: Update Dependencies & Directory Structure

**Status**: ✅ Complete

## Overview

Update project dependencies and create new directory structure for AWS Bedrock Agents implementation with Action Groups and Orchestrators.

---

## Subtasks

### 7.1.1: Create New Directory Structure

Add directories for action groups and orchestrators.

- [x] Create `apps/aws/src/agents/action-groups/` directory
- [x] Create `apps/aws/src/agents/orchestrators/` directory
- [x] Create `apps/aws/src/shared/bedrock-client.ts` for agent invocation utilities
- [x] Create `apps/aws/src/shared/session-manager.ts` for session tracking

**Updated Structure:**

```
apps/aws/
├── src/
│   ├── websocket/
│   ├── processor/
│   ├── agents/
│   │   ├── action-groups/        # NEW: Action group handlers
│   │   │   ├── build-tools.ts
│   │   │   ├── combat-tools.ts
│   │   │   ├── vision-tools.ts
│   │   │   ├── economy-tools.ts
│   │   │   ├── champion-tools.ts
│   │   │   └── competitive-tools.ts
│   │   └── orchestrators/        # NEW: Agent invokers
│   │       ├── build-agent.ts
│   │       ├── combat-agent.ts
│   │       ├── vision-agent.ts
│   │       ├── economy-agent.ts
│   │       ├── champion-agent.ts
│   │       └── competitive-agent.ts
│   ├── aggregation/
│   └── shared/
│       ├── bedrock-client.ts      # NEW: Bedrock utilities
│       ├── session-manager.ts     # NEW: Session tracking
│       ├── types.ts
│       ├── websocket-client.ts
│       └── riot-api.ts
```

### 7.1.2: File Naming Convention

All TypeScript files use **kebab-case** (e.g., `build-tools.ts`, `combat-agent.ts`).

---

## Validation

- [x] New directories created

---

## Next Steps

After completing this task:

1. Proceed to [Task 7.2: Define Bedrock Agents](./task-72-define-bedrock-agents.md)
2. Begin implementing action group tools in tasks 7.3-7.8

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 9-100
- [AWS Powertools Documentation](https://docs.powertools.aws.dev/lambda/typescript/latest/)
