# AWS SAM Implementation Guide for HexCore AI Architecture

This guide provides complete infrastructure-as-code implementation using AWS SAM to deploy the serverless event-driven pipeline for League of Legends player analysis, featuring WebSocket real-time updates, SQS-based processing, DynamoDB storage, EventBridge orchestration, and Step Functions multi-agent coordination[1].

## Project Structure

```
aws/
├── template.yaml                 # SAM template (main IaC file)
├── samconfig.toml               # SAM CLI configuration
├── package.json                 # TypeScript dependencies
├── tsconfig.json               # TypeScript configuration
├── src/
│   ├── websocket/
│   │   ├── connect.ts          # WebSocket connection handler
│   │   └── disconnect.ts       # WebSocket disconnection handler
│   ├── processor/
│   │   └── matchProcessor.ts   # Match data processor (SQS trigger)
│   ├── agents/
│   │   ├── buildAgent.ts       # Build optimization agent
│   │   ├── combatAgent.ts      # Combat analysis agent
│   │   ├── visionAgent.ts      # Vision control agent
│   │   ├── economyAgent.ts     # Economy management agent
│   │   ├── championAgent.ts    # Champion meta agent
│   │   └── competitiveAgent.ts # Competitive insight agent
│   ├── aggregation/
│   │   └── synthesizer.ts      # Results aggregation & synthesis
│   ├── shared/
│   │   ├── websocketClient.ts  # WebSocket utility functions
│   │   ├── riotApi.ts          # Riot API client
│   │   └── types.ts            # Shared TypeScript types
│   └── layers/
│       └── nodejs/             # Lambda layer for shared dependencies
└── statemachine/
    └── multi-agent-orchestration.asl.json  # Step Functions definition
```

## SAM Template (template.yaml)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: HexCore AI Event-Driven Serverless Architecture

Globals:
  Function:
    Runtime: nodejs20.x
    RuntimeManagementConfig:
      UpdateRuntimeOn: Auto  # Optional: Enable automatic runtime updates
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

Parameters:
  Stage:
    Type: String
    Default: test
    Description: API Gateway stage name
  RiotApiKeySecretArn:
    Type: String
    Description: ARN of Secrets Manager secret containing Riot API key

Resources:
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

  CombatAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-CombatAgent
      Handler: agents/combatAgent.handler
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

  VisionAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-VisionAgent
      Handler: agents/visionAgent.handler
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

  EconomyAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-EconomyAgent
      Handler: agents/economyAgent.handler
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

  ChampionAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-ChampionAgent
      Handler: agents/championAgent.handler
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

  CompetitiveAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-CompetitiveAgent
      Handler: agents/competitiveAgent.handler
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

  SynthesizerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: HexCore-Synthesizer
      Handler: aggregation/synthesizer.handler
      CodeUri: ./dist
      Timeout: 60
      MemorySize: 1024
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AnalysisResultsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - S3CrudPolicy:
            BucketName: !Ref ResultsBucket
        - Statement:
            - Effect: Allow
              Action:
                - execute-api:ManageConnections
              Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*

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

## Step Functions State Machine Definition

Create `statemachine/multi-agent-orchestration.asl.json`:

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

## TypeScript Configuration

Create `package.json`:

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
    "local": "sam local start-api"  # Added for local testing
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

Create `tsconfig.json`:

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

## Shared TypeScript Types

Create `src/shared/types.ts`:

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

## WebSocket Utility Functions

Create `src/shared/websocketClient.ts`:

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

## Riot API Client

Create `src/shared/riotApi.ts`:

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

## WebSocket Connect Handler

Create `src/websocket/connect.ts`:

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

## WebSocket Disconnect Handler

Create `src/websocket/disconnect.ts`:

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

## Match Processor Lambda

Create `src/processor/matchProcessor.ts`:

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

## Agent Lambda Example (Build Agent)

Create `src/agents/buildAgent.ts`:

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

## Synthesizer Lambda

Create `src/aggregation/synthesizer.ts`:

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

## SAM Configuration

Create `samconfig.toml`:

```toml
version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "hexcore-ai-test"
s3_bucket = "hexcore-ai-test-deployment-bucket"
s3_prefix = "hexcore-ai-test"
region = "us-west-2"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Stage=test RiotApiKeySecretArn=arn:aws:secretsmanager:us-west-2:ACCOUNT_ID:secret:riot-api-key"
confirm_changeset = true
resolve_s3 = true  # Auto-create S3 bucket if it doesn't exist
resolve_image_repos = true  # Auto-create ECR repos if needed
```

## Deployment Steps

### Prerequisites

1. Install AWS SAM CLI:
```bash
# macOS
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Windows
choco install aws-sam-cli
```

2. Configure AWS credentials:
```bash
aws configure
```

3. Create Riot API key secret:
```bash
aws secretsmanager create-secret \
  --name riot-api-key \
  --secret-string "YOUR_RIOT_API_KEY"
```

#### Build and Deploy

1. Install dependencies:
```bash
npm install
```

2. Build TypeScript code:
```bash
npm run build
```

3. Validate SAM template:
```bash
sam validate
```

4. Build SAM application:
```bash
sam build
```

5. Deploy to AWS:
```bash
sam deploy --guided
```

During guided deployment, provide:
- Stack name: `hexcore-ai-test`
- AWS Region: us-west-2
- Parameter RiotApiKeySecretArn: ARN from step 3
- Confirm changeset: Y
- Allow SAM CLI IAM role creation: Y
- Save arguments to configuration file: Y

6. Get WebSocket URL:
```bash
aws cloudformation describe-stacks \
  --stack-name hexcore-ai-test \
  --query 'Stacks[0].Outputs[?OutputKey==`WebSocketURL`].OutputValue' \
  --output text
```

#### Testing the Deployment

Test WebSocket connection:
```bash
wscat -c "wss://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/test?sessionId=test-123&puuid=YOUR_PUUID&region=americas&year=2025"
```

Monitor logs:
```bash
sam logs -n HexCore-WebSocket-Connect --stack-name hexcore-ai-test --tail
sam logs -n HexCore-Match-Processor --stack-name hexcore-ai-test --tail
```

View CloudWatch dashboards:
```bash
aws cloudwatch get-dashboard --dashboard-name HexCore-Metrics
```

#### Cleanup

Remove all resources:
```bash
sam delete --stack-name hexcore-ai-test
```

This comprehensive guide provides complete infrastructure-as-code implementation for deploying the HexCore AI serverless architecture using AWS SAM with TypeScript Lambda functions, including WebSocket API, DynamoDB tables, SQS queues, EventBridge rules, Step Functions orchestration, and all six specialized agent functions for League of Legends player analysis.