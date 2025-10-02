# HexCore AI - AI Coding Assistant Implementation Guide

This guide contains all implementation tasks designed for AI coding assistants, organized by development phase. Each task includes complete configuration, code snippets, and subtasks that can be marked as complete.

---

## Phase 1: Project Structure & Configuration

### Task 1.6: Initialize Project Structure

Create the complete project directory structure for the HexCore AI serverless application within the monorepo `apps/` folder.

**Subtasks:**
- [x] Create project directory `apps/aws/`
- [x] Inside `apps/aws/`, create `src/` directory with subdirectories:
  - [x] `src/websocket/` for WebSocket handlers
  - [x] `src/processor/` for match data processing
  - [x] `src/agents/` for specialized analysis agents
  - [x] `src/aggregation/` for results synthesis
  - [x] `src/shared/` for utility functions and types
  - [x] `src/layers/nodejs/` for Lambda layers
- [x] Create `statemachine/` directory for Step Functions definitions under `apps/aws/`
- [x] Create placeholder files in `apps/aws/`:
  - [x] `template.yaml` (SAM template)
  - [x] `samconfig.toml` (SAM configuration)
  - [x] `package.json` (Node.js dependencies)
  - [x] `tsconfig.json` (TypeScript configuration)

**Expected Structure:**
```
apps/
└── aws/
    ├── template.yaml
    ├── samconfig.toml
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── websocket/
    │   ├── processor/
    │   ├── agents/
    │   ├── aggregation/
    │   ├── shared/
    │   └── layers/nodejs/
    └── statemachine/
```

---

### Task 1.7: Configure TypeScript Build Environment

Set up the TypeScript compilation environment with all necessary dependencies.

**Subtasks:**
- [x] Create `package.json` with build scripts and dependencies
- [x] Create `tsconfig.json` with compiler options
- [x] Add AWS SDK dependencies for all required services
- [x] Add development dependencies (TypeScript, types)
- [x] Configure build scripts for SAM deployment

**package.json:**
```json
{
  "name": "hexcore-ai",
  "version": "1.0.0",
  "description": "HexCore AI Serverless Architecture",
  "scripts": {
    "prebuild": "npm run clean",
    "build": "tsc",
    "clean": "rm -rf dist",
    "watch": "tsc --watch",
    "deploy": "npm run build && sam deploy",
    "local": "sam local start-api"
  },
  "dependencies": {
    "@aws-sdk/client-apigatewaymanagementapi": "^3.600.0",
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/client-eventbridge": "^3.600.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/client-secrets-manager": "^3.600.0",
    "@aws-sdk/client-sqs": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.140",
    "@types/node": "^20.14.0",
    "typescript": "^5.5.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Phase 2: Infrastructure as Code (SAM Template)

### Task 2.1: Create Core SAM Template

Initialize the SAM template with global Lambda configuration.

**Subtasks:**
- [x] Create `template.yaml` with AWSTemplateFormatVersion and Transform
- [x] Add Globals section with Function defaults
- [x] Configure Runtime (nodejs20.x), Architecture (arm64)
- [x] Set default Timeout (60s) and MemorySize (1024MB)
- [x] Add Environment Variables section
- [x] Enable X-Ray Tracing globally

**template.yaml (Header):**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: HexCore AI Event-Driven Serverless Architecture

Globals:
  Function:
    Runtime: nodejs20.x
    RuntimeManagementConfig:
      UpdateRuntimeOn: Auto
    Timeout: 60
    MemorySize: 1024
    Architectures:
      - arm64
    Environment:
      Variables:
        RIOT_API_KEY_SECRET: !Ref RiotApiKeySecretArn
        CONNECTIONS_TABLE: !Ref ConnectionsTable
        MATCH_DATA_TABLE: !Ref MatchDataTable
        MATCH_QUEUE_URL: !Ref MatchQueue
        WEBSOCKET_ENDPOINT: !Sub 'https://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/${Stage}'
    Tracing: Active
```

---

### Task 2.2: Define Parameters

Add CloudFormation parameters for deployment configuration.

**Subtasks:**
- [x] Add `Stage` parameter with default value 'test'
- [x] Add `RiotApiKeySecretArn` parameter for Secrets Manager ARN
- [x] Add parameter descriptions

**Parameters Section:**
```yaml
Parameters:
  Stage:
    Type: String
    Default: test
    Description: API Gateway stage name
  RiotApiKeySecretArn:
    Type: String
    Description: ARN of Secrets Manager secret containing Riot API key
```

---

### Task 2.3: Define DynamoDB Tables

Create all DynamoDB table resources with proper configuration.

**Subtasks:**
- [x] Define `ConnectionsTable` resource
  - [x] Set partition key: `connectionId` (String)
  - [x] Add Global Secondary Index: `SessionIndex` on `sessionId`
  - [x] Enable TTL on `ttl` attribute
  - [x] Set billing mode to PAY_PER_REQUEST
  - [x] Enable DynamoDB Streams
- [x] Define `MatchDataTable` resource
  - [x] Set partition key: `dataKey` (String)
  - [x] Enable TTL on `expiresAt` attribute
  - [x] Enable Point-in-Time Recovery
  - [x] Set billing mode to PAY_PER_REQUEST
- [x] Define `AnalysisResultsTable` resource
  - [x] Set partition key: `resultId` (String)
  - [x] Add Global Secondary Index: `PuuidIndex` on `puuid`
  - [x] Enable TTL on `expiresAt` attribute
  - [x] Set billing mode to PAY_PER_REQUEST

**DynamoDB Tables Configuration:**
```yaml
Resources:
  # ==================== DynamoDB Tables ====================
  ConnectionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: HexCore-Connections
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: connectionId
          AttributeType: S
        - AttributeName: sessionId
          AttributeType: S
      KeySchema:
        - AttributeName: connectionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: SessionIndex
          KeySchema:
            - AttributeName: sessionId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES

  MatchDataTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: HexCore-MatchData
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: dataKey
          AttributeType: S
      KeySchema:
        - AttributeName: dataKey
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: expiresAt
        Enabled: true
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true

  AnalysisResultsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: HexCore-AnalysisResults
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: resultId
          AttributeType: S
        - AttributeName: puuid
          AttributeType: S
      KeySchema:
        - AttributeName: resultId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: PuuidIndex
          KeySchema:
            - AttributeName: puuid
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: expiresAt
        Enabled: true
```

---

### Task 2.4: Define SQS Queues

Create SQS queues for match processing with dead letter queue.

**Subtasks:**
- [x] Define `MatchQueue` resource
  - [x] Set QueueName: `HexCore-MatchQueue`
  - [x] Set VisibilityTimeout: 300 seconds
  - [x] Set MessageRetentionPeriod: 4 days (345600 seconds)
  - [x] Enable long polling: ReceiveMessageWaitTimeSeconds: 20
  - [x] Configure RedrivePolicy with DLQ and maxReceiveCount: 5
- [x] Define `MatchDeadLetterQueue` resource
  - [x] Set QueueName: `HexCore-MatchQueue-DLQ`
  - [x] Set MessageRetentionPeriod: 14 days (1209600 seconds)

**SQS Configuration:**
```yaml
  # ==================== SQS Queues ====================
  MatchQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: HexCore-MatchQueue
      VisibilityTimeout: 300
      MessageRetentionPeriod: 345600
      ReceiveMessageWaitTimeSeconds: 20
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt MatchDeadLetterQueue.Arn
        maxReceiveCount: 5

  MatchDeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: HexCore-MatchQueue-DLQ
      MessageRetentionPeriod: 1209600
```

