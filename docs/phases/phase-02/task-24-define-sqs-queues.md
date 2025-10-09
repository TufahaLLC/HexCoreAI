# Task 2.4: Define SQS Queues ✅

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
