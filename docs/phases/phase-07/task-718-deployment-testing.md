# Task 7.18: Deploy & Test Bedrock Agents

**Status**: 🚧 In Progress

## Overview

Deploy the complete Bedrock Agents infrastructure and validate end-to-end functionality. This final task ensures all components work together correctly before production use.

---

## Prerequisites

Before deployment, ensure all previous tasks are complete:

- ✅ Task 7.1: Dependencies updated
- ✅ Task 7.2: SAM template defined
- ✅ Tasks 7.3-7.8: All action groups implemented
- ✅ Task 7.9: Bedrock client created
- ✅ Tasks 7.10-7.16: All orchestrators implemented
- ✅ Task 7.17: Session management integrated

---

## Deployment Steps

### Step 1: Install Dependencies ✅

```bash
# Navigate to aws app directory
cd apps/aws

# Install all dependencies
pnpminstall

# Verify critical packages
pnpmlist @aws-sdk/client-bedrock-agent-runtime
pnpmlist @aws-lambda-powertools/event-handler
```

### Step 2: Build TypeScript ✅

```bash
# Clean previous builds
pnpm run clean

# Compile TypeScript to JavaScript
pnpm run build

# Verify dist/ directory created
ls -la dist/agents/action-groups/
ls -la dist/agents/orchestrators/
```

### Step 3: Build SAM Application 🚧

```bash
# Build SAM application with dependencies
sam build

# Verify .aws-sam/build directory
ls -la .aws-sam/build/
```

### Step 4: Deploy to AWS 🚧

**First Deployment (Guided):**

```bash
sam deploy --guided

# You'll be prompted for:
# - Stack name: hexcore-ai
# - AWS Region: us-east-1 (or your preferred region)
# - Confirm changes before deploy: Y
# - Allow SAM CLI IAM role creation: Y
# - Disable rollback: N
# - Save arguments to configuration file: Y
```

**Subsequent Deployments:**

```bash
sam deploy
```

### Step 5: Capture Outputs 🚧

After deployment, save the CloudFormation outputs:

```bash
# Get all stack outputs
aws cloudformation describe-stacks \
  --stack-name hexcore-ai-test \
  --query 'Stacks[0].Outputs' \
  --output table

# Save specific agent IDs
export BUILD_AGENT_ID=$(aws cloudformation describe-stacks \
  --stack-name hexcore-ai-test \
  --query 'Stacks[0].Outputs[?OutputKey==`BuildAnalysisAgentId`].OutputValue' \
  --output text)

export BUILD_AGENT_ALIAS_ID=$(aws cloudformation describe-stacks \
  --stack-name hexcore-ai-test \
  --query 'Stacks[0].Outputs[?OutputKey==`BuildAnalysisAgentProdAliasId`].OutputValue' \
  --output text)
```

---

## Testing

### Test 1: Verify Bedrock Agents Created 🚧

```bash
# List all agents
aws bedrock-agent list-agents

# Get specific agent details
aws bedrock-agent get-agent --agent-id $BUILD_AGENT_ID

# List agent aliases
aws bedrock-agent list-agent-aliases --agent-id $BUILD_AGENT_ID
```

**Expected Output:**

- 6 agents created (Build, Combat, Vision, Economy, Champion, Competitive)
- Each agent has 2 aliases (prod, test)
- Agent status: PREPARED or VERSIONED

### Test 2: Test Action Group Lambda Functions 🚧

Create test event file: `test-events/build-action-group-test.json`

```json
{
  "messageVersion": "1.0",
  "agent": {
    "name": "HexCore-BuildAnalysisAgent",
    "id": "TEST_AGENT_ID",
    "alias": "TSTALIASID",
    "version": "DRAFT"
  },
  "inputText": "Test build analysis",
  "sessionId": "test-session-123",
  "actionGroup": "BuildAnalysisTools",
  "function": "getMatchBuildData",
  "parameters": [
    {
      "name": "matchId",
      "type": "string",
      "value": "NA1_4567890123"
    },
    {
      "name": "puuid",
      "type": "string",
      "value": "test-puuid-123"
    }
  ]
}
```

**Invoke Function:**

```bash
# Test Build Agent action group
aws lambda invoke \
  --function-name HexCore-BuildAgent-ActionGroup \
  --payload file://test-events/build-action-group-test.json \
  response.json

# Check response
cat response.json | jq
```

**Validation:**

- [ ] Function executes without errors
- [ ] Returns expected data structure
- [ ] DynamoDB query successful
- [ ] Logging appears in CloudWatch

### Test 3: Test Agent Invocation with Streaming 🚧

```bash
# Test direct agent invocation
aws bedrock-agent-runtime invoke-agent \
  --agent-id $BUILD_AGENT_ID \
  --agent-alias-id $BUILD_AGENT_ALIAS_ID \
  --session-id test-session-$(date +%s) \
  --input-text "Analyze build efficiency for a recent match" \
  --enable-trace \
  response-stream.txt

# View response
cat response-stream.txt
```

**Validation:**

