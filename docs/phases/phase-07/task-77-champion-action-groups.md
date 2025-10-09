# Task 7.7: Implement Action Group Tools - Champion Agent

**Status**: 🔄 Pending

## Overview

Implement the Champion Performance Action Group handler for analyzing champion-specific performance, mastery, and pool optimization.

---

## Tools to Implement

### 1. getChampionPerformanceData
Retrieve historical performance data for a specific champion.

**Parameters**: `puuid`, `championName`

**Returns**:
```typescript
{
  puuid: string;
  championName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: string;
  averageKDA: string;
}
```

### 2. analyzeChampionMastery
Analyze player mastery level with a specific champion.

**Parameters**: `totalGames`, `winRate`, `averageKDA`

**Returns**:
```typescript
{
  totalGames: number;
  winRate: number;
  averageKDA: number;
  masteryLevel: 'Master' | 'Expert' | 'Proficient' | 'Intermediate' | 'Beginner';
  strengths: string[];
  improvements: string[];
}
```

### 3. compareToChampionBenchmark
Compare player performance to global champion benchmarks.

**Parameters**: `championName`, `playerStats`

**Returns**:
```typescript
{
  championName: string;
  comparison: {
    winRate: {
      player: number;
      benchmark: number;
      difference: string;
      status: 'Above Average' | 'Below Average';
    };
    kda: { /* similar structure */ };
    cs: { /* similar structure */ };
  };
  overallRating: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier';
}
```

---

## Implementation Reference

See [Phase 7 Update Guide](../../phase_7_update.md) lines 1944-2165 for complete implementation.

**File**: `apps/aws/src/agents/action-groups/champion-tools.ts`

Key features:
- Champion-specific performance tracking
- Mastery level calculation based on games, win rate, and KDA
- Benchmark comparisons against global averages
- Champion pool diversity analysis

---

## Next Steps

After completing: [Task 7.14: Competitive Action Groups](./task-714-competitive-action-groups.md)

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 1944-2165
- [Task 7.5: Original Champion Agent](./task-75-implement-champion-agent.md)