---

### Task 2.5: Define S3 Bucket

Create S3 bucket for storing analysis results with lifecycle policies.

**Subtasks:**
- [x] Define `ResultsBucket` resource
  - [x] Set dynamic bucket name using AWS::AccountId
  - [x] Enable server-side encryption (AES256)
  - [x] Add lifecycle rule to delete objects after 90 days

**S3 Configuration:**
```yaml
  # ==================== S3 Bucket ====================
  ResultsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub hexcore-results-${AWS::AccountId}
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldResults
            Status: Enabled
            ExpirationInDays: 90
```

---

### Task 2.6: Define API Gateway WebSocket

Create WebSocket API with routes and integrations.

**Subtasks:**
- [x] Define `WebSocketApi` resource with WEBSOCKET protocol
- [x] Define `ConnectRoute` ($connect) with Lambda integration
- [x] Define `ConnectIntegration` for WebSocket connection
- [x] Define `DisconnectRoute` ($disconnect) with Lambda integration
- [x] Define `DisconnectIntegration` for WebSocket disconnection
- [x] Create `Deployment` resource with route dependencies
- [x] Create `Stage` resource with throttling settings

**WebSocket Configuration:**
```yaml
  # ==================== API Gateway WebSocket ====================
  WebSocketApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: HexCoreWebSocketApi
      ProtocolType: WEBSOCKET
      RouteSelectionExpression: $request.body.action

  ConnectRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $connect
      AuthorizationType: NONE
      Target: !Sub integrations/${ConnectIntegration}

  ConnectIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WebSocketConnectFunction.Arn}/invocations

  DisconnectRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref WebSocketApi
      RouteKey: $disconnect
      Target: !Sub integrations/${DisconnectIntegration}

  DisconnectIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref WebSocketApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${WebSocketDisconnectFunction.Arn}/invocations

  Deployment:
    Type: AWS::ApiGatewayV2::Deployment
    DependsOn:
      - ConnectRoute
      - DisconnectRoute
    Properties:
      ApiId: !Ref WebSocketApi

  Stage:
    Type: AWS::ApiGatewayV2::Stage
    Properties:
      ApiId: !Ref WebSocketApi
      DeploymentId: !Ref Deployment
      StageName: !Ref Stage
      DefaultRouteSettings:
        ThrottlingBurstLimit: 10000
        ThrottlingRateLimit: 5000
```

---

### Task 2.7: Define Lambda Functions

Create all Lambda function resources with proper IAM policies.

**Subtasks:**
- [x] Define `WebSocketConnectFunction`
  - [x] Set handler: `websocket/connect.handler`
  - [x] Set timeout: 29 seconds
  - [x] Add DynamoDB PutItem policy
  - [x] Add SQS SendMessage policy
  - [x] Add API Gateway ManageConnections policy
  - [x] Add Secrets Manager GetSecretValue policy
  - [x] Add Lambda invoke permission for API Gateway
- [x] Define `WebSocketDisconnectFunction`
  - [x] Set handler: `websocket/disconnect.handler`
  - [x] Set timeout: 10 seconds, memory: 256MB
  - [x] Add DynamoDB DeleteItem policy
  - [x] Add Lambda invoke permission for API Gateway
- [x] Define `MatchProcessorFunction`
  - [x] Set handler: `processor/matchProcessor.handler`
  - [x] Set reserved concurrent executions: 50
  - [x] Add SQS event trigger with batch size 10
  - [x] Enable ReportBatchItemFailures
  - [x] Add DynamoDB read/write policies
  - [x] Add EventBridge PutEvents policy
  - [x] Add API Gateway ManageConnections policy
- [x] Define all 6 agent functions (`BuildAgent`, `CombatAgent`, `VisionAgent`, `EconomyAgent`, `ChampionAgent`, `CompetitiveAgent`)
  - [x] Set handler: `agents/{agentName}.handler`
  - [x] Set memory: 512MB
  - [x] Add DynamoDB read policy
  - [x] Add Bedrock InvokeAgent policy
  - [x] Add API Gateway ManageConnections policy
- [x] Define `SynthesizerFunction`
  - [x] Set handler: `aggregation/synthesizer.handler`
  - [x] Add DynamoDB read/write policies
  - [x] Add S3 PutObject policy
  - [x] Add API Gateway ManageConnections policy

**Lambda Functions Configuration (WebSocket):**
```yaml
  # ==================== Lambda Functions ====================
  WebSocketConnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-WebSocket-Connect
      Handler: websocket/connect.handler
      CodeUri: ./dist
      Timeout: 29
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - SQSSendMessagePolicy:
            QueueName: !GetAtt MatchQueue.QueueName
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref RiotApiKeySecretArn

  WebSocketConnectPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref WebSocketConnectFunction
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*

  WebSocketDisconnectFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-WebSocket-Disconnect
      Handler: websocket/disconnect.handler
      CodeUri: ./dist
      Timeout: 10
      MemorySize: 256
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable

  WebSocketDisconnectPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref WebSocketDisconnectFunction
      Action: lambda:InvokeFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*
```

**Match Processor Configuration:**
```yaml
  MatchProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-Match-Processor
      Handler: processor/matchProcessor.handler
      CodeUri: ./dist
      Timeout: 60
      MemorySize: 1024
      ReservedConcurrentExecutions: 50
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt MatchQueue.Arn
            BatchSize: 10
            MaximumBatchingWindowInSeconds: 5
            FunctionResponseTypes:
              - ReportBatchItemFailures
      Policies:
        - SQSPollerPolicy:
            QueueName: !GetAtt MatchQueue.QueueName
        - DynamoDBCrudPolicy:
            TableName: !Ref MatchDataTable
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - Statement:
            - Effect: Allow
              Action:
                - events:PutEvents
              Resource: !Sub arn:aws:events:${AWS::Region}:${AWS::AccountId}:event-bus/default
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref RiotApiKeySecretArn
```

**Agent Functions Configuration (Example: BuildAgent):**
```yaml
  # ==================== Agent Lambda Functions ====================
  BuildAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-BuildAgent
      Handler: agents/buildAgent.handler
      CodeUri: ./dist
      Timeout: 60
      MemorySize: 512
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref MatchDataTable
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*
            - Effect: Allow
              Action:
                - bedrock:InvokeAgent
              Resource: '*'
```

---

### Task 2.8: Define EventBridge & Step Functions

Create EventBridge rule and Step Functions state machine.

**Subtasks:**
- [x] Define `MatchFilteredReadyRule` EventBridge rule
  - [x] Set event pattern for `hexcore.match.processor` source
  - [x] Set detail-type: `match.filtered.ready`
  - [x] Add Step Functions as target
- [x] Define `EventBridgeStepFunctionsRole` IAM role
  - [x] Add trust relationship for events.amazonaws.com
  - [x] Add policy to start Step Functions executions
- [x] Define `MultiAgentStateMachine` resource
  - [x] Set type: EXPRESS workflow
  - [x] Reference external definition file
  - [x] Add substitutions for Lambda ARNs
  - [x] Add Lambda invoke policies for all agents
  - [x] Enable tracing and logging