- [ ] Agent responds with analysis
- [ ] Trace events visible (if enabled)
- [ ] Tool invocations logged
- [ ] Response is coherent and relevant

### Test 4: Test Orchestrator Functions 🚧 _(code updated to resolve shared agent environment fallbacks; deployment validation pending)_

Create test event: `test-events/orchestrator-test.json`

```json
{
  "keys": ["NA1_4567890123#test-puuid-123"],
  "sessionId": "ws-test-session-123",
  "matchId": "NA1_4567890123",
  "puuid": "test-puuid-123",
  "region": "NA1",
  "year": 2024
}
```

**Invoke Orchestrator:**

```bash
# Test Build Agent orchestrator
aws lambda invoke \
  --function-name HexCore-BuildAgent-Orchestrator \
  --payload file://test-events/orchestrator-test.json \
  orchestrator-response.json

# Check response
cat orchestrator-response.json | jq
```

**Validation:**

- [ ] Orchestrator invokes Bedrock agent
- [ ] Session registered in DynamoDB
- [ ] WebSocket updates sent (check logs)
- [ ] Session marked complete
- [ ] Tools invoked tracked
- [ ] Final analysis returned

### Test 5: End-to-End Analysis Flow 🚧

**Trigger via WebSocket:**

```bash
# Connect to WebSocket API
wscat -c wss://YOUR_WEBSOCKET_API_ID.execute-api.us-east-1.amazonaws.com/prod

# Send analysis request
{
  "action": "analyze",
  "matchId": "NA1_4567890123",
  "puuid": "test-puuid-123",
  "region": "NA1"
}
```

**Monitor Progress:**

- [ ] WebSocket receives connection confirmation
- [ ] Progress updates stream in real-time
- [ ] Each agent reports completion (20%, 35%, 50%, 65%, 75%, 90%)
- [ ] Trace events show tool invocations
- [ ] Final synthesis delivered
- [ ] WebSocket closes gracefully

### Test 6: Verify Session Management 🚧

```bash
# Query sessions for test user
aws dynamodb query \
  --table-name HexCore-AgentSessions \
  --index-name UserSessionIndex \
  --key-condition-expression "userSessionId = :sessionId" \
  --expression-attribute-values '{":sessionId":{"S":"ws-test-session-123"}}'

# Check session status
# Should show 6 sessions (one per agent) with status 'completed'
```

**Validation:**

- [ ] All 6 sessions registered
- [ ] Sessions marked 'completed'
- [ ] TTL set correctly (24 hours from now)
- [ ] Metadata includes toolsInvoked
- [ ] No sessions in 'active' state after completion

---

## Monitoring

### CloudWatch Logs

Check logs for each component:

```bash
# Action group logs
aws logs tail /aws/lambda/HexCore-BuildAgent-ActionGroup --follow

# Orchestrator logs
aws logs tail /aws/lambda/HexCore-BuildAgent-Orchestrator --follow

# Look for:
# - "Agent session registered"
# - "Tool invocation started"
# - "Tool invocation completed"
# - "Session marked complete"
```

### X-Ray Traces

```bash
# View traces in AWS Console
# Navigate to: X-Ray > Traces
# Filter by: Service name = hexcore-build-orchestrator

# Look for:
# - Bedrock agent invocation segments
# - DynamoDB query segments
# - Lambda execution time
# - Error traces (should be none)
```

### CloudWatch Metrics

Monitor key metrics:

- Lambda invocation count
- Lambda duration
- Lambda errors
- DynamoDB read/write capacity
- Bedrock agent invocations

---

## Performance Optimization

### Identify Bottlenecks

```bash
# Check Lambda execution times
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=HexCore-BuildAgent-Orchestrator \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

### Optimization Checklist

- [ ] Lambda memory sized appropriately (512MB default)
- [ ] Lambda timeout sufficient (120s for orchestrators)
- [ ] DynamoDB queries use indexes
- [ ] Bedrock agent responses cached where possible
- [ ] WebSocket messages batched when appropriate
- [ ] Trace events disabled in testing environment

---

## Troubleshooting

### Common Issues

**Issue: Agent not found**

```bash
# Verify agent created
aws bedrock-agent get-agent --agent-id $BUILD_AGENT_ID

# Check agent status
# Status should be PREPARED, not CREATING or FAILED
```

**Issue: Permission denied**

```bash
# Verify IAM roles
aws iam get-role --role-name HexCore-BedrockAgent-ServiceRole

# Check Lambda permissions
aws lambda get-policy --function-name HexCore-BuildAgent-ActionGroup
```

**Issue: Tool invocation fails**

```bash
# Check action group configuration
aws bedrock-agent get-agent-action-group \
  --agent-id $BUILD_AGENT_ID \
  --agent-version DRAFT \
  --action-group-id ACTION_GROUP_ID

# Verify Lambda function exists and is invocable
aws lambda invoke \
  --function-name HexCore-BuildAgent-ActionGroup \
  --payload '{}' \
  test-response.json
```

**Issue: Session not tracked**

```bash
# Verify table exists
aws dynamodb describe-table --table-name HexCore-AgentSessions

