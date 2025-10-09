# Task 2.6: Define API Gateway WebSocket

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
