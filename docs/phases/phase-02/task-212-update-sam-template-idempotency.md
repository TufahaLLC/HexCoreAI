# Task 2.12: Update SAM Template for Idempotency Support ✅

Update the AWS SAM template to add the Idempotency DynamoDB table and configure all Lambda functions with the required environment variables and IAM permissions.

## Overview

This task implements the infrastructure changes required to support AWS Lambda Powertools Idempotency utility across all Lambda functions. The idempotency table stores request hashes to prevent duplicate processing on retries.

## Subtasks

### 2.12.1: Create Idempotency DynamoDB Table

- [x] Add `IdempotencyTable` resource to `template.yaml`
- [x] Configure table properties:
  - [x] TableName: `HexCore-Idempotency`
  - [x] BillingMode: `PAY_PER_REQUEST`
  - [x] AttributeDefinitions: `id` (String)
  - [x] KeySchema: `id` as HASH key
  - [x] TimeToLiveSpecification: `expiration` attribute enabled
- [x] Add table to Outputs section for reference

### 2.12.2: Update Global Environment Variables

- [x] Add `IDEMPOTENCY_TABLE` to `Globals.Function.Environment.Variables`
- [x] Reference IdempotencyTable using `!Ref IdempotencyTable`
- [x] Verify `POWERTOOLS_SERVICE_NAME` is set
- [x] Verify `LOG_LEVEL` is configured

### 2.12.3: Add IAM Permissions for WebSocket Functions

- [x] Update `WebSocketConnectFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
  - [x] Verify IDEMPOTENCY_TABLE environment variable
- [x] Update `WebSocketDisconnectFunction` (if using idempotency):
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable

### 2.12.4: Add IAM Permissions for Match Processor

- [x] Update `MatchProcessorFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
  - [x] Verify IDEMPOTENCY_TABLE environment variable
  - [x] Ensure existing permissions remain (MatchDataTable, EventBridge, SQS)

### 2.12.5: Add IAM Permissions for Agent Orchestrators

- [x] Update `BuildAgentFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
  - [x] Verify IDEMPOTENCY_TABLE environment variable
- [x] Update `CombatAgentFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
- [x] Update `VisionAgentFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
- [x] Update `EconomyAgentFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
- [x] Update `ChampionAgentFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
- [x] Update `CompetitiveAgentFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable

### 2.12.6: Add IAM Permissions for Synthesizer

- [x] Update `SynthesizerFunction`:
  - [x] Add DynamoDBCrudPolicy for IdempotencyTable
  - [x] Verify IDEMPOTENCY_TABLE environment variable
  - [x] Ensure existing permissions remain (S3, DynamoDB results table)

### 2.12.7: Add IAM Permissions for Action Group Tools (Optional)

- [x] Evaluate if action group tools need idempotency
- [x] If needed, add DynamoDBCrudPolicy to action group Lambda functions
- [x] Note: Action groups are typically idempotent by nature (data retrieval)

## Implementation

### Idempotency Table Resource

Add to `template.yaml` in the `Resources` section:

```yaml
Resources:
  # ============================================================================
  # Idempotency Table
  # ============================================================================
  
  IdempotencyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: HexCore-Idempotency
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: expiration
        Enabled: true
      Tags:
        - Key: Project
          Value: HexCoreAI
        - Key: Purpose
          Value: Lambda Idempotency
```

### Global Environment Variables

Update the `Globals` section:

```yaml
Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    Architectures:
      - arm64
    Environment:
      Variables:
        IDEMPOTENCY_TABLE: !Ref IdempotencyTable
        POWERTOOLS_SERVICE_NAME: hexcore-ai
        LOG_LEVEL: INFO
        NODE_OPTIONS: --enable-source-maps
```

### Example Lambda Function with Idempotency

Update each Lambda function that uses idempotency:

```yaml
  MatchProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: apps/aws/
      Handler: src/processor/match-processor.handler
      Description: Processes match data from SQS with idempotency
      Environment:
        Variables:
          MATCH_DATA_TABLE: !Ref MatchDataTable
          MATCH_QUEUE_URL: !Ref MatchQueue
          IDEMPOTENCY_TABLE: !Ref IdempotencyTable
      Policies:
        # Existing permissions
        - DynamoDBCrudPolicy:
            TableName: !Ref MatchDataTable
        - SQSPollerPolicy:
            QueueName: !GetAtt MatchQueue.QueueName
        - Statement:
            - Effect: Allow
              Action:
                - events:PutEvents
              Resource: !Sub 'arn:aws:events:${AWS::Region}:${AWS::AccountId}:event-bus/default'
        # NEW: Idempotency table access
        - DynamoDBCrudPolicy:
            TableName: !Ref IdempotencyTable
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt MatchQueue.Arn
            BatchSize: 10
            MaximumBatchingWindowInSeconds: 5
            FunctionResponseTypes:
              - ReportBatchItemFailures
```

### Agent Orchestrator Example

