# Task 2.7: Define Lambda Functions

Define core Lambda functions for WebSocket connections and match processing. Agent orchestrator functions are defined in Phase 7, and the Synthesizer function is defined in Phase 8.

**Status**: ✅ Complete

**Subtasks:**
- [x] Define `WebSocketConnectFunction`
  - [x] Set handler: `websocket/connect.handler`
  - [x] Set timeout: 29 seconds
  - [x] Add DynamoDB PutItem policy
  - [x] Add SQS SendMessage policy
  - [x] Add API Gateway ManageConnections policy
  - [x] Add Secrets Manager GetSecretValue policy
  - [x] Add Lambda invoke permission for API Gateway
  - [x] Add Idempotency table access (Powertools)
- [x] Define `WebSocketDisconnectFunction`
  - [x] Set handler: `websocket/disconnect.handler`
  - [x] Set timeout: 10 seconds, memory: 256MB
  - [x] Add DynamoDB DeleteItem policy
  - [x] Add Lambda invoke permission for API Gateway
- [x] Define `MatchProcessorFunction`
  - [x] Set handler: `processor/match-processor.handler`
  - [x] Set reserved concurrent executions: 50
  - [x] Add SQS event trigger with batch size 10
  - [x] Enable ReportBatchItemFailures
  - [x] Add DynamoDB read/write policies
  - [x] Add EventBridge PutEvents policy
  - [x] Add API Gateway ManageConnections policy
  - [x] Add Idempotency table access (Powertools)

**Note:** 
- Agent orchestrator functions are defined in **Task 7.2.6** (Phase 7)
- Synthesizer function is defined in **Task 8.1** (Phase 8)

**AWS Lambda Powertools Integration:**
- All Lambda functions use Powertools for structured logging, tracing, and metrics
- Critical functions (WebSocket Connect, Match Processor, Agent Orchestrators, Synthesizer) implement idempotency
- All functions use Parser utility for input validation with Zod schemas
- See [powertools-implementation-guide.md](./powertools-implementation-guide.md) for detailed implementation

**Lambda Functions Configuration (WebSocket):**
```yaml
Globals:
  Function:
    Runtime: nodejs20.x
    Architectures:
      - arm64
    Environment:
      Variables:
        IDEMPOTENCY_TABLE: !Ref IdempotencyTable
        POWERTOOLS_SERVICE_NAME: hexcore-ai
        POWERTOOLS_METRICS_NAMESPACE: HexCoreAI
        LOG_LEVEL: INFO

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
        - DynamoDBCrudPolicy:
            TableName: !Ref IdempotencyTable
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
      Handler: processor/match-processor.handler
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
        - DynamoDBCrudPolicy:
            TableName: !Ref IdempotencyTable
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

**Additional Lambda Functions:**
- **Agent Orchestrator Functions**: See Task 7.2.6 for definition and implementation
- **Synthesizer Function**: See Task 8.1 for definition and implementation

**Key Powertools Features:**
- **Idempotency**: Prevents duplicate processing on retries (WebSocket Connect, Match Processor, all Agent Orchestrators, Synthesizer)
- **Parser**: Validates input payloads using Zod schemas for type safety
- **Logger**: Structured JSON logging with correlation IDs
- **Tracer**: X-Ray tracing for distributed request tracking
- **Metrics**: CloudWatch custom metrics for business KPIs

See [powertools-implementation-guide.md](./powertools-implementation-guide.md) for complete implementation details.
