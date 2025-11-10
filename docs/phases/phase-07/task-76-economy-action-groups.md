# Task 7.6: Implement Action Group Tools - Economy Agent

**Status**: ✅ Completed

## Overview

Implement the Economy Management Action Group handler for analyzing gold generation, farming efficiency, and resource allocation.

---

## Tools to Implement

### 1. getMatchEconomyData

Retrieve economic statistics from DynamoDB.

**Parameters**: `matchId`, `puuid`

**Returns**:

```typescript
{
  matchId: string;
  puuid: string;
  goldEarned: number;
  goldSpent: number;
  csPerMinute: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
}
```

### 2. analyzeGoldEfficiency

Analyze gold earning and spending efficiency.

**Parameters**: `goldEarned`, `goldSpent`, `gameDuration`

**Returns**:

```typescript
{
  goldEarned: number;
  goldSpent: number;
  goldPerMinute: string;
  spendingEfficiency: string;
  unspentGold: number;
  recommendations: string[];
  rating: 'Excellent' | 'Good' | 'Needs Improvement';
}
```

### 3. evaluateResourceManagement

Evaluate CS and farming efficiency based on role.

**Parameters**: `csPerMinute`, `totalMinionsKilled`, `neutralMinionsKilled`, `role`

**Returns**:

```typescript
{
  csPerMinute: string;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  benchmark: string;
  csEfficiency: string;
  strengths: string[];
  improvements: string[];
  rating: 'S-Tier' | 'A-Tier' | 'B-Tier';
}
```

---

## Implementation Reference

See [Phase 7 Update Guide](../../phase_7_update.md) lines 1768-1942 for complete implementation.

**File**: `apps/aws/src/agents/action-groups/economy-tools.ts`

Key features:

- Role-based CS benchmarks (ADC: 8.0, MID: 7.5, TOP: 7.0, JUNGLE: 5.0, SUPPORT: 2.0)
- Gold efficiency calculations
- Spending pattern analysis
- Resource optimization recommendations

---

## Next Steps

After completing: [Task 7.13: Champion Action Groups](./task-713-champion-action-groups.md)

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 1768-1942
- [Task 7.4: Original Economy Agent](./task-74-implement-economy-agent.md)
