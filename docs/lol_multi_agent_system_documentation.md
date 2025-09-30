# League of Legends Multi-Agent Analysis System

## Overview
This document outlines the multi-agent orchestration system for analyzing League of Legends player performance using AWS Bedrock Agents and the Riot Games API. Each agent specializes in a specific domain of analysis, contributing to a comprehensive end-of-year player recap and growth analysis.

---

## Agent Specifications

### 1. BuildAgent 🛡️

**Purpose**: Analyze itemization patterns, build optimization, and adaptation strategies

#### Data Sources & Usage

| API Endpoint | Data Field | Agent Usage |
|--------------|------------|-------------|
| MATCH-V5 | `item0` - `item6` | Track final build compositions and identify core vs situational items |
| MATCH-V5 | `itemsPurchased` | Calculate build efficiency and item cycling patterns |
| MATCH-V5 | `consumablesPurchased` | Analyze sustain and vision item usage patterns |
| MATCH-V5 | `goldEarned` | Correlate gold income with item purchase decisions |
| MATCH-V5 | `goldSpent` | Identify gold efficiency and spending optimization |
| MATCH-V5 | `championName` | Create champion-specific build recommendations |
| MATCH-V5 | `gameMode` | Adapt build analysis for different game modes |
| MATCH-V5-TIMELINE | Item Purchase Events | Track build path progression and timing |
| MATCH-V5-TIMELINE | `currentGold` | Analyze power spike timing and gold thresholds |
| MATCH-V5 | `win` | Correlate build choices with game outcomes |

#### Analysis Capabilities
- **Build Path Optimization**: Identify most efficient item progression routes
- **Situational Adaptation**: Detect build modifications based on enemy team composition
- **Power Spike Analysis**: Determine optimal timing for key item completions
- **Meta Alignment**: Compare builds against current meta standards
- **Cost Efficiency**: Calculate gold-per-stat optimization
- **Counter-Building**: Analyze defensive item choices against specific threats

#### Output Format
```json
{
  "build_efficiency_score": 85.2,
  "preferred_build_paths": ["Mythic → Boots → Legendary1 → Legendary2"],
  "adaptation_patterns": {
    "vs_ap_heavy": "MR item rush frequency: 78%",
    "vs_ad_heavy": "Armor item priority: 82%"
  },
  "power_spike_timing": {
    "one_item": "avg_minute: 8.5",
    "two_item": "avg_minute: 14.2"
  },
  "improvement_recommendations": [
    "Consider Zhonya's Hourglass 3 minutes earlier vs assassins",
    "Prioritize Grievous Wounds items in 68% of recent matches"
  ]
}
```

---

### 2. ChampionsAgent 🏆

**Purpose**: Analyze champion mastery, performance patterns, and pool optimization

#### Data Sources & Usage

| API Endpoint | Data Field | Agent Usage |
|--------------|------------|-------------|
| CHAMPION-MASTERY-V4 | `championId` | Track mastery progression across champion pool |
| CHAMPION-MASTERY-V4 | `championLevel` | Identify mastery milestones and progression |
| CHAMPION-MASTERY-V4 | `championPoints` | Calculate time investment per champion |
| CHAMPION-MASTERY-V4 | `lastPlayTime` | Detect champion activity patterns and recency |
| MATCH-V5 | `championName` | Link performance data to specific champions |
| MATCH-V5 | `win` | Calculate champion-specific win rates |
| MATCH-V5 | Performance metrics | Aggregate KDA, damage, CS per champion |
| MATCH-V5 | `queueId` | Separate ranked vs normal performance |
| MATCH-V5 | `gameVersion` | Track performance across different patches |
| LEAGUE-V4 | `tier`, `rank` | Correlate champion performance with rank |

#### Analysis Capabilities
- **Champion Mastery Tracking**: Monitor progression toward mastery milestones
- **Performance Per Champion**: Calculate detailed statistics for each champion played
- **Pool Diversity Analysis**: Evaluate champion pool breadth and depth
- **Meta Alignment**: Compare champion choices with current meta
- **Role Flexibility**: Assess performance across different positions
- **Learning Curves**: Track improvement rate on newly picked champions

#### Output Format
```json
{
  "champion_pool_summary": {
    "total_champions_played": 23,
    "mastery_7_champions": 3,
    "main_champions": ["Jinx", "Caitlyn", "Ezreal"],
    "average_mastery_points": 45000
  },
  "performance_analysis": {
    "highest_winrate_champion": {"name": "Jinx", "winrate": 72.5, "games": 40},
    "most_improved_champion": {"name": "Aphelios", "improvement": "+15% winrate"},
    "underperforming_champions": ["Kalista", "Draven"]
  },
  "recommendations": [
    "Focus on mastering current pool before expanding",
    "Consider dropping Kalista (42% winrate over 15 games)",
    "Strong potential on Aphelios - continue practicing"
  ]
}
```

