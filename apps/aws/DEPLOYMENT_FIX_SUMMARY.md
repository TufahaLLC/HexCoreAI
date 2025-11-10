# SAM Template Deployment Fix Summary

## Issues Identified and Fixed

### 1. **Missing Bedrock Agent Action Groups**

**Problem**: The Bedrock agents were defined but had no action groups attached, which prevented them from being prepared and caused alias creation to fail.

**Root Cause**: `AWS::Bedrock::AgentActionGroup` is not a valid CloudFormation resource type. Action groups must be created programmatically via the AWS SDK.

**Solution**:

- Removed invalid `AWS::Bedrock::AgentActionGroup` resources from the template
- Updated `AgentPreparationFunction` Lambda to create action groups programmatically before preparing agents
- Added necessary IAM permissions for action group management

### 2. **Circular Dependency with Agent Aliases**

**Problem**: Agent aliases depended on `AgentPreparationCustomResource`, which was conditionally created only when `CreateAliases` was true, creating a circular dependency.

**Solution**:

- Removed the `Condition: CreateAliases` from `AgentPreparationCustomResource` so it always runs
- The custom resource now creates action groups and prepares agents on every deployment
- Aliases are still conditionally created based on the `CreateAgentAliases` parameter

### 3. **Redundant DependsOn Declaration**

**Problem**: `MultiAgentStateMachine` had a redundant `DependsOn: StateMachineLogGroup` when `!GetAtt StateMachineLogGroup.Arn` already creates an implicit dependency.

**Solution**: Removed the redundant `DependsOn` declaration.

## Changes Made

### Template Changes (`template.yaml`)

1. **AgentPreparationFunction** - Added IAM permissions:

   ```yaml
   - bedrock:CreateAgentActionGroup
   - bedrock:UpdateAgentActionGroup
   - bedrock:GetAgentActionGroup
   - bedrock:ListAgentActionGroups
   - bedrock:DeleteAgentActionGroup
   ```

2. **AgentPreparationCustomResource** - Updated properties:

   - Changed from `AgentIds: [...]` to `AgentConfigs: [...]`
   - Each config includes: `AgentId`, `AgentName`, `ActionGroupName`, `LambdaArn`
   - Removed `Condition: CreateAliases`
   - Removed `DependsOn` on action group resources (which no longer exist)

3. **Removed invalid resources**:

   - All `AWS::Bedrock::AgentActionGroup` resources (11 total)

4. **Fixed redundant dependency**:
   - Removed `DependsOn: StateMachineLogGroup` from `MultiAgentStateMachine`

### Code Changes (`src/agent-preparation.ts`)

1. **Updated imports**:

   - Added: `CreateAgentActionGroupCommand`, `ListAgentActionGroupsCommand`, `UpdateAgentActionGroupCommand`
   - Removed unused: `GetAgentActionGroupCommand`

2. **New type definitions**:

   ```typescript
   type AgentConfig = {
     AgentId: string;
     AgentName: string;
     ActionGroupName: string;
     LambdaArn: string;
   };

   type AgentPreparationProperties = {
     AgentConfigs: AgentConfig[];
   };
   ```

3. **New function**: `createOrUpdateActionGroup(config: AgentConfig)`

   - Checks if action group exists using `ListAgentActionGroupsCommand`
   - Updates existing action group or creates new one
   - Generates OpenAPI schema dynamically based on agent name
   - Handles errors gracefully

4. **Updated handler workflow**:
   - Step 1: Create/update action groups for all agents
   - Step 2: Prepare all agents (calls `PrepareAgent` API)
   - Step 3: Wait for all agents to reach "PREPARED" status

## Deployment Instructions

### First-Time Deployment (No Aliases)

```bash
sam build
sam deploy --parameter-overrides CreateAgentAliases=false
```

This will:

1. Create all Bedrock agents
2. Create action groups for each agent via custom resource
3. Prepare all agents (make them ready to use)
4. Skip alias creation

### Subsequent Deployment (With Aliases)

After agents are prepared, deploy again with aliases:

```bash
sam deploy --parameter-overrides CreateAgentAliases=true
```

This will:

1. Update action groups if needed
2. Re-prepare agents if changes were made
3. Create prod and test aliases for all agents

### Update Deployment

For code updates without changing agent configuration:

```bash
sam build
sam deploy
```

The custom resource will:

- Update action groups if Lambda ARNs or schemas changed
- Skip re-preparation if agents are already prepared
- Update aliases if they exist

## Validation

The template now passes all SAM validation checks:

```bash
sam validate --template template.yaml --lint
# Output: C:\...\template.yaml is a valid SAM Template
```

## Key Benefits

1. **No Manual Steps**: Action groups are created automatically during deployment
2. **Idempotent**: Re-running deployment won't fail if action groups already exist
3. **Flexible**: Can deploy with or without aliases based on parameter
4. **Robust**: Handles errors gracefully and provides detailed logging
5. **Maintainable**: All 11 agents follow the same pattern

## Testing Checklist

- [x] `sam build` completes successfully
- [x] `sam validate --template template.yaml --lint` passes
- [ ] First deployment with `CreateAgentAliases=false` succeeds
- [ ] Custom resource creates all 11 action groups
- [ ] All agents reach "PREPARED" status
- [ ] Second deployment with `CreateAgentAliases=true` succeeds
- [ ] All prod and test aliases are created
- [ ] Orchestrator Lambdas can invoke agents successfully

## Troubleshooting

### If agent preparation times out:

- Check CloudWatch logs for `HexCore-AgentPreparation` Lambda
- Verify Bedrock service is available in your region
- Increase `MAX_PREPARATION_ATTEMPTS` in `agent-preparation.ts` if needed

### If action group creation fails:

- Verify Lambda permissions include all required Bedrock actions
- Check that action group Lambda functions are deployed
- Review CloudWatch logs for specific error messages

### If aliases fail to create:

- Ensure agents are in "PREPARED" status before setting `CreateAgentAliases=true`
- Check that `AgentPreparationCustomResource` completed successfully
- Verify the custom resource output in CloudFormation console
