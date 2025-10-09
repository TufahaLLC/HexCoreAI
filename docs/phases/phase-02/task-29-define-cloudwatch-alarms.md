# Task 2.9: Define CloudWatch Alarms

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
