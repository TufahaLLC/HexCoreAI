# Task 7.2: Define Phase 7 Bedrock Resources in SAM Template

**Status**: 🔄 Pending

## Overview

Author the **canonical SAM template definitions** for every AWS resource required across Phase 7. This includes Bedrock Agents, Lambda action groups, orchestrator functions, IAM roles, DynamoDB tables, Step Functions integration, parameters, permissions, and outputs. Completing this task ensures all downstream implementation work in tasks 7.3–7.18 can reference stable infrastructure definitions backed by `template.yaml`.

## Phase 7 Resource Inventory

- **Bedrock Agent Execution Roles** – Trust policies, model access, and Lambda invocation permissions.
- **Lambda Action Group Functions** – Declarations for all Bedrock tool Lambdas (logic implemented in tasks 7.3–7.8).
- **Lambda Permissions** – `AWS::Lambda::Permission` resources binding Bedrock agents to their tool Lambdas.
- **Bedrock Agents & Aliases** – Six specialized agents with prod/test aliases and instruction scaffolding.
- **Orchestrator Functions** – Streaming orchestration Lambdas defined for later implementation in tasks 7.10–7.15.
- **Shared Data Stores & Parameters** – Environment configuration, DynamoDB tables, and outputs consumed by Phase 7 services.
- **State Machine Integration** – Updates that connect orchestrators and synthesis flows defined in Task 2.8.

> **Goal:** When this task is complete, the SAM template contains *every* Phase 7 infrastructure resource so that subsequent tasks focus solely on code implementation and validation.

---

## Subtasks

### 7.2.1: Define IAM Roles for Bedrock Agents

Create service roles that Bedrock agents will assume.

- [ ] Create `BedrockAgentServiceRole` with trust policy for bedrock.amazonaws.com
- [ ] Add policy to invoke foundation models
- [ ] Add policy to invoke Lambda action groups
- [ ] Add CloudWatch Logs permissions

**SAM Template (IAM Roles):**
```yaml
Resources:
  # ==================== Bedrock Agent IAM Roles ====================
  BedrockAgentServiceRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: HexCore-BedrockAgent-ServiceRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: bedrock.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
      Policies:
        - PolicyName: BedrockModelAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                Resource: !Sub 'arn:aws:bedrock:${AWS::Region}::foundation-model/*'
        - PolicyName: LambdaInvokeAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - lambda:InvokeFunction
                Resource:
                  - !GetAtt BuildAgentActionGroupFunction.Arn
                  - !GetAtt CombatAgentActionGroupFunction.Arn
                  - !GetAtt VisionAgentActionGroupFunction.Arn
                  - !GetAtt EconomyAgentActionGroupFunction.Arn
                  - !GetAtt ChampionAgentActionGroupFunction.Arn
                  - !GetAtt CompetitiveAgentActionGroupFunction.Arn
```

### 7.2.2: Define Action Group Lambda Functions

Create Lambda functions that serve as tools for Bedrock Agents.

- [ ] Define BuildAgentActionGroupFunction
- [ ] Define CombatAgentActionGroupFunction
- [ ] Define VisionAgentActionGroupFunction
- [ ] Define EconomyAgentActionGroupFunction
- [ ] Define ChampionAgentActionGroupFunction
- [ ] Define CompetitiveAgentActionGroupFunction
- [ ] Add DynamoDB read policies
- [ ] Add CloudWatch Logs permissions
- [ ] Configure esbuild metadata for TypeScript compilation

**Example SAM Template (Action Group Function):**
```yaml
  BuildAgentActionGroupFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-BuildAgent-ActionGroup
      Handler: agents/action-groups/build-tools.handler
      CodeUri: ./dist
      Timeout: 60
      MemorySize: 512
      Environment:
        Variables:
          POWERTOOLS_SERVICE_NAME: hexcore-build-tools
          LOG_LEVEL: INFO
          MATCH_DATA_TABLE: !Ref MatchDataTable
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref MatchDataTable
      Tracing: Active
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Format: esm
        Minify: true
        Target: es2022
        Sourcemap: true
        EntryPoints:
          - agents/action-groups/build-tools.ts
```

### 7.2.3: Grant Lambda Invoke Permissions to Bedrock

Allow Bedrock agents to invoke action group Lambda functions.

- [ ] Add Lambda permissions for each action group function
- [ ] Set principal to bedrock.amazonaws.com
- [ ] Scope permissions to agent ARNs