---

### 3. EconomyAgent 💰

**Purpose**: Analyze resource management, gold efficiency, and economic optimization

#### Data Sources & Usage

| API Endpoint | Data Field | Agent Usage |
|--------------|------------|-------------|
| MATCH-V5 | `goldEarned` | Calculate gold generation efficiency |
| MATCH-V5 | `goldSpent` | Analyze spending patterns and efficiency |
| MATCH-V5 | `totalMinionsKilled` | Track farming consistency and improvement |
| MATCH-V5 | `neutralMinionsKilled` | Analyze jungle farming patterns |
| MATCH-V5 | `totalAllyJungleMinionsKilled` | Evaluate jungle resource sharing |
| MATCH-V5 | `totalEnemyJungleMinionsKilled` | Track counter-jungling success |
| MATCH-V5-TIMELINE | `currentGold` | Monitor gold accumulation patterns |
| MATCH-V5-TIMELINE | `goldPerSecond` | Track income rate fluctuations |
| MATCH-V5-TIMELINE | `minionsKilled` | Analyze CS progression over time |
| MATCH-V5 | `gameDuration` | Calculate per-minute economic metrics |
| MATCH-V5 | `teamPosition` | Adjust economic expectations by role |

#### Analysis Capabilities
- **Gold Per Minute Optimization**: Track income efficiency across games
- **Farming Pattern Analysis**: Identify CS improvement opportunities
- **Resource Allocation**: Analyze gold spending priorities
- **Economic Scaling**: Monitor late-game economic impact
- **Efficiency Benchmarking**: Compare against role-specific standards
- **Income Source Analysis**: Break down gold sources (CS, kills, objectives)

#### Output Format
```json
{
  "economic_metrics": {
    "average_gpm": 435.2,
    "cs_per_minute": 7.8,
    "gold_efficiency_score": 78.5,
    "economic_ranking_percentile": 65
  },
  "farming_analysis": {
    "laning_phase_cs": "avg: 72.5 @ 10min",
    "mid_game_efficiency": "drops by 15% after laning",
    "late_game_farming": "strong cleanup efficiency: 89%"
  },
  "improvement_areas": [
    "Focus on CS under tower (currently 68% efficiency)",
    "Improve jungle camp timing (missing 2.3 camps per game)",
    "Earlier back timing could improve gold efficiency by 8%"
  ]
}
```

---

### 4. CombatAgent ⚔️

**Purpose**: Analyze combat performance, teamfight effectiveness, and damage optimization

#### Data Sources & Usage

| API Endpoint | Data Field | Agent Usage |
|--------------|------------|-------------|
| MATCH-V5 | `kills`, `deaths`, `assists` | Calculate combat effectiveness ratios |
| MATCH-V5 | `totalDamageDealtToChampions` | Measure combat impact and consistency |
| MATCH-V5 | `totalDamageTaken` | Analyze survivability and positioning |
| MATCH-V5 | `damageDealtToObjectives` | Track objective fight contributions |
| MATCH-V5 | `damageSelfMitigated` | Evaluate defensive skill usage |
| MATCH-V5 | `largestKillingSpree` | Identify peak performance moments |
| MATCH-V5 | `multiKills` (double, triple, etc.) | Track teamfight impact events |
| MATCH-V5 | `killParticipation` | Measure team involvement in eliminations |
| MATCH-V5 | `timeCCingOthers` | Analyze crowd control effectiveness |
| MATCH-V5 | `totalTimeCCDealt` | Evaluate utility contribution in fights |
| MATCH-V5-TIMELINE | Combat Events | Track fight participation and timing |
| MATCH-V5 | Challenge metrics | Access detailed combat performance data |

#### Analysis Capabilities
- **Damage Per Minute**: Calculate combat output efficiency
- **Teamfight Performance**: Analyze multi-target engagement success
- **Survivability Assessment**: Evaluate positioning and defensive play
- **Combat Timing**: Identify optimal engagement windows
- **Role-Specific Impact**: Measure contribution appropriate to champion role
- **Fight Selection**: Analyze engagement decision-making patterns

#### Output Format
```json
{
  "combat_performance": {
    "average_kda": 2.4,
    "damage_per_minute": 542.8,
    "kill_participation": 68.5,
    "combat_rating": "B+ (Top 25%)"
  },
  "teamfight_analysis": {
    "teamfight_winrate": 64.2,
    "average_damage_per_teamfight": 1850,
    "survival_rate": 72.1,
    "multi_kill_frequency": 0.31
  },
  "improvement_recommendations": [
    "Increase aggressive plays during power spikes",
    "Focus on target prioritization (currently targeting tanks 23% of time)",
    "Improve positioning to reduce unnecessary deaths by ~1.2 per game"
  ]
}
```

