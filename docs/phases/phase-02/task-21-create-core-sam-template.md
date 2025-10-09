# Task 2.1: Create Core SAM Template ✅

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
