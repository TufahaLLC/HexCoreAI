# Task 2.10: Define Outputs

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
