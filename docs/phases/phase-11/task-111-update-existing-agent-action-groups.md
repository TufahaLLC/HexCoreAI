# Task 11.1: Update Existing Agent Action Groups with External API Integration

**Status:** 🔄 Pending

## Overview

Enhance existing action groups to pull meta data and benchmarks from third-party APIs (U.GG, OP.GG, Data Dragon, Community Dragon, LoLalytics, Mobalytics). Add tools for optimal builds, matchup-specific recommendations, tier lists, and percentiles.

---

## 11.1.1: BuildAgent Action Group Enhancement

**File:** `src/agents/action-groups/build-tools.ts`

**New Tools to Add:**

- [ ] `getOptimalBuildFromMeta(championName, role, rank)`
- [ ] `comparePlayerBuildToMeta(playerItems, championName, role)`
- [ ] `getCounterBuildRecommendations(championName, enemyChampions, role)`
- [ ] `analyzeBuildAdaptationSpeed(matchHistory)`
- [ ] `getItemGoldEfficiency(itemIds)`

**Notes:**

- Use `externalAPIClient.getBuildMetaFromUGG()` and `getItemsFromDataDragon()`.
- Provide recommendation reasoning and sample sizes where available.

---

## 11.1.2: ChampionsAgent Action Group Enhancement

**File:** `src/agents/action-groups/champion-tools.ts`

**New Tools:**

- [ ] `getChampionTierList(rank, role, region)`
- [ ] `getChampionMatchups(championName, role, rank)`
- [ ] `getChampionSynergies(championName, role)`
- [ ] `getChampionLearningCurve(championName, role)`
- [ ] `compareChampionPoolToMeta(champions[], role, rank)`

---

## 11.1.3: EconomyAgent Action Group Enhancement

**File:** `src/agents/action-groups/economy-tools.ts`

**New Tools:**

- [ ] `getEconomyBenchmarks(role, rank)`
- [ ] `calculateGoldEfficiencyVsMeta(playerBuild, optimalBuild)`
- [ ] `analyzeRecallTimingVsMeta(recalls[], role, rank)`
- [ ] `getIncomeOptimizationSuggestions(role, rank)`

---

## 11.1.4: CombatAgent Action Group Enhancement

**File:** `src/agents/action-groups/combat-tools.ts`

**New Tools:**

- [ ] `getCombatBenchmarks(role, rank)`
- [ ] `analyzeTeamfightPositioning(events, role)`
- [ ] `getDamagePriorizationAnalysis(targets[], role)`
- [ ] `getEngagementTimingBenchmarks(role, rank)`

---

## 11.1.5: VisionAgent Action Group Enhancement

**File:** `src/agents/action-groups/vision-tools.ts`

**New Tools:**

- [ ] `getVisionHeatmaps(championName, role)`
- [ ] `getVisionBenchmarksByRole(role, rank)`
- [ ] `getObjectiveVisionSetup(objectiveType)`
- [ ] `analyzeVisionDenialEfficiency(wardsKilled, detectorsPlaced)`

---

## 11.1.6: CompetitiveAgent Action Group Enhancement

**File:** `src/agents/action-groups/competitive-tools.ts`

**New Tools:**

- [ ] `getRankClimbBenchmarks(rank)`
- [ ] `getMetaChampionsForRank(rank, role)`
- [ ] `analyzePerformanceConsistency(history)`
- [ ] `getPromotionReadinessScore(history, currentLP)`

---

## Implementation Tips

- **Caching:** Use `externalAPIClient` which caches responses in `HexCore-ExternalDataCache` (24h TTL).
- **Normalization:** When combining sources, calculate averages and track provenance.
- **Selectors:** Scraper selectors must be verified against website HTML; add TODOs where unknown.
- **Errors:** Return structured error objects and log with Powertools `Logger` and `Tracer`.

## References

- Source: `docs/Enhance phase 11 to include Specific fields from t.md` → Section 3, Task 11.1
- Related: `task-115-updated-riot-api-client-module.md`
