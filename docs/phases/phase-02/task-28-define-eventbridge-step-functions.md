# Task 2.8: Define EventBridge & Step Functions

Define EventBridge rule and Step Functions state machine structure. This establishes the orchestration framework that will be populated with agent functions in Task 7.2.

**Status**: ✅ Complete

**Subtasks:**
- [x] Define `MatchFilteredReadyRule` EventBridge rule
  - [x] Set event pattern for `hexcore.match.processor` source
  - [x] Set detail-type: `match.filtered.ready`
  - [x] Add Step Functions as target
- [x] Define `EventBridgeStepFunctionsRole` IAM role
  - [x] Add trust relationship for events.amazonaws.com
  - [x] Add policy to start Step Functions executions
- [x] Define `MultiAgentStateMachine` resource structure
  - [x] Set type: EXPRESS workflow
  - [x] Reference external definition file
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

**Note:** Task 7.2 will add `DefinitionSubstitutions` and `Policies` to this state machine when orchestrator functions are implemented.
