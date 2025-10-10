# Task 11.2: Define and Configure New Specialized Agents

**Status:** 🔄 Pending

## Overview

Define and configure new specialized agents to expand beyond the existing agent set. These agents focus on macro gameplay, positioning, temporal performance, synergy, and adaptation. Add Bedrock Agent, Alias, Action Group Lambda, Permissions, and Orchestrator for each.

Agents to add:

- MacroAnalysisAgent
- PositioningAnalysisAgent
- TemporalAnalysisAgent
- SynergyAnalysisAgent
- AdaptationAnalysisAgent

---

## SAM Template Additions

**File:** `template.yaml`

Add resources for agents, aliases, action group functions, permissions, and orchestrator functions. Below is a complete example for MacroAnalysisAgent and PositioningAnalysisAgent; replicate the pattern for the remaining agents.

```yaml
# ==================== Task 11.2: New Agent Definitions ====================

# MacroAgent Resources
MacroAnalysisAgent:
  Type: AWS::Bedrock::Agent
  Properties:
    AgentName: HexCore-MacroAnalysisAgent
    AgentResourceRoleArn: !GetAtt BedrockAgentServiceRole.Arn
    FoundationModel: anthropic.claude-3-5-sonnet-20241022-v2:0
    Instruction: |
      You are an expert League of Legends macro gameplay analyst. Analyze map movements,
      objective control timing, roaming efficiency, and strategic decision-making.
      Compare to high-elo patterns and professional standards.
    AutoPrepare: true
    ActionGroups:
      - ActionGroupName: MacroAnalysisTools
        ActionGroupExecutor:
          Lambda: !GetAtt MacroAgentActionGroupFunction.Arn
        FunctionSchema:
          Functions:
            - Name: getPlayerMovementPatterns
              Description: Analyze player map movement and roaming patterns from timeline data
              Parameters:
                matchId: { Type: string, Required: true }
                puuid: { Type: string, Required: true }
            - Name: getObjectiveControlAnalysis
              Description: Analyze objective control timing and setup quality
              Parameters:
                matchId: { Type: string, Required: true }
                puuid: { Type: string, Required: true }
            - Name: getRoamingEfficiencyMetrics
              Description: Calculate roaming success rate and impact
              Parameters:
                positionTimeline: { Type: array, Required: true }
                killEvents: { Type: array, Required: true }
            - Name: getMapPressureBenchmarks
              Description: Get high-elo map pressure patterns from external APIs
              Parameters:
                role: { Type: string, Required: true }
                rank: { Type: string, Required: true }

MacroAgentProdAlias:
  Type: AWS::Bedrock::AgentAlias
  Properties:
    AgentId: !GetAtt MacroAnalysisAgent.AgentId
    AgentAliasName: prod

MacroAgentActionGroupFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: HexCore-MacroAgent-ActionGroup
    Handler: agents/action-groups/macro-tools.handler
    CodeUri: ./dist
    Timeout: 60
    MemorySize: 512
    Environment:
      Variables:
        POWERTOOLS_SERVICE_NAME: hexcore-macro-tools
        LOG_LEVEL: INFO
        MATCH_DATA_TABLE: !Ref MatchDataTable
        EXTERNAL_DATA_CACHE_TABLE: !Ref ExternalDataCacheTable
    Policies:
      - DynamoDBReadPolicy:
          TableName: !Ref MatchDataTable
      - DynamoDBReadPolicy:
          TableName: !Ref ExternalDataCacheTable
    Tracing: Active
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Format: esm
        Minify: true
        Target: es2022
        Sourcemap: true
        EntryPoints:
          - agents/action-groups/macro-tools.ts

MacroAgentActionGroupPermission:
  Type: AWS::Lambda::Permission
  Properties:
    FunctionName: !Ref MacroAgentActionGroupFunction
    Action: lambda:InvokeFunction
    Principal: bedrock.amazonaws.com
    SourceAccount: !Ref AWS::AccountId
    SourceArn: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/*'

MacroAgentOrchestratorFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: HexCore-MacroAgent-Orchestrator
    Handler: agents/orchestrators/macro-agent.handler
    CodeUri: ./dist
    Timeout: 120
    MemorySize: 512
    Environment:
      Variables:
        BEDROCK_AGENT_ID: !GetAtt MacroAnalysisAgent.AgentId
        BEDROCK_AGENT_ALIAS_ID: !GetAtt MacroAgentProdAlias.AgentAliasId
        ENABLE_BEDROCK_TRACES: 'true'
        POWERTOOLS_SERVICE_NAME: hexcore-macro-orchestrator
        LOG_LEVEL: INFO
        AGENT_SESSIONS_TABLE: !Ref AgentSessionsTable
    Policies:
      - DynamoDBReadPolicy:
          TableName: !Ref MatchDataTable
      - DynamoDBCrudPolicy:
          TableName: !Ref ConnectionsTable
      - DynamoDBCrudPolicy:
          TableName: !Ref AgentSessionsTable
      - Statement:
          - Effect: Allow
            Action: [ execute-api:ManageConnections ]
            Resource: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*'
          - Effect: Allow
            Action: [ bedrock:InvokeAgent ]
            Resource: !GetAtt MacroAnalysisAgent.AgentArn
    Tracing: Active
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Format: esm
        Minify: true
        Target: es2022
        Sourcemap: true
        EntryPoints:
          - agents/orchestrators/macro-agent.ts

# ==================== PositioningAgent ====================
PositioningAnalysisAgent:
  Type: AWS::Bedrock::Agent
  Properties:
    AgentName: HexCore-PositioningAnalysisAgent
    AgentResourceRoleArn: !GetAtt BedrockAgentServiceRole.Arn
    FoundationModel: anthropic.claude-3-5-sonnet-20241022-v2:0
    Instruction: |
      You are an expert positioning analyst. Analyze lane, fight, and objective positioning
      using timeline coordinates. Generate heat maps and risk scores.
    AutoPrepare: true
    ActionGroups:
      - ActionGroupName: PositioningAnalysisTools
        ActionGroupExecutor:
          Lambda: !GetAtt PositioningAgentActionGroupFunction.Arn
        FunctionSchema:
          Functions:
            - Name: generatePositioningHeatMap
              Description: Generate positioning heat map from timeline data
              Parameters:
                positionTimeline: { Type: array, Required: true }
                deathEvents: { Type: array, Required: true }
            - Name: analyzeTeamFightPositioning
              Description: Analyze positioning during team fights
              Parameters:
                teamFightEvents: { Type: array, Required: true }
                championRole: { Type: string, Required: true }
            - Name: getOptimalPositioningPatterns
              Description: Fetch optimal positioning data from external APIs
              Parameters:
                championName: { Type: string, Required: true }
                role: { Type: string, Required: true }
            - Name: calculatePositioningRiskScore
              Description: Calculate risk score based on position proximity to threats
              Parameters:
                position: { Type: object, Required: true }
                enemyPositions: { Type: array, Required: true }

# (Similar structure for TemporalAgent, SynergyAgent, AdaptationAgent)
```

---

## Acceptance Criteria

- MacroAnalysisAgent and PositioningAnalysisAgent resources compile with `sam build`.
- Action group Lambda handlers and orchestrator handlers are wired via CodeUri/Handler.
- Aliases exist and orchestrators read `BEDROCK_AGENT_ID`/`BEDROCK_AGENT_ALIAS_ID` from env.
- IAM policies allow Bedrock agent invocation and WebSocket updates.

## References

- Source: `docs/Enhance phase 11 to include Specific fields from t.md` → Section 4, Task 11.2
- Related: `task-113-implement-action-groups-for-new-specialized-agents.md`
- Related: `task-114-implement-orchestrators-for-new-specialized-agents.md`