- [x] Define `StateMachineLogGroup` for Step Functions logs
  - [x] Set retention: 7 days

**EventBridge & Step Functions Configuration:**
```yaml
  # ==================== EventBridge ====================
  MatchFilteredReadyRule:
    Type: AWS::Events::Rule
    Properties:
      Name: HexCore-MatchFilteredReady
      Description: Triggers Step Functions when match data is ready
      EventPattern:
        source:
          - hexcore.match.processor
        detail-type:
          - match.filtered.ready
      State: ENABLED
      Targets:
        - Arn: !GetAtt MultiAgentStateMachine.Arn
          RoleArn: !GetAtt EventBridgeStepFunctionsRole.Arn
          Id: StepFunctionsTarget

  EventBridgeStepFunctionsRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: events.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: InvokeStepFunctions
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - states:StartExecution
                Resource: !GetAtt MultiAgentStateMachine.Arn

  # ==================== Step Functions ====================
  MultiAgentStateMachine:
    Type: AWS::Serverless::StateMachine
    Properties:
      Name: HexCore-MultiAgent-Orchestration
      Type: EXPRESS
      DefinitionUri: statemachine/multi-agent-orchestration.asl.json
      DefinitionSubstitutions:
        BuildAgentFunctionArn: !GetAtt BuildAgentFunction.Arn
        CombatAgentFunctionArn: !GetAtt CombatAgentFunction.Arn
        VisionAgentFunctionArn: !GetAtt VisionAgentFunction.Arn
        EconomyAgentFunctionArn: !GetAtt EconomyAgentFunction.Arn
        ChampionAgentFunctionArn: !GetAtt ChampionAgentFunction.Arn
        CompetitiveAgentFunctionArn: !GetAtt CompetitiveAgentFunction.Arn
        SynthesizerFunctionArn: !GetAtt SynthesizerFunction.Arn
      Policies:
        - LambdaInvokePolicy:
            FunctionName: !Ref BuildAgentFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref CombatAgentFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref VisionAgentFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref EconomyAgentFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref ChampionAgentFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref CompetitiveAgentFunction
        - LambdaInvokePolicy:
            FunctionName: !Ref SynthesizerFunction
      Tracing:
        Enabled: true
      Logging:
        Level: ALL
        IncludeExecutionData: true
        Destinations:
          - CloudWatchLogsLogGroup:
              LogGroupArn: !GetAtt StateMachineLogGroup.Arn

  StateMachineLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/stepfunctions/HexCore-MultiAgent
      RetentionInDays: 7
```

---

### Task 2.9: Define CloudWatch Alarms

Create CloudWatch alarms for monitoring critical metrics.

**Subtasks:**
- [x] Define `DLQAlarm` for dead letter queue
  - [x] Monitor ApproximateNumberOfMessagesVisible metric
  - [x] Set threshold: >= 1 message
  - [x] Evaluation period: 5 minutes
- [x] Define `QueueAgeAlarm` for message age
  - [x] Monitor ApproximateAgeOfOldestMessage metric
  - [x] Set threshold: > 600 seconds (10 minutes)
  - [x] Evaluation periods: 2

**CloudWatch Alarms Configuration:**
```yaml
  # ==================== CloudWatch Alarms ====================
  DLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: HexCore-DLQ-Messages
      AlarmDescription: Alert when messages arrive in DLQ
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: QueueName
          Value: !GetAtt MatchDeadLetterQueue.QueueName

  QueueAgeAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: HexCore-Queue-Age
      AlarmDescription: Alert when messages are old
      MetricName: ApproximateAgeOfOldestMessage
      Namespace: AWS/SQS
      Statistic: Maximum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 600
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: QueueName
          Value: !GetAtt MatchQueue.QueueName
```

---

### Task 2.10: Define Outputs

Add CloudFormation outputs for easy reference.

**Subtasks:**
- [x] Add `WebSocketURL` output with WebSocket connection URL
- [x] Add `ConnectionsTableName` output
- [x] Add `MatchDataTableName` output
- [x] Add `MatchQueueUrl` output
- [x] Add `ResultsBucketName` output

**Outputs Configuration:**
```yaml
Outputs:
  WebSocketURL:
    Description: WebSocket API URL
    Value: !Sub wss://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/${Stage}
  
  ConnectionsTableName:
    Description: Connections DynamoDB table name
    Value: !Ref ConnectionsTable
  
  MatchDataTableName:
    Description: Match Data DynamoDB table name
    Value: !Ref MatchDataTable
  
  MatchQueueUrl:
    Description: Match Queue URL
    Value: !Ref MatchQueue
  
  ResultsBucketName:
    Description: Results S3 bucket name
    Value: !Ref ResultsBucket
```

---

## Phase 3: Shared Utilities & Type Definitions

### Task 3.1: Create TypeScript Type Definitions

Define all TypeScript interfaces for type safety across the application.

**Subtasks:**
- [ ] Create `src/shared/types.ts` file
- [ ] Define `SQSMatchMessage` interface
- [ ] Define `EventBridgeMatchEvent` interface
- [ ] Define `WebSocketMessage` interface
- [ ] Define `MatchData` interface
- [ ] Define `AgentResult` interface
- [ ] Define supporting data types:
  - [ ] `BuildData` interface
  - [ ] `CombatData` interface
  - [ ] `VisionData` interface
  - [ ] `EconomyData` interface
  - [ ] `ChampionMetaData` interface
  - [ ] `ItemPurchase` interface

**src/shared/types.ts:**
```typescript
export interface SQSMatchMessage {
  matchId: string;
  puuid: string;
  region: string;
  year: number;
  sessionId: string;
}

export interface EventBridgeMatchEvent {
  source: string;
  'detail-type': string;
  detail: {
    keys: string[];
    sessionId: string;
    matchId: string;
    puuid: string;
    region: string;
    year: number;
    schemaVersion: string;
  };
}

export interface WebSocketMessage {
  status: 'started' | 'processing' | 'complete' | 'error';
  message: string;
  progress?: number;
  agent?: string;
  totalMatches?: number;
  processedMatches?: number;
  resultId?: string;
}

export interface MatchData {
  dataKey: string;
  matchId: string;
  puuid: string;
  build?: BuildData;
  combat?: CombatData;
  vision?: VisionData;
  economy?: EconomyData;
  championMeta?: ChampionMetaData;
  expiresAt: number;
}

export interface BuildData {
  items: number[];
  itemTimeline: ItemPurchase[];
  goldPerMinute: number[];
}

export interface ItemPurchase {
  timestamp: number;
  itemId: number;
  cost: number;
}

export interface CombatData {
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: Record<string, number>;
  damageReceived: Record<string, number>;
}

export interface VisionData {
  wardsPlaced: number;
  wardsDestroyed: number;
  visionScore: number;
}

export interface EconomyData {
  totalGold: number;
  csPerMinute: number;
  goldEfficiency: number;
}

export interface ChampionMetaData {
  champion: string;
  role: string;
  tier: string;
  winRate: number;
}

export interface AgentResult {
  agentName: string;
  status: 'success' | 'failed';
  analysis: any;
  timestamp: number;
}
```

---

### Task 3.2: Create WebSocket Utility Module

Implement utility functions for WebSocket communication.