---

### 5. VisionAgent 👁️

**Purpose**: Analyze vision control, map awareness, and strategic ward placement

#### Data Sources & Usage

| API Endpoint | Data Field | Agent Usage |
|--------------|------------|-------------|
| MATCH-V5 | `visionScore` | Calculate overall vision contribution |
| MATCH-V5 | `wardsPlaced` | Track ward placement frequency |
| MATCH-V5 | `wardsKilled` | Analyze vision denial effectiveness |
| MATCH-V5 | `detectorWardsPlaced` | Monitor control ward usage patterns |
| MATCH-V5 | `visionWardsBoughtInGame` | Track vision item investment |
| MATCH-V5-TIMELINE | Ward Placement Events | Map ward locations and timing |
| MATCH-V5-TIMELINE | Ward Kill Events | Analyze vision control battles |
| MATCH-V5-TIMELINE | `position` data | Correlate movement with ward coverage |
| MATCH-V5 | Objective control data | Link vision setup to objective success |
| MATCH-V5 | `teamPosition` | Adjust vision expectations by role |

#### Analysis Capabilities
- **Vision Heatmaps**: Map preferred ward placement locations
- **Objective Vision Setup**: Analyze pre-objective vision preparation
- **Vision Efficiency**: Calculate vision score per gold invested
- **Map Control Analysis**: Evaluate territorial vision dominance
- **Vision Timing**: Identify optimal ward placement windows
- **Denial Patterns**: Track enemy vision clearing effectiveness

#### Output Format
```json
{
  "vision_metrics": {
    "average_vision_score": 42.8,
    "wards_per_minute": 0.85,
    "vision_denial_rate": 1.2,
    "control_ward_efficiency": 76.5
  },
  "placement_analysis": {
    "river_control": "Strong (82% uptime on river bushes)",
    "jungle_entrances": "Needs improvement (45% coverage)",
    "objective_preparation": "Excellent (95% vision setup before dragons)"
  },
  "recommendations": [
    "Increase jungle entrance warding by 40%",
    "Focus on deep wards during strong game states",
    "Improve trinket upgrade timing (currently 2min late on average)"
  ]
}
```

---

### 6. CompetitiveAgent 🏅

**Purpose**: Analyze ranked progression, competitive performance, and climb efficiency

#### Data Sources & Usage

| API Endpoint | Data Field | Agent Usage |
|--------------|------------|-------------|
| LEAGUE-V4 | `tier`, `rank` | Track rank progression over time |
| LEAGUE-V4 | `leaguePoints` | Calculate LP gain/loss efficiency |
| LEAGUE-V4 | `wins`, `losses` | Analyze win rate trends |
| LEAGUE-V4 | `hotStreak` | Identify performance streaks |
| LEAGUE-V4 | `queueType` | Separate analysis by queue type |
| MATCH-V5 | Ranked game performance | Compare ranked vs normal performance |
| MATCH-V5 | `gameVersion` | Track performance across patches |
| All Agent Outputs | Performance metrics | Correlate skills with rank changes |

#### Analysis Capabilities
- **Climb Efficiency**: Calculate optimal LP gain strategies
- **Performance Consistency**: Track ranked game stability
- **Skill-Rank Correlation**: Identify skill gaps vs current rank
- **Competitive Readiness**: Assess preparation for higher ranks
- **Streak Analysis**: Understand win/loss pattern impacts
- **Queue Performance**: Compare performance across different queues

#### Output Format
```json
{
  "rank_progression": {
    "current_rank": "Gold II 45 LP",
    "peak_rank": "Gold I 78 LP",
    "lp_trend": "+185 LP over last 30 days",
    "climb_efficiency": "68% (Above Average)"
  },
  "competitive_analysis": {
    "ranked_winrate": 64.2,
    "average_lp_per_game": 18.5,
    "performance_vs_rank": "Playing at Gold I level consistently",
    "promotion_readiness": "82% - Ready for next tier"
  },
  "recommendations": [
    "Continue current strategy - climbing efficiently",
    "Focus on consistency to avoid demotion games",
    "Champion pool is appropriate for current rank"
  ]
}
```

---

## Multi-Agent Orchestration Flow

### Supervisor Agent Architecture

The **SupervisorAgent** coordinates the entire analysis pipeline using AWS Bedrock's multi-agent collaboration capabilities:

#### Phase 1: Data Collection (Parallel)
```
SupervisorAgent
├── Fetches player PUUID (ACCOUNT-V1)
├── Retrieves match history (MATCH-V5/ids) 
├── Collects summoner data (SUMMONER-V4)
├── Gathers ranked information (LEAGUE-V4)
└── Obtains champion mastery (CHAMPION-MASTERY-V4)
```

