# Task 11.1: Update Existing Agent Action Groups with External API Integration

**Status:** ✅ Completed

## Overview

Enhance existing action groups to pull meta data and benchmarks from third-party APIs (U.GG, OP.GG, Data Dragon, Community Dragon, LoLalytics, Mobalytics). Add tools for optimal builds, matchup-specific recommendations, tier lists, and percentiles.

---

## 11.1.1: BuildAgent Action Group Enhancement

**File:** `src/agents/action-groups/build-tools.ts`

**New Tools to Add:**

- [x] `getOptimalBuildFromMeta(championName, role, rank)`
- [x] `comparePlayerBuildToMeta(playerItems, championName, role)`
- [x] `getCounterBuildRecommendations(championName, enemyChampions, role)`
- [x] `analyzeBuildAdaptationSpeed(matchHistory)`
- [x] `getItemGoldEfficiency(itemIds)`

**Notes:**

- Use `externalAPIClient.getBuildMetaFromUGG()` and `getItemsFromDataDragon()`.
- Provide recommendation reasoning and sample sizes where available.

---

## 11.1.2: ChampionsAgent Action Group Enhancement

**File:** `src/agents/action-groups/champion-tools.ts`

**New Tools:**

- [x] `getChampionTierList(rank, role, region)`
- [x] `getChampionMatchups(championName, role, rank)`
- [x] `getChampionSynergies(championName, role)`
- [x] `getChampionLearningCurve(championName, role)`
- [x] `compareChampionPoolToMeta(champions[], role, rank)`

---

## 11.1.3: EconomyAgent Action Group Enhancement

**File:** `src/agents/action-groups/economy-tools.ts`

**New Tools:**

- [x] `getEconomyBenchmarks(role, rank)`
- [x] `calculateGoldEfficiencyVsMeta(playerBuild, optimalBuild)`
- [x] `analyzeRecallTimingVsMeta(recalls[], role, rank)`
- [x] `getIncomeOptimizationSuggestions(role, rank)`

---

## 11.1.4: CombatAgent Action Group Enhancement

**File:** `src/agents/action-groups/combat-tools.ts`

**New Tools:**

- [x] `getCombatBenchmarks(role, rank)`
- [x] `analyzeTeamfightPositioning(events, role)`
- [x] `getDamagePriorizationAnalysis(targets[], role)`
- [x] `getEngagementTimingBenchmarks(role, rank)`

---

## 11.1.5: VisionAgent Action Group Enhancement

**File:** `src/agents/action-groups/vision-tools.ts`

**New Tools:**

- [x] `getVisionHeatmaps(championName, role)`
- [x] `getVisionBenchmarksByRole(role, rank)`
- [x] `getObjectiveVisionSetup(objectiveType)`
- [x] `analyzeVisionDenialEfficiency(wardsKilled, detectorsPlaced)`

---

## 11.1.6: CompetitiveAgent Action Group Enhancement

**File:** `src/agents/action-groups/competitive-tools.ts`

**New Tools:**

- [x] `getRankClimbBenchmarks(rank)`
- [x] `getMetaChampionsForRank(rank, role)`
- [x] `analyzePerformanceConsistency(history)`
- [x] `getPromotionReadinessScore(history, currentLP)`

---

## Implementation Tips

- **Caching:** Use `externalAPIClient` which caches responses in `HexCore-ExternalDataCache` (24h TTL).
- **Normalization:** When combining sources, calculate averages and track provenance.
- **Selectors:** Scraper selectors must be verified against website HTML; add TODOs where unknown.
- **Errors:** Return structured error objects and log with Powertools `Logger` and `Tracer`.

## References

- Source: `docs/Enhance phase 11 to include Specific fields from t.md` → Section 3, Task 11.1
- Related: `task-115-updated-riot-api-client-module.md`
