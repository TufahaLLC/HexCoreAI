# Task 7.5: Implement Action Group Tools - Vision Agent

**Status**: ✅ Completed

## Overview

Implement the Vision Control Action Group handler for analyzing ward placement, vision score, and map awareness.

---

## Tools to Implement

### 1. getMatchVisionData

Retrieve vision control statistics from DynamoDB.

**Parameters**: `matchId`, `puuid`

**Returns**:

```typescript
{
  matchId: string;
  puuid: string;
  wardsPlaced: number;
  wardsDestroyed: number;
  controlWardsPurchased: number;
  visionScore: number;
}
```

### 2. analyzeVisionScore

Analyze ward placement efficiency based on role.

**Parameters**: `visionScore`, `wardsDestroyed`, `controlWardsPurchased`

**Returns**:

```typescript
{
  visionScore: number;
  wardsDestroyed: number;
  controlWardsPurchased: number;
  strengths: string[];
  improvements: string[];
  overallRating: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier';
}
```

---

## Implementation Reference

See [Phase 7 Update Guide](../../phase_7_update.md) lines 1592-1766 for complete implementation.

**File**: `apps/aws/src/agents/action-groups/vision-tools.ts`

Key features:

- Role-based ward placement benchmarks
- Vision score efficiency calculations
- Control ward usage analysis
- Vision denial metrics

---

## Next Steps

After completing: [Task 7.12: Economy Action Groups](./task-712-economy-action-groups.md)

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 1592-1766
- [Task 7.3: Original Vision Agent](./task-73-implement-vision-agent.md)