**Subtasks:**
- [ ] Create `src/shared/websocketClient.ts` file
- [ ] Import required AWS SDK clients
- [ ] Initialize DynamoDB DocumentClient
- [ ] Initialize API Gateway Management API client
- [ ] Implement `sendWebSocketUpdate()` function:
  - [ ] Query Connections table GSI by sessionId
  - [ ] Handle case when no connection found
  - [ ] Post message to WebSocket connection
  - [ ] Handle GoneException (410 errors)
  - [ ] Clean up stale connections on 410 error
  - [ ] Add error logging

**src/shared/websocketClient.ts:**
```typescript
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { WebSocketMessage } from './types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const apigwClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});

export async function sendWebSocketUpdate(
  sessionId: string,
  message: WebSocketMessage
): Promise<void> {
  try {
    // Query GSI to get connectionId from sessionId
    const result = await ddb.send(
      new QueryCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        IndexName: 'SessionIndex',
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: {
          ':sessionId': sessionId,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      console.log('No active connection found for sessionId:', sessionId);
      return;
    }

    const connectionId = result.Items[0].connectionId;

    // Send message to connection
    await apigwClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      })
    );

    console.log('WebSocket update sent:', { sessionId, message });
  } catch (error) {
    if (error instanceof GoneException) {
      console.log('Stale connection detected, cleaning up');
      
      // Remove stale connection
      const result = await ddb.send(
        new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: 'SessionIndex',
          KeyConditionExpression: 'sessionId = :sessionId',
          ExpressionAttributeValues: {
            ':sessionId': sessionId,
          },
        })
      );

      if (result.Items && result.Items.length > 0) {
        await ddb.send(
          new DeleteCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: result.Items[0].connectionId },
          })
        );
      }
    } else {
      console.error('Error sending WebSocket update:', error);
      throw error;
    }
  }
}
```

---

### Task 3.3: Create Riot API Client Module

Implement Riot API integration with retry logic.

**Subtasks:**
- [ ] Create `src/shared/riotApi.ts` file
- [ ] Import axios and AWS Secrets Manager client
- [ ] Implement `getRiotApiKey()` function:
  - [ ] Retrieve API key from Secrets Manager
  - [ ] Cache API key for subsequent calls
- [ ] Implement `makeRequestWithRetry()` function:
  - [ ] Add exponential backoff for 429 and 503 errors
  - [ ] Implement retry logic (max 5 retries)
  - [ ] Add jitter to prevent thundering herd
- [ ] Implement `getMatchIds()` function
- [ ] Implement `getMatchData()` function
- [ ] Implement `getMatchTimeline()` function
- [ ] Implement `filterMatchData()` function:
  - [ ] Extract player-specific data from match
  - [ ] Filter to agent-required fields
  - [ ] Structure data by analysis domain
- [ ] Implement helper functions:
  - [ ] `extractItemTimeline()` from timeline events
  - [ ] `extractGoldPerMinute()` from participant frames

**src/shared/riotApi.ts:**
```typescript
import axios, { AxiosError } from 'axios';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});
let cachedApiKey: string | null = null;

async function getRiotApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.RIOT_API_KEY_SECRET,
    })
  );

  cachedApiKey = response.SecretString!;
  return cachedApiKey;
}

async function makeRequestWithRetry<T>(
  url: string,
  maxRetries: number = 5
): Promise<T> {
  const apiKey = await getRiotApiKey();
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await axios.get<T>(url, {
        headers: {
          'X-Riot-Token': apiKey,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 429 || axiosError.response?.status === 503) {
        // Rate limit or service unavailable - exponential backoff
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        console.log(`Rate limited, retrying after ${delay}ms (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

export async function getMatchIds(
  region: string,
  puuid: string,
  startTime: number,
  endTime: number,
  count: number = 100
): Promise<string[]> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTime}&endTime=${endTime}&start=0&count=${count}`;
  return makeRequestWithRetry<string[]>(url);
}

export async function getMatchData(region: string, matchId: string): Promise<any> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  return makeRequestWithRetry(url);
}

export async function getMatchTimeline(region: string, matchId: string): Promise<any> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
  return makeRequestWithRetry(url);
}

export function filterMatchData(matchData: any, timelineData: any, puuid: string): any {
  // Extract player-specific data
  const participant = matchData.info.participants.find(
    (p: any) => p.puuid === puuid
  );

  if (!participant) {
    throw new Error(`Participant not found for PUUID: ${puuid}`);
  }

  // Filter to agent-required fields
  return {
    build: {
      items: [
        participant.item0,
        participant.item1,
        participant.item2,
        participant.item3,
        participant.item4,
        participant.item5,
        participant.item6,
      ].filter(item => item !== 0),
      itemTimeline: extractItemTimeline(timelineData, participant.participantId),
      goldPerMinute: extractGoldPerMinute(timelineData, participant.participantId),
    },
    combat: {
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      damageDealt: {
        physical: participant.physicalDamageDealtToChampions,
        magic: participant.magicDamageDealtToChampions,
        true: participant.trueDamageDealtToChampions,
        total: participant.totalDamageDealtToChampions,
      },
      damageReceived: {
        physical: participant.physicalDamageTaken,
        magic: participant.magicDamageTaken,
        true: participant.trueDamageTaken,
        total: participant.totalDamageTaken,
      },
    },
    vision: {
      wardsPlaced: participant.wardsPlaced,
      wardsDestroyed: participant.wardsKilled,
      visionScore: participant.visionScore,
    },
    economy: {
      totalGold: participant.goldEarned,
      csPerMinute: (participant.totalMinionsKilled + participant.neutralMinionsKilled) / 
                   (matchData.info.gameDuration / 60),
      goldEfficiency: participant.goldSpent / participant.goldEarned,
    },
    championMeta: {
      champion: participant.championName,
      role: participant.teamPosition,
      tier: 'A', // Would fetch from external API or database
      winRate: 0.52, // Would fetch from external API or database
    },
  };
}

function extractItemTimeline(timelineData: any, participantId: number): any[] {
  const itemEvents: any[] = [];
  
  for (const frame of timelineData.info.frames) {
    for (const event of frame.events) {
      if (
        event.type === 'ITEM_PURCHASED' &&
        event.participantId === participantId
      ) {
        itemEvents.push({
          timestamp: event.timestamp,
          itemId: event.itemId,
          cost: event.cost || 0,
        });
      }
    }
  }
  
  return itemEvents;
}

function extractGoldPerMinute(timelineData: any, participantId: number): number[] {
  const goldPerMinute: number[] = [];
  
  for (const frame of timelineData.info.frames) {
    const participantFrame = frame.participantFrames[participantId];
    if (participantFrame) {
      goldPerMinute.push(participantFrame.totalGold);
    }
  }
  
  return goldPerMinute;
}
```

---

## Phase 4: WebSocket Handlers

### Task 4.1: Implement WebSocket Connect Handler

Create the Lambda function that handles WebSocket connection establishment.

**Subtasks:**
- [ ] Create `src/websocket/connect.ts` file
- [ ] Import required AWS SDK clients and types
- [ ] Define handler function with APIGatewayProxyWebsocketHandlerV2 type
- [ ] Extract connection parameters:
  - [ ] Get connectionId from event context
  - [ ] Extract sessionId, puuid, region, year from query parameters
  - [ ] Validate all required parameters present
- [ ] Store connection in DynamoDB:
  - [ ] Calculate 2-hour TTL
  - [ ] Save connectionId, sessionId, puuid, timestamp, TTL
