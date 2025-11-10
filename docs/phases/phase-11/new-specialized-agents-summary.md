# New Specialized Agents from Phase 11

## Overview

Phase 11 introduced 5 new specialized analysis agents to expand the HexCore AI platform's capabilities beyond the original 6 agents. These new agents focus on advanced gameplay aspects including macro strategy, positioning analysis, temporal performance, team synergy, and adaptation patterns.

## New Agent Specifications

### 1. MacroAnalysisAgent
- **Focus**: Map movements, objective control timing, roaming efficiency, strategic decision-making
- **Handler**: `agents/action-groups/macro-tools.handler`
- **Orchestrator**: `agents/orchestrators/macro-agent.handler`
- **Key Functions**:
  - `getPlayerMovementPatterns` - Analyze map movement and roaming patterns
  - `getObjectiveControlAnalysis` - Analyze objective control timing and setup
  - `getRoamingEfficiencyMetrics` - Calculate roaming success rate and impact
  - `getMapPressureBenchmarks` - Get high-elo map pressure patterns

### 2. PositioningAnalysisAgent
- **Focus**: Lane/teamfight/objective positioning, heat maps, risk scores
- **Handler**: `agents/action-groups/positioning-tools.handler`
- **Orchestrator**: `agents/orchestrators/positioning-agent.handler`
- **Key Functions**:
  - `generatePositioningHeatMap` - Generate positioning heat map from timeline data
  - `analyzeTeamFightPositioning` - Analyze positioning during team fights
  - `getOptimalPositioningPatterns` - Fetch optimal positioning data
  - `calculatePositioningRiskScore` - Calculate risk score based on threat proximity

### 3. TemporalAnalysisAgent
- **Focus**: Performance trends over time, power spike utilization, game phase effectiveness
- **Handler**: `agents/action-groups/temporal-tools.handler`
- **Orchestrator**: `agents/orchestrators/temporal-agent.handler`
- **Key Functions**:
  - `analyzePerformanceTrends` - Track performance changes throughout match
  - `evaluatePowerSpikeUtilization` - Assess effectiveness of power spike timing
  - `getGamePhaseEffectiveness` - Analyze performance by game phase
  - `calculateTemporalConsistency` - Measure consistency over time periods

### 4. SynergyAnalysisAgent
- **Focus**: Team composition synergies, champion pairing, coordinated play patterns
- **Handler**: `agents/action-groups/synergy-tools.handler`
- **Orchestrator**: `agents/orchestrators/synergy-agent.handler`
- **Key Functions**:
  - `analyzeTeamCompositionSynergy` - Evaluate team setup effectiveness
  - `getChampionPairingMetrics` - Measure champion combination performance
  - `evaluateCoordinatedPlayPatterns` - Assess team coordination quality
  - `getSynergyRecommendations` - Suggest optimal champion combinations

### 5. AdaptationAnalysisAgent
- **Focus**: Strategy adaptation, build flexibility, playstyle pivoting
- **Handler**: `agents/action-groups/adaptation-tools.handler`
- **Orchestrator**: `agents/orchestrators/adaptation-agent.handler`
- **Key Functions**:
  - `analyzeStrategyAdaptation` - Track strategic adjustments during match
  - `evaluateBuildFlexibility` - Assess item build adaptation effectiveness
  - `getPlaystylePivotingMetrics` - Measure playstyle change success
  - `calculateAdaptationScore` - Overall adaptation performance rating

## Implementation Details

### AWS Resources Added (per agent)
- **Bedrock Agent**: Agent definition with instructions and AutoPrepare enabled
- **Agent Aliases**: Production and test aliases with routing configuration
- **Action Group Lambda**: Function handler for agent tools (512MB, 60s timeout)
- **Lambda Permission**: Bedrock invoke permission for action group
- **Orchestrator Lambda**: Function for agent invocation and WebSocket communication (512MB, 120s timeout)
- **IAM Policies**: DynamoDB, WebSocket, and Bedrock invoke permissions
- **State Machine Integration**: ARN substitutions and invoke policies

### Foundation Models Used
- **MacroAnalysisAgent**: Custom application inference profile
- **PositioningAnalysisAgent**: Anthropic Claude 3.5 Sonnet
- **TemporalAnalysisAgent**: Anthropic Claude 3.5 Sonnet
- **SynergyAnalysisAgent**: Anthropic Claude 3.5 Sonnet
- **AdaptationAnalysisAgent**: Anthropic Claude 3.5 Sonnet

## Integration Points

### WebSocket Communication
All new agents follow the existing WebSocket communication pattern:
1. Read filtered match data from DynamoDB using `dataKey`
2. Execute specialized analysis using Bedrock agent invocation
3. Send progress updates via WebSocket to connected clients
4. Return structured output to Step Functions for aggregation

### Step Functions Integration
The new agents are integrated into the existing Step Functions Express workflow:
- Added to parallel state execution (MaxConcurrency: 6)
- Included in error handling with exponential backoff retries
- Outputs aggregated in the synthesizer phase

### DynamoDB Schema
Uses existing MatchData table format:
- PK: `dataKey` (`match:{matchId}:puuid:{puuid}`)
- Attributes: Filtered JSON grouped by domain
- TTL: `expiresAt` (30 days)

## Total Agent Count

**Original 6 Agents + 5 New Agents = 11 Total Agents**

### Original Agents
1. Build Analysis Agent (Jayce)
2. Combat Analysis Agent (Vi)
3. Vision Analysis Agent (Caitlyn)
4. Economy Analysis Agent (Camille)
5. Champion Analysis Agent (Viktor)
6. Competitive Analysis Agent (Ekko)

### New Agents
7. Macro Analysis Agent
8. Positioning Analysis Agent
9. Temporal Analysis Agent
10. Synergy Analysis Agent
11. Adaptation Analysis Agent

## Impact on Phase 12

The animation system in Phase 12 needs to be updated to:
1. Support 11 agents instead of 6
2. Add champion mappings for the 5 new agents
3. Update the animation flow to accommodate longer processing time
4. Enhance the progress tracking for the expanded agent set
5. Update the Heimerdinger synthesis to handle 11 instead of 6 champions