**SAM Template (Lambda Permissions):**
```yaml
  BuildAgentActionGroupPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref BuildAgentActionGroupFunction
      Action: lambda:InvokeFunction
      Principal: bedrock.amazonaws.com
      SourceAccount: !Ref AWS::AccountId
      SourceArn: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/*'
```

### 7.2.4: Define Bedrock Agents

Create Bedrock Agent resources with action groups and specialized instructions.

- [ ] Define BuildAnalysisAgent with build optimization instruction
- [ ] Define CombatAnalysisAgent with combat performance instruction
- [ ] Define VisionAnalysisAgent with vision control instruction
- [ ] Define EconomyAnalysisAgent with resource management instruction
- [ ] Define ChampionAnalysisAgent with champion mastery instruction
- [ ] Define CompetitiveAnalysisAgent with rank progression instruction
- [ ] Configure action groups with function schemas
- [ ] Enable auto-prepare for automatic updates

**Example SAM Template (Bedrock Agent):**
```yaml
  BuildAnalysisAgent:
    Type: AWS::Bedrock::Agent
    Properties:
      AgentName: HexCore-BuildAnalysisAgent
      AgentResourceRoleArn: !GetAtt BedrockAgentServiceRole.Arn
      FoundationModel: anthropic.claude-3-5-sonnet-20241022-v2:0
      Instruction: |
        You are an expert League of Legends build optimization analyst. Analyze itemization 
        patterns, build paths, and adaptation strategies. Provide actionable recommendations 
        for improving item efficiency, power spike timing, and situational adaptation. 
        Consider champion-specific builds, enemy team composition, and game state when 
        making recommendations.
      AutoPrepare: true
      ActionGroups:
        - ActionGroupName: BuildAnalysisTools
          ActionGroupExecutor:
            Lambda: !GetAtt BuildAgentActionGroupFunction.Arn
          FunctionSchema:
            Functions:
              - Name: getMatchBuildData
                Description: Retrieve build and itemization data for a specific match
                Parameters:
                  matchId:
                    Type: string
                    Description: The match ID to analyze
                    Required: true
                  puuid:
                    Type: string
                    Description: Player unique identifier
                    Required: true
              - Name: analyzeBuildEfficiency
                Description: Analyze build path efficiency and optimization opportunities
                Parameters:
                  itemTimeline:
                    Type: array
                    Description: Array of item purchase events with timestamps
                    Required: true
                  goldPerMinute:
                    Type: array
                    Description: Gold accumulation per minute
                    Required: true
              - Name: recommendItemAdaptations
                Description: Generate situational item recommendations based on enemy composition
                Parameters:
                  currentBuild:
                    Type: array
                    Description: Current item build
                    Required: true
                  enemyChampions:
                    Type: array
                    Description: Enemy team champion names
                    Required: true
```

### 7.2.5: Create Agent Aliases

Create versioned aliases for testing and production environments.

- [ ] Create production aliases for all agents
- [ ] Create testing aliases for all agents
- [ ] Configure alias routing policies

**SAM Template (Agent Aliases):**
```yaml
  # Production Aliases
  BuildAnalysisAgentProdAlias:
    Type: AWS::Bedrock::AgentAlias
    Properties:
      AgentId: !GetAtt BuildAnalysisAgent.AgentId
      AgentAliasName: prod
      Description: Production alias for Build Analysis Agent

  # Testing Aliases
  BuildAnalysisAgentTestAlias:
    Type: AWS::Bedrock::AgentAlias
    Properties:
      AgentId: !GetAtt BuildAnalysisAgent.AgentId
      AgentAliasName: test
      Description: Testing alias for Build Analysis Agent
```

### 7.2.6: Provision Shared Data Stores & Parameters

Add shared persistence and configuration elements required by orchestrators, action groups, and session management utilities.

- [ ] Define `AgentSessionsTable` with TTL support for automatic cleanup
- [ ] Confirm existing `MatchDataTable` and `ConnectionsTable` references resolve correctly
- [ ] Expose table names and environment flags via SAM parameters and function environment variables
- [ ] Tag shared resources for Phase 7 cost tracking

**SAM Template (Shared Data Stores & Parameters):**
```yaml
  Parameters:
    Environment:
      Type: String
      Default: prod
      AllowedValues:
        - test
        - prod

  AgentSessionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: HexCore-AgentSessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: sessionId
          AttributeType: S
        - AttributeName: userSessionId
          AttributeType: S
        - AttributeName: createdAt
          AttributeType: N
      KeySchema:
        - AttributeName: sessionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: UserSessionIndex
          KeySchema:
            - AttributeName: userSessionId
              KeyType: HASH
            - AttributeName: createdAt
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true
      Tags:
        - Key: Project
          Value: HexCoreAI
```