# Check TTL enabled
# TTL attribute should be 'ttl' and status 'ENABLED'

# Verify orchestrator has permissions
aws lambda get-policy --function-name HexCore-BuildAgent-Orchestrator
```

---

## Rollback Strategy

If deployment fails or issues arise:

```bash
# Rollback to previous version
aws cloudformation rollback-stack --stack-name hexcore-ai

# Or delete and redeploy
aws cloudformation delete-stack --stack-name hexcore-ai
# Wait for deletion to complete
sam deploy --guided
```

---

## Production Readiness Checklist

### Infrastructure

- [ ] All 6 Bedrock Agents created and PREPARED
- [ ] All 12 Lambda functions deployed (6 action groups + 6 orchestrators)
- [ ] All agent aliases created (prod + test)
- [ ] IAM roles and permissions configured
- [ ] DynamoDB tables created with TTL enabled
- [ ] Step Functions state machine updated

### Testing

- [ ] All action group tools tested individually
- [ ] All orchestrators tested with trace events
- [ ] End-to-end analysis flow validated
- [ ] Session tracking verified
- [ ] WebSocket streaming confirmed
- [ ] Error handling validated

### Monitoring

- [ ] CloudWatch Logs configured
- [ ] X-Ray tracing enabled
- [ ] CloudWatch dashboards created
- [ ] Alarms set for errors and latency

### Documentation

- [ ] Agent IDs and ARNs documented
- [ ] Deployment runbook created
- [ ] Troubleshooting guide available
- [ ] Rollback procedures documented

---

## Cost Estimation

**Monthly Cost Breakdown (estimated for 1000 analyses/month):**

| **Service**            | **Usage**                      | **Cost**          |
| ---------------------- | ------------------------------ | ----------------- |
| Bedrock Agents         | 6000 invocations × $0.002      | $12.00            |
| Claude 3.5 Sonnet      | ~500K tokens × $0.003/1K       | $1.50             |
| Lambda (Orchestrators) | 6000 invocations × 30s × 512MB | $3.60             |
| Lambda (Action Groups) | 18000 invocations × 5s × 512MB | $1.80             |
| DynamoDB               | 24K reads + 12K writes         | $0.50             |
| Step Functions         | 1000 executions                | $0.03             |
| **Total**              |                                | **~$19.43/month** |

**Cost Optimization:**

- Disable traces in testing (`ENABLE_BEDROCK_TRACES=false`)
- Use test aliases for development
- Monitor and adjust Lambda memory allocation
- Implement caching for repeated queries

---

## Next Steps

After successful deployment:

1. **Monitor Production**: Watch CloudWatch metrics for first week
2. **Gather Feedback**: Collect user feedback on analysis quality
3. **Optimize Performance**: Adjust based on real-world usage patterns
4. **Iterate on Prompts**: Refine agent instructions based on output quality
5. **Scale Testing**: Test with higher concurrency

---

## Success Criteria

✅ All 6 Bedrock Agents deployed and functional  
✅ End-to-end analysis completes successfully  
✅ WebSocket streaming shows real-time progress  
✅ Trace events provide transparent tool visibility  
✅ Session tracking prevents accumulation  
✅ No errors in CloudWatch Logs  
✅ Performance meets SLA requirements (<2 minutes per analysis)  
✅ Cost within budget expectations

---

## References

- [Phase 7 Update Guide](../../phase_7_update.md) - Lines 4498-4607
- [AWS SAM Deployment Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-deploying.html)
- [Bedrock Agent Testing](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-test.html)

---

## Issue Resolution Log

### 2025-10-25: Step Functions ARN Substitution Fix

**Problem:** All agent Lambda invocations failing with validation errors:

```
ValidationException: Value '${AgentOrchestratorArn}' at 'functionName' failed to satisfy constraint
```

**Root Cause:** Mismatch between `DefinitionSubstitutions` keys in `template.yaml` and placeholder names in `multi-agent-orchestration.asl.json`.

**Solution:** Updated `template.yaml` lines 1074-1081 to use correct substitution keys:

- Changed `BuildAgentFunctionArn` → `BuildAgentOrchestratorArn`
- Changed `CombatAgentFunctionArn` → `CombatAgentOrchestratorArn`
- Changed `VisionAgentFunctionArn` → `VisionAgentOrchestratorArn`
- Changed `EconomyAgentFunctionArn` → `EconomyAgentOrchestratorArn`
- Changed `ChampionAgentFunctionArn` → `ChampionAgentOrchestratorArn`
- Changed `CompetitiveAgentFunctionArn` → `CompetitiveAgentOrchestratorArn`

**Files Changed:**

- `apps/aws/template.yaml` - Fixed DefinitionSubstitutions keys
- `apps/aws/ARN_FIX_SUMMARY.md` - Detailed fix documentation
- `apps/aws/redeploy-fix.ps1` - Deployment script

**Deployment Required:** Yes - Run `sam deploy` to apply the fix.

**Status:** ✅ Fixed - Ready for redeployment