- [ ] Fetch match IDs from Riot API:
  - [ ] Calculate year start/end timestamps
  - [ ] Call getMatchIds() function
- [ ] Enqueue matches to SQS:
  - [ ] Create SQSMatchMessage for each match
  - [ ] Send all messages in parallel
- [ ] Send initial WebSocket update:
  - [ ] Status: 'started'
  - [ ] Include total match count
- [ ] Return 200 status for successful connection
- [ ] Add error handling with 400/500 responses

**src/websocket/connect.ts:**
```typescript
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getMatchIds } from '../shared/riotApi';
import { sendWebSocketUpdate } from '../shared/websocketClient';
import { SQSMatchMessage } from '../shared/types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const sqs = new SQSClient({});

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { sessionId, puuid, region, year } = event.queryStringParameters || {};

  if (!sessionId || !puuid || !region || !year) {
    return { statusCode: 400, body: 'Missing required parameters' };
  }

  try {
    // Store connection in DynamoDB with 2-hour TTL
    const ttl = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    await ddb.send(
      new PutCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: {
          connectionId,
          sessionId,
          puuid,
          connectedAt: Date.now(),
          ttl,
        },
      })
    );

    console.log('Connection stored:', { connectionId, sessionId, puuid });

    // Fetch match IDs from Riot API
    const yearStart = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
    const yearEnd = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
    
    const matchIds = await getMatchIds(region, puuid, yearStart, yearEnd);

    console.log(`Fetched ${matchIds.length} match IDs for ${puuid}`);

    // Enqueue match IDs to SQS
    const queuePromises = matchIds.map((matchId) => {
      const message: SQSMatchMessage = {
        matchId,
        puuid,
        region,
        year: parseInt(year),
        sessionId,
      };

      return sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.MATCH_QUEUE_URL,
          MessageBody: JSON.stringify(message),
        })
      );
    });

    await Promise.all(queuePromises);

    console.log(`Enqueued ${matchIds.length} messages to SQS`);

    // Send initial WebSocket update
    await sendWebSocketUpdate(sessionId, {
      status: 'started',
      message: 'Processing initiated',
      totalMatches: matchIds.length,
      progress: 0,
    });

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Error in connect handler:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
```

---

### Task 4.2: Implement WebSocket Disconnect Handler

Create the Lambda function that handles WebSocket disconnection.

**Subtasks:**
- [ ] Create `src/websocket/disconnect.ts` file
- [ ] Import required AWS SDK clients
- [ ] Define handler function with APIGatewayProxyWebsocketHandlerV2 type
- [ ] Extract connectionId from event context
- [ ] Delete connection record from DynamoDB
- [ ] Add logging for disconnection
- [ ] Return 200 status
- [ ] Add error handling with 500 response

**src/websocket/disconnect.ts:**
```typescript
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await ddb.send(
      new DeleteCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
      })
    );

    console.log('Connection deleted:', connectionId);

    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Error in disconnect handler:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
```

---

## Phase 5: Match Data Processor

### Task 5.1: Implement Match Processor Lambda

Create the Lambda function that processes match data from SQS.

**Subtasks:**
- [ ] Create `src/processor/matchProcessor.ts` file
- [ ] Import required AWS SDK clients and types
- [ ] Define handler function with SQSHandler type
- [ ] Initialize batch failure tracking array
- [ ] Process each SQS record:
  - [ ] Parse message body to SQSMatchMessage
  - [ ] Extract matchId, puuid, region, sessionId
  - [ ] Fetch match data and timeline in parallel
  - [ ] Filter data to agent-required fields
  - [ ] Construct dataKey: `match:{matchId}:puuid:{puuid}`
  - [ ] Calculate 30-day TTL
  - [ ] Write filtered data to DynamoDB
  - [ ] Send WebSocket progress update
  - [ ] Publish EventBridge event
  - [ ] Add to failures array on error
- [ ] Return batchItemFailures for partial failure handling
- [ ] Add comprehensive error logging

**src/processor/matchProcessor.ts:**
```typescript
import { SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { getMatchData, getMatchTimeline, filterMatchData } from '../shared/riotApi';
import { sendWebSocketUpdate } from '../shared/websocketClient';
import { SQSMatchMessage, EventBridgeMatchEvent } from '../shared/types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const eventbridge = new EventBridgeClient({});

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const message: SQSMatchMessage = JSON.parse(record.body);
      const { matchId, puuid, region, sessionId } = message;

      console.log('Processing match:', matchId);

      // Fetch match data and timeline in parallel
      const [matchData, timelineData] = await Promise.all([
        getMatchData(region, matchId),
        getMatchTimeline(region, matchId),
      ]);

      // Filter to agent-required fields
      const filteredData = filterMatchData(matchData, timelineData, puuid);

      // Write to DynamoDB with 30-day TTL
      const dataKey = `match:${matchId}:puuid:${puuid}`;
      const expiresAt = Math.floor(Date.now() / 1000) + 2592000; // 30 days

      await ddb.send(
        new PutCommand({
          TableName: process.env.MATCH_DATA_TABLE,
          Item: {
            dataKey,
            matchId,
            puuid,
            ...filteredData,
            expiresAt,
          },
        })
      );

      console.log('Match data written to DynamoDB:', dataKey);

      // Send progress update via WebSocket
      await sendWebSocketUpdate(sessionId, {
        status: 'processing',
        message: `Data fetching complete for match ${matchId}`,
        progress: 50, // Would calculate actual progress
      });

      // Publish EventBridge event
      const eventDetail: EventBridgeMatchEvent = {
        source: 'hexcore.match.processor',
        'detail-type': 'match.filtered.ready',
        detail: {
          keys: [dataKey],
          sessionId,
          matchId,
          puuid,
          region,
          year: message.year,
          schemaVersion: '1.0',
        },
      };

      await eventbridge.send(
        new PutEventsCommand({
          Entries: [
            {
              Source: eventDetail.source,
              DetailType: eventDetail['detail-type'],
              Detail: JSON.stringify(eventDetail.detail),
            },
          ],
        })
      );

      console.log('EventBridge event published for:', matchId);
    } catch (error) {
      console.error('Failed to process record:', error);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
};
```

---

## Phase 6: Step Functions State Machine

### Task 6.1: Create Step Functions Definition

Define the Step Functions state machine for multi-agent orchestration.

**Subtasks:**
- [ ] Create `statemachine/multi-agent-orchestration.asl.json` file
- [ ] Define ParallelAgentExecution state with 6 branches
- [ ] For each agent branch:
  - [ ] Create Task state with Lambda invoke
  - [ ] Configure payload with keys, sessionId, matchId, puuid
  - [ ] Add Retry policy (3 attempts, exponential backoff)
  - [ ] Add Catch block routing to Failed pass state
  - [ ] Set ResultPath to store agent output
- [ ] Define Synthesizer task state
- [ ] Configure retry and error handling for Synthesizer
- [ ] Use parameter substitution for Lambda ARNs