> **Note:** Later tasks (e.g., `task-717-session-management.md`) implement the runtime utilities that interact with these resources. Defining them here keeps the infrastructure source-of-truth centralized.

### 7.2.7: Define Agent Orchestrator Functions

Define agent orchestrator Lambda functions in the SAM template and implement them to invoke Bedrock Agents.

**SAM Template Definition:**
- [ ] Define BuildAgentOrchestratorFunction
- [ ] Define CombatAgentOrchestratorFunction
- [ ] Define VisionAgentOrchestratorFunction
- [ ] Define EconomyAgentOrchestratorFunction
- [ ] Define ChampionAgentOrchestratorFunction
- [ ] Define CompetitiveAgentOrchestratorFunction
- [ ] Add bedrock:InvokeAgent permissions
- [ ] Add environment variables for agent IDs and alias IDs

**Example SAM Template (Orchestrator Function):**
```yaml
  BuildAgentOrchestratorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-BuildAgent-Orchestrator
      Handler: agents/orchestrators/build-agent.handler
      CodeUri: ./dist
      Timeout: 120
      MemorySize: 512
      Environment:
        Variables:
          BEDROCK_AGENT_ID: !GetAtt BuildAnalysisAgent.AgentId
          BEDROCK_AGENT_ALIAS_ID: !GetAtt BuildAnalysisAgentProdAlias.AgentAliasId
          ENABLE_BEDROCK_TRACES: 'true'
          POWERTOOLS_SERVICE_NAME: hexcore-build-orchestrator
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
              Action:
                - execute-api:ManageConnections
              Resource: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*'
            - Effect: Allow
              Action:
                - bedrock:InvokeAgent
              Resource: !GetAtt BuildAnalysisAgent.AgentArn
      Tracing: Active
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Format: esm
        Minify: true
        Target: es2022
        Sourcemap: true
        EntryPoints:
          - agents/orchestrators/build-agent.ts
```

**Note:** Repeat similar configuration for all 6 orchestrator functions (Build, Combat, Vision, Economy, Champion, Competitive).
```

### 7.2.8: Update Step Functions State Machine

Update the state machine (defined in Task 2.8) to add orchestrator function references.

- [ ] Add DefinitionSubstitutions with orchestrator function ARNs
- [ ] Add Lambda invoke policies for all orchestrator functions

**SAM Template (Add to MultiAgentStateMachine from Task 2.8):**
```yaml
  MultiAgentStateMachine:
    Type: AWS::Serverless::StateMachine
    Properties:
      Name: HexCore-MultiAgent-Orchestration
      Type: EXPRESS
      DefinitionUri: statemachine/multi-agent-orchestration.asl.json
      # ADD these properties to the existing resource from Task 2.8:
      DefinitionSubstitutions:
        BuildAgentFunctionArn: !GetAtt BuildAgentOrchestratorFunction.Arn
        CombatAgentFunctionArn: !GetAtt CombatAgentOrchestratorFunction.Arn
        VisionAgentFunctionArn: !GetAtt VisionAgentOrchestratorFunction.Arn
        EconomyAgentFunctionArn: !GetAtt EconomyAgentOrchestratorFunction.Arn
        ChampionAgentFunctionArn: !GetAtt ChampionAgentOrchestratorFunction.Arn
        CompetitiveAgentFunctionArn: !GetAtt CompetitiveAgentOrchestratorFunction.Arn
        SynthesizerFunctionArn: !GetAtt SynthesizerFunction.Arn
      Policies:
        - LambdaInvokePolicy:
            FunctionName: !Ref BuildAgentOrchestratorFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref CombatAgentOrchestratorFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref VisionAgentOrchestratorFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref EconomyAgentOrchestratorFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref ChampionAgentOrchestratorFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref CompetitiveAgentOrchestratorFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref SynthesizerFunction
      # Tracing and Logging already defined in Task 2.8