```yaml
  BuildAgentOrchestratorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: apps/aws/
      Handler: src/agents/orchestrators/build-agent.handler
      Description: Orchestrates Build Agent with idempotency
      Timeout: 120
      Environment:
        Variables:
          BEDROCK_AGENT_ID: !Ref BuildAnalysisAgent
          BEDROCK_AGENT_ALIAS_ID: !GetAtt BuildAnalysisAgentAlias.AgentAliasId
          IDEMPOTENCY_TABLE: !Ref IdempotencyTable
          ENABLE_BEDROCK_TRACES: true
      Policies:
        # Existing Bedrock permissions
        - Statement:
            - Effect: Allow
              Action:
                - bedrock:InvokeAgent
              Resource: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/*'
        # WebSocket permissions
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*'
        # NEW: Idempotency table access
        - DynamoDBCrudPolicy:
            TableName: !Ref IdempotencyTable
```

### Synthesizer Example

```yaml
  SynthesizerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: apps/aws/
      Handler: src/aggregation/synthesizer.handler
      Description: Synthesizes agent results with idempotency
      Environment:
        Variables:
          RESULTS_BUCKET: !Ref ResultsBucket
          ANALYSIS_RESULTS_TABLE: !Ref AnalysisResultsTable
          IDEMPOTENCY_TABLE: !Ref IdempotencyTable
      Policies:
        # Existing permissions
        - S3CrudPolicy:
            BucketName: !Ref ResultsBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref AnalysisResultsTable
        # WebSocket permissions
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*'
        # NEW: Idempotency table access
        - DynamoDBCrudPolicy:
            TableName: !Ref IdempotencyTable
```

### Outputs Section

Add to the `Outputs` section for reference:

```yaml
Outputs:
  IdempotencyTableName:
    Description: DynamoDB table for Lambda idempotency
    Value: !Ref IdempotencyTable
    Export:
      Name: !Sub '${AWS::StackName}-IdempotencyTable'

  IdempotencyTableArn:
    Description: ARN of the idempotency table
    Value: !GetAtt IdempotencyTable.Arn
    Export:
      Name: !Sub '${AWS::StackName}-IdempotencyTableArn'
```

## IAM Permissions Summary

Each Lambda function using idempotency needs:

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref IdempotencyTable
```

This grants the following actions:
- `dynamodb:GetItem` - Check for existing idempotency records
- `dynamodb:PutItem` - Store new idempotency records
- `dynamodb:UpdateItem` - Update idempotency records
- `dynamodb:DeleteItem` - Clean up expired records (handled by TTL)

## Validation

### Pre-Deployment Checks

- [ ] `template.yaml` validates with `sam validate`
- [ ] All Lambda functions have IDEMPOTENCY_TABLE environment variable
- [ ] All Lambda functions have DynamoDBCrudPolicy for IdempotencyTable
- [ ] IdempotencyTable has TTL enabled on `expiration` attribute
- [ ] No duplicate policy statements

### Post-Deployment Checks

- [ ] IdempotencyTable created successfully
- [ ] Table has PAY_PER_REQUEST billing mode
- [ ] TTL is enabled on the table
- [ ] Lambda functions can write to IdempotencyTable
- [ ] CloudWatch Logs show no permission errors
- [ ] Test idempotency by triggering duplicate requests

### Testing Idempotency

```bash
# Deploy the stack
sam build && sam deploy

# Test WebSocket connect idempotency
# Connect twice with same parameters - should return cached match IDs

# Test Match Processor idempotency
# Send duplicate SQS message - should return cached result

# Test Agent Orchestrator idempotency
# Retry Step Functions execution - should return cached analysis

# Verify in DynamoDB Console
aws dynamodb scan \
  --table-name HexCore-Idempotency \
  --max-items 10
```

## Cost Considerations

### Idempotency Table Costs

- **Storage**: ~1KB per idempotency record
- **Reads**: 1 read per Lambda invocation (check for existing record)
- **Writes**: 1 write per unique invocation (store new record)
- **TTL**: Free automatic deletion of expired records

### Example Cost Calculation

For 1 million Lambda invocations per month:
- **Storage**: 1M records × 1KB = 1GB = $0.25/month
- **Reads**: 1M reads = $0.25/month (PAY_PER_REQUEST)
- **Writes**: 1M writes = $1.25/month (PAY_PER_REQUEST)
- **Total**: ~$1.75/month

**Savings from preventing duplicates**: Significantly higher than cost
- Prevents duplicate Bedrock invocations (~$0.003-0.015 per 1K tokens)
- Prevents duplicate Riot API calls
- Prevents duplicate S3 writes

## Rollback Plan

If issues occur after deployment:

1. **Disable idempotency in code**: Set environment variable check
2. **Remove table access**: Comment out DynamoDBCrudPolicy
3. **Redeploy**: `sam build && sam deploy`
4. **Delete table**: Only after confirming Lambda functions work without it

## References

- [Powertools Implementation Guide](./powertools-implementation-guide.md)
- [AWS SAM Template Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification.html)
- [DynamoDB Table Properties](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html)
- [Powertools Idempotency](https://docs.powertools.aws.dev/lambda/typescript/latest/utilities/idempotency/)