**statemachine/multi-agent-orchestration.asl.json:**
```json
{
  "Comment": "Multi-agent orchestration for match analysis",
  "StartAt": "ParallelAgentExecution",
  "States": {
    "ParallelAgentExecution": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "BuildAgent",
          "States": {
            "BuildAgent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${BuildAgentFunctionArn}",
                "Payload": {
                  "keys.$": "$.detail.keys",
                  "sessionId.$": "$.detail.sessionId",
                  "matchId.$": "$.detail.matchId",
                  "puuid.$": "$.detail.puuid"
                }
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 2,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Catch": [
                {
                  "ErrorEquals": ["States.ALL"],
                  "ResultPath": "$.error",
                  "Next": "BuildAgentFailed"
                }
              ],
              "ResultPath": "$.buildResult",
              "End": true
            },
            "BuildAgentFailed": {
              "Type": "Pass",
              "Result": {"status": "failed", "agent": "build"},
              "ResultPath": "$.buildResult",
              "End": true
            }
          }
        },
        {
          "StartAt": "CombatAgent",
          "States": {
            "CombatAgent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${CombatAgentFunctionArn}",
                "Payload": {
                  "keys.$": "$.detail.keys",
                  "sessionId.$": "$.detail.sessionId",
                  "matchId.$": "$.detail.matchId",
                  "puuid.$": "$.detail.puuid"
                }
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 2,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Catch": [
                {
                  "ErrorEquals": ["States.ALL"],
                  "ResultPath": "$.error",
                  "Next": "CombatAgentFailed"
                }
              ],
              "ResultPath": "$.combatResult",
              "End": true
            },
            "CombatAgentFailed": {
              "Type": "Pass",
              "Result": {"status": "failed", "agent": "combat"},
              "ResultPath": "$.combatResult",
              "End": true
            }
          }
        },
        {
          "StartAt": "VisionAgent",
          "States": {
            "VisionAgent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${VisionAgentFunctionArn}",
                "Payload": {
                  "keys.$": "$.detail.keys",
                  "sessionId.$": "$.detail.sessionId",
                  "matchId.$": "$.detail.matchId",
                  "puuid.$": "$.detail.puuid"
                }
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 2,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Catch": [
                {
                  "ErrorEquals": ["States.ALL"],
                  "ResultPath": "$.error",
                  "Next": "VisionAgentFailed"
                }
              ],
              "ResultPath": "$.visionResult",
              "End": true
            },
            "VisionAgentFailed": {
              "Type": "Pass",
              "Result": {"status": "failed", "agent": "vision"},
              "ResultPath": "$.visionResult",
              "End": true
            }
          }
        },
        {
          "StartAt": "EconomyAgent",
          "States": {
            "EconomyAgent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${EconomyAgentFunctionArn}",
                "Payload": {
                  "keys.$": "$.detail.keys",
                  "sessionId.$": "$.detail.sessionId",
                  "matchId.$": "$.detail.matchId",
                  "puuid.$": "$.detail.puuid"
                }
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 2,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Catch": [
                {
                  "ErrorEquals": ["States.ALL"],
                  "ResultPath": "$.error",
                  "Next": "EconomyAgentFailed"
                }
              ],
              "ResultPath": "$.economyResult",
              "End": true
            },
            "EconomyAgentFailed": {
              "Type": "Pass",
              "Result": {"status": "failed", "agent": "economy"},
              "ResultPath": "$.economyResult",
              "End": true
            }
          }
        },
        {
          "StartAt": "ChampionAgent",
          "States": {
            "ChampionAgent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${ChampionAgentFunctionArn}",
                "Payload": {
                  "keys.$": "$.detail.keys",
                  "sessionId.$": "$.detail.sessionId",
                  "matchId.$": "$.detail.matchId",
                  "puuid.$": "$.detail.puuid"
                }
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 2,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Catch": [
                {
                  "ErrorEquals": ["States.ALL"],
                  "ResultPath": "$.error",
                  "Next": "ChampionAgentFailed"
                }
              ],
              "ResultPath": "$.championResult",
              "End": true
            },
            "ChampionAgentFailed": {
              "Type": "Pass",
              "Result": {"status": "failed", "agent": "champion"},
              "ResultPath": "$.championResult",
              "End": true
            }
          }
        },
        {
          "StartAt": "CompetitiveAgent",
          "States": {
            "CompetitiveAgent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${CompetitiveAgentFunctionArn}",
                "Payload": {
                  "keys.$": "$.detail.keys",
                  "sessionId.$": "$.detail.sessionId",
                  "matchId.$": "$.detail.matchId",
                  "puuid.$": "$.detail.puuid"
                }
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 2,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Catch": [
                {
                  "ErrorEquals": ["States.ALL"],
                  "ResultPath": "$.error",
                  "Next": "CompetitiveAgentFailed"
                }
              ],
              "ResultPath": "$.competitiveResult",
              "End": true
            },
            "CompetitiveAgentFailed": {
              "Type": "Pass",
              "Result": {"status": "failed", "agent": "competitive"},
              "ResultPath": "$.competitiveResult",
              "End": true
            }
          }
        }
      ],
      "ResultPath": "$.agentResults",
      "Next": "Synthesizer"
    },
    "Synthesizer": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${SynthesizerFunctionArn}",
        "Payload": {
          "agentResults.$": "$.agentResults",
          "sessionId.$": "$.detail.sessionId",
          "matchId.$": "$.detail.matchId",
          "puuid.$": "$.detail.puuid"
        }
      },
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ],
      "ResultPath": "$.synthesisResult",
      "End": true
    }
  }
}
```

---

## Phase 7: Agent Lambda Functions

### Task 7.1: Implement Build Agent

Create the Build Optimization Agent Lambda function.

**Subtasks:**
- [ ] Create `src/agents/buildAgent.ts` file
- [ ] Import required AWS SDK clients and types
- [ ] Define AgentInput interface
- [ ] Define handler function with proper typing
- [ ] Read match data from DynamoDB using provided keys
- [ ] Implement `analyzeBuild()` function:
  - [ ] Calculate build efficiency score
  - [ ] Identify preferred item builds
  - [ ] Analyze item timing and power spikes
  - [ ] Calculate gold efficiency
  - [ ] Generate build recommendations
- [ ] Send WebSocket update on completion
- [ ] Return AgentResult with analysis
- [ ] Add error handling and logging

**src/agents/buildAgent.ts:**
```typescript
import { Handler } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { sendWebSocketUpdate } from '../shared/websocketClient';
import { MatchData, AgentResult } from '../shared/types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

interface AgentInput {
  keys: string[];
  sessionId: string;
  matchId: string;
  puuid: string;
}

export const handler: Handler<AgentInput, AgentResult> = async (event) => {
  const { keys, sessionId, matchId } = event;

  try {
    console.log('BuildAgent analyzing:', matchId);

    // Read match data from DynamoDB
    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.MATCH_DATA_TABLE,
        Key: { dataKey: keys[0] },
      })
    );

    if (!result.Item) {
      throw new Error(`Match data not found: ${keys[0]}`);
    }

    const matchData = result.Item as MatchData;

    // Perform build analysis
    const analysis = analyzeBuild(matchData);

    // Send WebSocket update
    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Build analysis complete',
      agent: 'BuildOptimization',
      progress: 60,
    });

    console.log('BuildAgent completed:', matchId);

    return {
      agentName: 'BuildAgent',
      status: 'success',
      analysis,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('BuildAgent error:', error);
    throw error;
  }
};

function analyzeBuild(matchData: MatchData): any {
  // Implement build analysis logic
  const buildData = matchData.build;

  if (!buildData) {
    return { error: 'No build data available' };
  }

  return {
    build_efficiency_score: 85.2,
    preferred_items: buildData.items,
    item_timing: buildData.itemTimeline.map((item) => ({
      itemId: item.itemId,
      minute: Math.floor(item.timestamp / 60000),
    })),
    gold_efficiency: calculateGoldEfficiency(buildData),
    recommendations: generateBuildRecommendations(buildData),
  };
}

function calculateGoldEfficiency(buildData: any): number {
  // Calculate gold efficiency from item purchases
  const totalGold = buildData.goldPerMinute[buildData.goldPerMinute.length - 1];
  const itemCosts = buildData.itemTimeline.reduce(
    (sum: number, item: any) => sum + item.cost,
    0
  );
  
  return (itemCosts / totalGold) * 100;
}

function generateBuildRecommendations(buildData: any): string[] {
  // Generate personalized recommendations
  return [
    'Consider rushing defensive items earlier against burst damage',
    'Optimize power spike timing by adjusting item order',
  ];
}
```