```

### 7.2.9: Add Outputs for Agent Information

Add outputs for easy reference to agent IDs and alias IDs.

- [ ] Add outputs for each agent ID
- [ ] Add outputs for each agent ARN
- [ ] Add outputs for production and testing alias IDs

**SAM Template (Outputs):**
```yaml
Outputs:
  # Agent IDs
  BuildAnalysisAgentId:
    Description: Build Analysis Agent ID
    Value: !GetAtt BuildAnalysisAgent.AgentId
  
  # Production Alias IDs
  BuildAnalysisAgentProdAliasId:
    Description: Build Analysis Agent Production Alias ID
    Value: !GetAtt BuildAnalysisAgentProdAlias.AgentAliasId
  
  # Testing Alias IDs
  BuildAnalysisAgentTestAliasId:
    Description: Build Analysis Agent Testing Alias ID
    Value: !GetAtt BuildAnalysisAgentTestAlias.AgentAliasId
```

---

## Agent Instructions Reference

### Build Analysis Agent
```
You are an expert League of Legends build optimization analyst. Analyze itemization 
patterns, build paths, and adaptation strategies. Provide actionable recommendations 
for improving item efficiency, power spike timing, and situational adaptation. 
Consider champion-specific builds, enemy team composition, and game state when 
making recommendations.
```

### Combat Analysis Agent
```
You are an expert League of Legends combat performance analyst. Analyze teamfight 
effectiveness, damage output, survivability, and engagement patterns. Provide 
insights on combat timing, target selection, and positioning. Help players 
understand their combat strengths and areas for improvement.
```

### Vision Analysis Agent
```
You are an expert League of Legends vision control analyst. Analyze ward placement 
patterns, vision denial, and map awareness. Provide recommendations for improving 
vision coverage, objective control preparation, and enemy vision denial. Consider 
game state, role requirements, and strategic importance of vision locations.
```

### Economy Analysis Agent
```
You are an expert League of Legends economy and resource management analyst. Analyze 
gold generation, farming efficiency, and resource allocation. Provide insights on 
CS improvement opportunities, gold optimization, and economic scaling. Help players 
maximize their economic impact relative to their role.
```

### Champion Analysis Agent
```
You are an expert League of Legends champion performance analyst. Analyze champion-
specific performance, mastery progression, and pool optimization. Provide insights 
on champion strengths, weaknesses, and learning curves. Help players understand 
which champions align with their playstyle and skill level.
```

### Competitive Analysis Agent
```
You are an expert League of Legends competitive progression analyst. Analyze ranked 
performance, climb efficiency, and skill development. Provide insights on rank-
appropriate strategies, performance consistency, and areas for improvement. Help 
players understand their competitive trajectory and readiness for higher ranks.
```

---

## Validation

### Pre-Deployment Checks

- [ ] All 6 Bedrock Agents defined
- [ ] All 6 Action Group Lambda functions defined
- [ ] All 6 Orchestrator Lambda functions defined
- [ ] All Lambda permissions granted
- [ ] All agent aliases created (prod + test)
- [ ] IAM roles properly configured
- [ ] Environment variables set correctly
- [ ] State machine updated with new ARNs
- [ ] Outputs defined for all agents

### Post-Deployment Validation

```bash
# Verify agents created
aws bedrock-agent list-agents

# Verify agent aliases
aws bedrock-agent list-agent-aliases --agent-id <AGENT_ID>

# Check CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name hexcore-ai \
  --query 'Stacks[0].Outputs'
```

---

## Foundation Model

All agents use: **anthropic.claude-3-5-sonnet-20241022-v2:0**

**Why Claude 3.5 Sonnet?**
- Advanced reasoning capabilities
- Strong analytical skills
- Excellent at structured data interpretation
- Consistent output formatting
- Good balance of performance and cost

---

## Cost Optimization

### Environment-Based Configuration

Use SAM parameters to control trace enablement:

```yaml
Parameters:
  Environment:
    Type: String
    Default: prod
    AllowedValues:
      - test
      - prod

Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

# In orchestrator functions
Environment:
  Variables:
    ENABLE_BEDROCK_TRACES: !If
      - IsProduction
      - 'true'   # Production: traces enabled for UX
      - 'false'  # Testing: traces disabled for cost savings
```

**Cost Impact:**
- Traces add ~20-30% token usage
- Testing: Disable traces to reduce costs
- Production: Enable traces for better UX

---

## Next Steps

After completing this task:
1. Deploy SAM template: `sam build && sam deploy`
2. Verify all agents created in AWS Console
3. Note agent IDs and alias IDs from outputs
4. Proceed to [Task 7.3: Build Action Groups](./task-73-build-action-groups.md)

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 103-1136
- [AWS Bedrock Agents CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-bedrock-agent.html)
- [Task 7.7: Project Setup](./task-77-update-project-setup.md) - Prerequisites
