# Task 7.8: Implement Action Group Tools - Competitive Agent

**Status**: ✅ Completed

## Overview

Implement the Competitive Progression Action Group handler for analyzing ranked performance, climb efficiency, and skill development.

---

## Tools to Implement

### 1. getRankProgressionData

Retrieve ranked progression statistics for a specific season.

**Parameters**: `puuid`, `season`

**Returns**:

```typescript
{
  puuid: string;
  season: string;
  currentRank: string;
  currentDivision: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: string;
}
```

### 2. analyzeRankTrends

Analyze ranked progression trends and momentum.

**Parameters**: `wins`, `losses`, `currentLP`, `recentMatches`

**Returns**:

```typescript
{
  overallWinRate: string;
  currentLP: number;
  momentum: {
    recentWinRate: string;
    lpChange: number;
    trend: "Climbing" | "Declining" | "Stable";
    status: "Hot Streak" | "Cold Streak" | "Normal";
  }
  gamesToPromo: number;
}
```

### 3. generateClimbingRecommendations

Generate personalized recommendations for ranked climbing.

**Parameters**: `winRate`, `recentPerformance`, `currentRank`, `strengths`, `weaknesses`

**Returns**:

```typescript
{
  currentRank: string;
  winRate: number;
  recentPerformance: string;
  recommendations: string[];
  focusAreas: string[];
  nextMilestone: string;
}
```

---

## Implementation Reference

See [Phase 7 Update Guide](../../phase_7_update.md) lines 2167-2374 for complete implementation.

**File**: `apps/aws/src/agents/action-groups/competitive-tools.ts`

Key features:

- Rank progression tracking
- LP gain/loss analysis
- Win streak and momentum detection
- Personalized climbing recommendations based on weaknesses
- Next milestone calculation (e.g., "Gold I" → "Platinum IV")

---

## Next Steps

After completing all action groups:

1. Proceed to [Task 7.15: Enhanced Bedrock Client](./task-715-enhanced-bedrock-client.md)
2. Then implement orchestrators in [Task 7.16](./task-716-agent-orchestrators.md)

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 2167-2374
- [Task 7.6: Original Competitive Agent](./task-76-implement-competitive-agent.md)