---

### Task 7.2: Implement Combat Agent

Create the Combat Analysis Agent Lambda function.

**Subtasks:**
- [ ] Create `src/agents/combatAgent.ts` file
- [ ] Use similar structure to Build Agent
- [ ] Implement `analyzeCombat()` function:
  - [ ] Calculate KDA ratio
  - [ ] Analyze damage patterns (dealt/received)
  - [ ] Evaluate combat participation
  - [ ] Identify teamfight performance
- [ ] Send WebSocket update on completion
- [ ] Return structured analysis result

**src/agents/combatAgent.ts:**
```typescript
import { Handler } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { sendWebSocketUpdate } from '../shared/websocketClient';
import { MatchData, AgentResult } from '../shared/types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

interface AgentInput {
  keys: string[];
  sessionId: string;
  matchId: string;
  puuid: string;
}

export const handler: Handler<AgentInput, AgentResult> = async (event) => {
  const { keys, sessionId, matchId } = event;

  try {
    console.log('CombatAgent analyzing:', matchId);

    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.MATCH_DATA_TABLE,
        Key: { dataKey: keys[0] },
      })
    );

    if (!result.Item) {
      throw new Error(`Match data not found: ${keys[0]}`);
    }

    const matchData = result.Item as MatchData;
    const analysis = analyzeCombat(matchData);

    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Combat analysis complete',
      agent: 'CombatAnalysis',
      progress: 65,
    });

    console.log('CombatAgent completed:', matchId);

    return {
      agentName: 'CombatAgent',
      status: 'success',
      analysis,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('CombatAgent error:', error);
    throw error;
  }
};

function analyzeCombat(matchData: MatchData): any {
  const combatData = matchData.combat;

  if (!combatData) {
    return { error: 'No combat data available' };
  }

  const kda = (combatData.kills + combatData.assists) / Math.max(combatData.deaths, 1);

  return {
    kda_ratio: kda.toFixed(2),
    kills: combatData.kills,
    deaths: combatData.deaths,
    assists: combatData.assists,
    damage_profile: {
      total_dealt: combatData.damageDealt.total,
      total_received: combatData.damageReceived.total,
      damage_ratio: (combatData.damageDealt.total / combatData.damageReceived.total).toFixed(2),
    },
    recommendations: generateCombatRecommendations(combatData, kda),
  };
}

function generateCombatRecommendations(combatData: any, kda: number): string[] {
  const recommendations: string[] = [];

  if (kda < 2.0) {
    recommendations.push('Focus on reducing deaths through better positioning');
  }

  if (combatData.damageReceived.total > combatData.damageDealt.total * 1.5) {
    recommendations.push('Consider building more defensive items early');
  }

  return recommendations;
}
```

---

### Task 7.3: Implement Vision Agent

Create the Vision Control Agent Lambda function.

**Subtasks:**
- [ ] Create `src/agents/visionAgent.ts` file
- [ ] Follow agent template structure
- [ ] Implement `analyzeVision()` function:
  - [ ] Calculate vision score efficiency
  - [ ] Analyze ward placement patterns
  - [ ] Evaluate vision denial effectiveness
- [ ] Send WebSocket update
- [ ] Return analysis result

**src/agents/visionAgent.ts (Template):**
```typescript
import { Handler } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { sendWebSocketUpdate } from '../shared/websocketClient';
import { MatchData, AgentResult } from '../shared/types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

interface AgentInput {
  keys: string[];
  sessionId: string;
  matchId: string;
  puuid: string;
}

export const handler: Handler<AgentInput, AgentResult> = async (event) => {
  const { keys, sessionId, matchId } = event;

  try {
    console.log('VisionAgent analyzing:', matchId);

    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.MATCH_DATA_TABLE,
        Key: { dataKey: keys[0] },
      })
    );

    if (!result.Item) {
      throw new Error(`Match data not found: ${keys[0]}`);
    }

    const matchData = result.Item as MatchData;
    const analysis = analyzeVision(matchData);

    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Vision analysis complete',
      agent: 'VisionControl',
      progress: 70,
    });

    return {
      agentName: 'VisionAgent',
      status: 'success',
      analysis,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('VisionAgent error:', error);
    throw error;
  }
};

function analyzeVision(matchData: MatchData): any {
  const visionData = matchData.vision;

  if (!visionData) {
    return { error: 'No vision data available' };
  }

  return {
    vision_score: visionData.visionScore,
    wards_placed: visionData.wardsPlaced,
    wards_destroyed: visionData.wardsDestroyed,
    vision_efficiency: (visionData.visionScore / visionData.wardsPlaced).toFixed(2),
    recommendations: ['Increase ward placement frequency', 'Focus on denying enemy vision'],
  };
}
```

---

### Task 7.4: Implement Economy Agent

Create the Economy Management Agent Lambda function.

**Subtasks:**
- [ ] Create `src/agents/economyAgent.ts` file
- [ ] Follow agent template structure
- [ ] Implement `analyzeEconomy()` function:
  - [ ] Calculate gold per minute
  - [ ] Analyze CS patterns
  - [ ] Evaluate resource optimization
- [ ] Send WebSocket update
- [ ] Return analysis result

---

### Task 7.5: Implement Champion Agent

Create the Champion Meta Agent Lambda function.

**Subtasks:**
- [ ] Create `src/agents/championAgent.ts` file
- [ ] Follow agent template structure
- [ ] Implement `analyzeChampion()` function:
  - [ ] Extract champion metadata
  - [ ] Compare against meta benchmarks
  - [ ] Evaluate champion-specific performance
- [ ] Send WebSocket update
- [ ] Return analysis result

---

### Task 7.6: Implement Competitive Agent

Create the Competitive Insight Agent Lambda function.

**Subtasks:**
- [ ] Create `src/agents/competitiveAgent.ts` file
- [ ] Follow agent template structure
- [ ] Implement `analyzeCompetitive()` function:
  - [ ] Analyze rank-appropriate strategies
  - [ ] Identify improvement areas
  - [ ] Generate competitive recommendations
- [ ] Send WebSocket update
- [ ] Return analysis result

---

## Phase 8: Results Aggregation & Synthesis

### Task 8.1: Implement Synthesizer Lambda

Create the Lambda function that aggregates and synthesizes all agent results.

**Subtasks:**
- [ ] Create `src/aggregation/synthesizer.ts` file
- [ ] Import required AWS SDK clients
- [ ] Define SynthesizerInput interface
- [ ] Define handler function
- [ ] Send "Synthesizing results" WebSocket update
- [ ] Flatten agent results array from parallel execution
- [ ] Implement `generateSummary()` function:
  - [ ] Calculate overall performance score
  - [ ] Identify key strengths
  - [ ] Identify improvement areas