#### Phase 2: Match Analysis (Parallel Processing)
```
For each match in match_history[]:
├── BuildAgent.analyze(match_data, timeline_data)
├── ChampionsAgent.analyze(match_data, mastery_data)  
├── EconomyAgent.analyze(match_data, timeline_data)
├── CombatAgent.analyze(match_data, timeline_data)
├── VisionAgent.analyze(match_data, timeline_data)
└── CompetitiveAgent.analyze(match_data, league_data)
```

#### Phase 3: Cross-Agent Synthesis
```
SupervisorAgent.synthesize():
├── Correlate build choices with combat performance
├── Link economic efficiency to competitive success
├── Connect vision control to objective success
├── Identify performance pattern relationships
└── Generate holistic improvement recommendations
```

#### Phase 4: Narrative Generation
```
NarrativeAgent.generate_recap():
├── Create engaging storylines from data insights
├── Highlight growth areas and achievements  
├── Generate personalized improvement roadmap
└── Produce shareable end-of-year summary
```

### Agent Communication Protocol

```json
{
  "agent_coordination": {
    "data_sharing": {
      "BuildAgent": "Shares item efficiency data with EconomyAgent",
      "CombatAgent": "Provides fight context to VisionAgent", 
      "EconomyAgent": "Informs CompetitiveAgent about resource management",
      "VisionAgent": "Coordinates with ObjectiveAgent on map control"
    },
    "cross_validation": {
      "performance_correlation": "All agents validate findings against game outcomes",
      "consistency_checks": "Supervisor ensures metric alignment across agents",
      "temporal_analysis": "Timeline agents share progression insights"
    }
  }
}
```

### Final Output Structure

```json
{
  "player_analysis_report": {
    "executive_summary": {
      "overall_performance_score": 78.5,
      "rank_trajectory": "Climbing (Gold II → Platinum V projected)",
      "key_strengths": ["Economic efficiency", "Vision control", "Champion mastery"],
      "priority_improvements": ["Combat positioning", "Build adaptation"]
    },
    "detailed_analysis": {
      "build_analysis": "BuildAgent.output",
      "champion_analysis": "ChampionsAgent.output", 
      "economy_analysis": "EconomyAgent.output",
      "combat_analysis": "CombatAgent.output",
      "vision_analysis": "VisionAgent.output",
      "competitive_analysis": "CompetitiveAgent.output"
    },
    "growth_roadmap": {
      "30_day_goals": ["Improve CS to 8.5/min", "Reduce deaths by 1.5/game"],
      "seasonal_objectives": ["Reach Platinum", "Master 2 new champions"],
      "skill_development": [
        {
          "skill": "Combat positioning",
          "current_level": 6.2,
          "target_level": 8.0,
          "improvement_plan": "Focus on back-line positioning, review VODs"
        }
      ]
    },
    "year_in_review": {
      "games_played": 247,
      "rank_improvement": "+3 tiers",
      "champions_mastered": 2,
      "biggest_achievement": "First pentakill on Jinx",
      "memorable_moments": ["Epic Baron steal vs Diamond team"]
    }
  }
}
```

### Error Handling & Resilience

```yaml
error_handling:
  api_rate_limits:
    strategy: "Exponential backoff with jitter"
    fallback: "Use cached data for non-critical analysis"

  missing_data:
    match_timeline: "Graceful degradation to summary stats only" 
    champion_mastery: "Estimate from match performance data"

  agent_failures:
    individual_agent: "Continue with remaining agents, note limitations"
    supervisor_agent: "Provide partial analysis with clear scope limitations"

  data_quality:
    validation: "Cross-reference metrics across multiple sources"
    outlier_detection: "Flag and investigate statistical anomalies"
```

---

## Implementation Recommendations

### MVP Development Order
1. **Phase 1**: BuildAgent + ChampionsAgent (Core functionality)
2. **Phase 2**: EconomyAgent + CombatAgent (Performance analysis)  
3. **Phase 3**: VisionAgent + CompetitiveAgent (Advanced insights)
4. **Phase 4**: SupervisorAgent optimization and cross-correlation
5. **Phase 5**: NarrativeAgent and user experience polish

### Technical Architecture
- **AWS Bedrock Agents**: Individual specialized agents with tool access
- **AgentCore Gateway**: Centralized API management and rate limiting
- **Data Pipeline**: Automated match collection and preprocessing
- **Analysis Engine**: Parallel processing with result aggregation
- **Visualization Layer**: Interactive dashboards and shareable reports

This comprehensive system will provide League of Legends players with unprecedented insights into their gameplay patterns, clear growth opportunities, and an engaging year-end experience that motivates continued improvement.
