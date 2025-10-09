# Task 2.3: Define DynamoDB Tables ✅

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
- [x] Define `IdempotencyTable` resource (AWS Lambda Powertools)
  - [x] Set partition key: `id` (String)
  - [x] Enable TTL on `expiration` attribute
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
```

**Notes:**
- The `IdempotencyTable` is used by AWS Lambda Powertools to store idempotency records
- TTL automatically removes expired records to minimize storage costs
- See [powertools-implementation-guide.md](./powertools-implementation-guide.md) for implementation details