- [ ] Create synthesis object with all agent data
- [ ] Write complete results to S3:
  - [ ] Key format: `results/{puuid}/{matchId}.json`
  - [ ] Content-Type: application/json
- [ ] Write summary to DynamoDB:
  - [ ] Generate unique resultId
  - [ ] Store S3 key reference
  - [ ] Add 90-day TTL
- [ ] Send completion WebSocket update with resultId
- [ ] Return resultId and S3 key
- [ ] Add comprehensive error handling

**src/aggregation/synthesizer.ts:**
```typescript
import { Handler } from 'aws-lambda';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sendWebSocketUpdate } from '../shared/websocketClient';
import { AgentResult } from '../shared/types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({});

interface SynthesizerInput {
  agentResults: AgentResult[][];
  sessionId: string;
  matchId: string;
  puuid: string;
}

export const handler: Handler<SynthesizerInput, any> = async (event) => {
  const { agentResults, sessionId, matchId, puuid } = event;

  try {
    console.log('Synthesizer aggregating results for:', matchId);

    // Send update
    await sendWebSocketUpdate(sessionId, {
      status: 'processing',
      message: 'Synthesizing results',
      progress: 90,
    });

    // Flatten agent results
    const flatResults = agentResults.flat().map((result: any) => result.Payload);

    // Synthesize results
    const synthesis = {
      matchId,
      puuid,
      timestamp: Date.now(),
      agents: flatResults,
      summary: generateSummary(flatResults),
    };

    // Write to S3
    const s3Key = `results/${puuid}/${matchId}.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.RESULTS_BUCKET,
        Key: s3Key,
        Body: JSON.stringify(synthesis, null, 2),
        ContentType: 'application/json',
      })
    );

    // Write to DynamoDB
    const resultId = `${puuid}-${matchId}-${Date.now()}`;
    await ddb.send(
      new PutCommand({
        TableName: process.env.ANALYSIS_RESULTS_TABLE,
        Item: {
          resultId,
          puuid,
          matchId,
          s3Key,
          summary: synthesis.summary,
          createdAt: Date.now(),
          expiresAt: Math.floor(Date.now() / 1000) + 7776000, // 90 days
        },
      })
    );

    // Send completion update
    await sendWebSocketUpdate(sessionId, {
      status: 'complete',
      message: 'Analysis complete',
      resultId,
      progress: 100,
    });

    console.log('Synthesizer completed:', resultId);

    return { resultId, s3Key };
  } catch (error) {
    console.error('Synthesizer error:', error);
    throw error;
  }
};

function generateSummary(agentResults: any[]): any {
  return {
    overallScore: calculateOverallScore(agentResults),
    strengths: identifyStrengths(agentResults),
    improvements: identifyImprovements(agentResults),
  };
}

function calculateOverallScore(agentResults: any[]): number {
  // Calculate weighted average of agent scores
  return 75.5;
}

function identifyStrengths(agentResults: any[]): string[] {
  return ['Vision control', 'Economic efficiency'];
}

function identifyImprovements(agentResults: any[]): string[] {
  return ['Combat positioning', 'Build adaptation'];
}
```

---

## Phase 11: Observability & Monitoring

### Task 11.5: Add Structured Logging

Update all Lambda functions to include structured logging.

**Subtasks:**
- [ ] Update WebSocket handlers:
  - [ ] Add sessionId correlation ID to logs
  - [ ] Use structured JSON format
  - [ ] Include context (puuid, region, year)
- [ ] Update Match Processor:
  - [ ] Add matchId and sessionId to all logs
  - [ ] Log processing stages
  - [ ] Use consistent log levels
- [ ] Update all Agent functions:
  - [ ] Add agent name and matchId to logs
  - [ ] Log analysis stages
  - [ ] Include error context
- [ ] Update Synthesizer:
  - [ ] Add resultId to completion logs
  - [ ] Log synthesis stages

**Structured Logging Pattern:**
```typescript
// Example logging pattern for agents
console.log(JSON.stringify({
  level: 'INFO',
  correlationId: sessionId,
  matchId: matchId,
  agent: 'BuildAgent',
  stage: 'analysis_complete',
  timestamp: Date.now(),
  message: 'Build analysis completed successfully'
}));
```

---

## Phase 12: Optimization & Refinement

### Task 12.5: Implement Advanced Agent Logic

Enhance agent analysis with AI-powered insights.

**Subtasks:**
- [ ] Research AWS Bedrock integration patterns
- [ ] Update agent functions to call Bedrock:
  - [ ] Add Bedrock client initialization
  - [ ] Create prompts for each agent domain
  - [ ] Parse and structure Bedrock responses
- [ ] Implement champion meta data fetching:
  - [ ] Research external API options (Data Dragon, community APIs)
  - [ ] Add caching layer for meta data
  - [ ] Update ChampionAgent with real tier/winrate data
- [ ] Enhance recommendation algorithms:
  - [ ] Build pattern recognition for Build Agent
  - [ ] Combat style classification for Combat Agent
  - [ ] Vision heatmap analysis for Vision Agent

---

### Task 12.6: Add Client WebSocket Reconnection Logic

Implement client-side connection resilience (for frontend team reference).

**Subtasks:**
- [ ] Create WebSocket client utility documentation
- [ ] Document reconnection strategy:
  - [ ] Exponential backoff algorithm
  - [ ] Maximum retry attempts
  - [ ] Connection state management
- [ ] Document message handling:
  - [ ] Progress tracking
  - [ ] Error handling
  - [ ] Result retrieval
- [ ] Provide code examples for Next.js integration

---

### Task 12.7: Implement Result Caching

Add caching layer for frequently accessed results.

**Subtasks:**
- [ ] Document client-side caching strategy
- [ ] Implement S3 ETag-based conditional reads:
  - [ ] Update S3 PutObject to include metadata
  - [ ] Document GetObject with If-None-Match headers
- [ ] Add result expiration handling:
  - [ ] Document TTL-based cache invalidation
  - [ ] Implement cache miss handling

---

## Deployment Verification Checklist

### Pre-Deployment
- [ ] All TypeScript files compile without errors (`npm run build`)
- [ ] SAM template validates successfully (`sam validate`)
- [ ] All environment variables are properly configured
- [ ] Riot API key is stored in Secrets Manager
- [ ] S3 deployment bucket exists

### Post-Deployment
- [ ] All Lambda functions deployed successfully
- [ ] DynamoDB tables created with correct schema
- [ ] SQS queues configured with DLQ
- [ ] EventBridge rule is enabled
- [ ] Step Functions state machine is active
- [ ] CloudWatch alarms are configured
- [ ] WebSocket API is accessible
- [ ] All outputs are displayed in CloudFormation

---

## Summary

This implementation guide provides a complete, task-by-task breakdown of the HexCore AI serverless architecture specifically designed for AI coding assistants. Each task includes:

- ✅ Checkbox format for tracking completion
- 📝 Complete code snippets and configuration
- 🎯 Clear subtasks and acceptance criteria
- 🔗 References to architecture documentation

The guide follows the recommended implementation order and can be used incrementally, allowing development teams to track progress systematically through each phase of the project.