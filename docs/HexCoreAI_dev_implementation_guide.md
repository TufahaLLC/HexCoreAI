# HexCore AI - Complete Implementation Guide

This guide contains all implementation tasks in the recommended order. Tasks are marked as either **[USER]** (manual tasks you perform) or **[AI ASSISTANT]** (tasks to delegate to an AI coding assistant). Check off tasks as you complete them.

---

## Phase 1: Prerequisites & Environment Setup

### [USER] Task 1.1: Install Development Tools

Install required development tools on your local machine.

**Subtasks:**
- [x] Install AWS SAM CLI
  - macOS: `brew install aws-sam-cli`
  - Linux: `pip install aws-sam-cli`
  - Windows: `choco install aws-sam-cli`
- [x] Install Node.js 20.x LTS from nodejs.org
- [x] Verify installation: `node --version` (should show v20.x)
- [x] Verify pnpminstallation: `pnpm--version`
- [x] Install AWS CLI v2 from aws.amazon.com/cli
- [x] Verify AWS CLI: `aws --version`

---

### [USER] Task 1.2: Configure AWS Credentials

Set up AWS credentials for deployment.

**Subtasks:**
- [x] Run `aws configure`
- [x] Enter AWS Access Key ID
- [x] Enter AWS Secret Access Key
- [x] Enter default region (recommended: us-west-2)
- [x] Enter default output format (recommended: json)
- [x] Verify configuration: `aws sts get-caller-identity`

---

### [USER] Task 1.3: Obtain Riot API Key

Register for Riot Developer access and obtain an API key.

**Subtasks:**
- [x] Visit developer.riotgames.com
- [x] Create Riot Developer account (if needed)
- [x] Navigate to "My Applications"
- [x] Generate a Production API key for League of Legends
- [x] Copy and securely save the API key
- [x] Note the rate limits for your API key tier

---

### [USER] Task 1.4: Create AWS Secrets Manager Secret

Store the Riot API key securely in AWS Secrets Manager.

**Subtasks:**
- [x] Run the following command (replace YOUR_RIOT_API_KEY):
```bash
aws secretsmanager create-secret \
  --name riot-api-key \
  --secret-string "YOUR_RIOT_API_KEY" \
  --region us-west-2
```
- [x] Copy the ARN returned (format: `arn:aws:secretsmanager:region:account:secret:riot-api-key-XXXXX`)
- [x] Save the ARN for later use in samconfig.toml
- [x] Verify secret creation:
```bash
aws secretsmanager describe-secret --secret-id riot-api-key --region us-west-2
```

---

### [USER] Task 1.5: Create S3 Deployment Bucket

Create an S3 bucket for SAM deployment artifacts.

**Subtasks:**
- [x] Choose a unique bucket name (e.g., `hexcore-ai-deployment-YOUR-NAME-dev`)
- [x] Create bucket:
```bash
aws s3 mb s3://hexcore-ai-deployment-YOUR-NAME-dev --region us-west-2
```bash
- [x] Verify bucket creation:
```
- [x] Note the bucket name for samconfig.toml

---

### [AI ASSISTANT] Task 1.6: Initialize Project Structure

**→ Now implement Task 1.6 using an AI coding assistant**

This task creates the complete project directory structure with all necessary folders and placeholder files.

**After completion, verify:**
- [ ] `aws/` root directory exists
- [ ] `src/` directory with all subdirectories created
- [ ] `statemachine/` directory exists
- [ ] Placeholder files created (template.yaml, package.json, etc.)

---

### [AI ASSISTANT] Task 1.7: Configure TypeScript Build Environment

**→ Now implement Task 1.7 using an AI coding assistant**

This task sets up TypeScript configuration with all AWS SDK dependencies and build scripts.

**After completion, verify:**
- [ ] `package.json` exists with all dependencies
- [ ] `tsconfig.json` exists with correct compiler options
- [ ] Run `pnpminstall` to install dependencies
- [ ] Verify no errors during installation

---

## Phase 2: Infrastructure as Code (SAM Template)

### [AI ASSISTANT] Task 2.1: Create Core SAM Template

**→ Now implement Task 2.1 using an AI coding assistant**

This task initializes the SAM template with global Lambda configuration.

**After completion, verify:**
- [ ] `template.yaml` exists
- [ ] AWSTemplateFormatVersion and Transform are set
- [ ] Globals section with Function defaults is present
- [ ] Runtime set to nodejs20.x, Architecture to arm64
- [ ] X-Ray tracing enabled

---

### [AI ASSISTANT] Task 2.2: Define Parameters

**→ Now implement Task 2.2 using an AI coding assistant**

This task adds CloudFormation parameters for deployment configuration.

**After completion, verify:**
- [ ] Parameters section added to template.yaml
- [ ] `Stage` parameter defined (default: test)
- [ ] `RiotApiKeySecretArn` parameter defined

---

### [AI ASSISTANT] Task 2.3: Define DynamoDB Tables

**→ Now implement Task 2.3 using an AI coding assistant**

This task creates all three DynamoDB table resources with GSIs and TTL.

**After completion, verify:**
- [ ] `ConnectionsTable` defined with SessionIndex GSI
- [ ] `MatchDataTable` defined with Point-in-Time Recovery
- [ ] `AnalysisResultsTable` defined with PuuidIndex GSI
- [ ] All tables set to PAY_PER_REQUEST billing
- [ ] TTL enabled on all tables

---

### [AI ASSISTANT] Task 2.4: Define SQS Queues

**→ Now implement Task 2.4 using an AI coding assistant**

This task creates SQS queues with dead letter queue configuration.

**After completion, verify:**
- [ ] `MatchQueue` defined with correct properties
- [ ] `MatchDeadLetterQueue` defined
- [ ] RedrivePolicy configured with maxReceiveCount=5
- [ ] Long polling enabled (20 seconds)

---

### [AI ASSISTANT] Task 2.5: Define S3 Bucket

**→ Now implement Task 2.5 using an AI coding assistant**

This task creates the S3 bucket for analysis results with lifecycle rules.

**After completion, verify:**
- [ ] `ResultsBucket` defined with encryption
- [ ] Lifecycle rule configured (90-day expiration)
- [ ] Dynamic bucket name uses AWS::AccountId

---

### [AI ASSISTANT] Task 2.6: Define API Gateway WebSocket

**→ Now implement Task 2.6 using an AI coding assistant**

This task creates WebSocket API with routes and integrations.

**After completion, verify:**
- [ ] `WebSocketApi` resource defined
- [ ] `ConnectRoute` and `DisconnectRoute` defined
- [ ] Integrations for both routes configured
- [ ] `Deployment` and `Stage` resources defined
- [ ] Throttling settings configured (10,000 burst)

---

### [AI ASSISTANT] Task 2.7: Define Lambda Functions

**→ Now implement Task 2.7 using an AI coding assistant**

This task creates all Lambda function resources (WebSocket handlers, processor, agents, synthesizer) with IAM policies.

**After completion, verify:**
- [ ] `WebSocketConnectFunction` defined with permissions
- [ ] `WebSocketDisconnectFunction` defined
- [ ] `MatchProcessorFunction` defined with SQS trigger
- [ ] All 6 agent functions defined (Build, Combat, Vision, Economy, Champion, Competitive)
- [ ] `SynthesizerFunction` defined
- [ ] Lambda invoke permissions for API Gateway added
- [ ] All necessary IAM policies attached

---

### [AI ASSISTANT] Task 2.8: Define EventBridge & Step Functions

**→ Now implement Task 2.8 using an AI coding assistant**

This task creates EventBridge rule and Step Functions state machine.

**After completion, verify:**
- [ ] `MatchFilteredReadyRule` EventBridge rule defined
- [ ] `EventBridgeStepFunctionsRole` IAM role defined
- [ ] `MultiAgentStateMachine` resource defined
- [ ] DefinitionUri points to external ASL file
- [ ] All Lambda ARN substitutions configured
- [ ] `StateMachineLogGroup` defined

---

### [AI ASSISTANT] Task 2.9: Define CloudWatch Alarms

**→ Now implement Task 2.9 using an AI coding assistant**

This task creates CloudWatch alarms for monitoring.

**After completion, verify:**
- [ ] `DLQAlarm` defined (threshold >= 1)
- [ ] `QueueAgeAlarm` defined (threshold > 600 seconds)

---

### [AI ASSISTANT] Task 2.10: Define Outputs

**→ Now implement Task 2.10 using an AI coding assistant**

This task adds CloudFormation outputs for easy reference.

**After completion, verify:**
- [ ] `WebSocketURL` output defined
- [ ] `ConnectionsTableName` output defined
- [ ] `MatchDataTableName` output defined
- [ ] `MatchQueueUrl` output defined
- [ ] `ResultsBucketName` output defined

---

### [USER] Task 2.11: Create SAM Configuration File

Create the samconfig.toml file with your AWS account details.

**Subtasks:**
- [ ] Create `samconfig.toml` in project root
- [ ] Add the following configuration (update ACCOUNT_ID and bucket name):

```toml
version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "hexcore-ai-test"
s3_bucket = "hexcore-ai-deployment-YOUR-NAME"
s3_prefix = "hexcore-ai-test"
region = "us-west-2"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Stage=test RiotApiKeySecretArn=arn:aws:secretsmanager:us-west-2:ACCOUNT_ID:secret:riot-api-key-XXXXX"
confirm_changeset = true
resolve_s3 = true
resolve_image_repos = true
```

- [ ] Replace `ACCOUNT_ID` with your AWS account ID
- [ ] Replace bucket name with your deployment bucket
- [ ] Update `RiotApiKeySecretArn` with ARN from Task 1.4
- [ ] Save the file

---

## Phase 3: Shared Utilities & Type Definitions

### [AI ASSISTANT] Task 3.1: Create TypeScript Type Definitions

**→ Now implement Task 3.1 using an AI coding assistant**

This task defines all TypeScript interfaces for type safety.

**After completion, verify:**
- [ ] `src/shared/types.ts` file created
- [ ] All interfaces defined (SQSMatchMessage, EventBridgeMatchEvent, WebSocketMessage, MatchData, AgentResult)
- [ ] Supporting data type interfaces defined
- [ ] File compiles without errors

---

### [AI ASSISTANT] Task 3.2: Create WebSocket Utility Module

**→ Now implement Task 3.2 using an AI coding assistant**

This task implements utility functions for WebSocket communication.

**After completion, verify:**
- [ ] `src/shared/websocketClient.ts` file created
- [ ] `sendWebSocketUpdate()` function implemented
- [ ] DynamoDB and API Gateway clients initialized
- [ ] GoneException (410 error) handling implemented
- [ ] Stale connection cleanup implemented

---

### [AI ASSISTANT] Task 3.3: Create Riot API Client Module

**→ Now implement Task 3.3 using an AI coding assistant**

This task implements Riot API integration with retry logic.

**After completion, verify:**
- [ ] `src/shared/riotApi.ts` file created
- [ ] `getRiotApiKey()` function with caching implemented
- [ ] `makeRequestWithRetry()` with exponential backoff implemented
- [ ] `getMatchIds()`, `getMatchData()`, `getMatchTimeline()` functions implemented
- [ ] `filterMatchData()` function implemented
- [ ] Helper functions for timeline parsing implemented

---

## Phase 4: WebSocket Handlers

### [AI ASSISTANT] Task 4.1: Implement WebSocket Connect Handler

**→ Now implement Task 4.1 using an AI coding assistant**

This task creates the Lambda function for WebSocket connection establishment.

**After completion, verify:**
- [ ] `src/websocket/connect.ts` file created
- [ ] Handler extracts and validates parameters
- [ ] Connection stored in DynamoDB with TTL
- [ ] Match IDs fetched from Riot API
- [ ] Messages enqueued to SQS
- [ ] Initial WebSocket update sent
- [ ] Error handling implemented

---

### [AI ASSISTANT] Task 4.2: Implement WebSocket Disconnect Handler

**→ Now implement Task 4.2 using an AI coding assistant**

This task creates the Lambda function for WebSocket disconnection.

**After completion, verify:**
- [ ] `src/websocket/disconnect.ts` file created
- [ ] Handler deletes connection from DynamoDB
- [ ] Logging implemented
- [ ] Error handling implemented

---

### [USER] Task 4.3: Build and Test WebSocket Handlers Locally

Test the WebSocket handlers using SAM local.

**Subtasks:**
- [ ] Build the TypeScript code:
```bash
pnpmrun build
```
- [ ] Verify `dist/` directory created with compiled JavaScript
- [ ] Start SAM local API:
```bash
sam local start-api
```
- [ ] Test connection (requires wscat):
```bash
pnpminstall -g wscat
wscat -c "ws://localhost:3001?sessionId=test-123&puuid=test-puuid&region=americas&year=2025"
```
- [ ] Verify connection logs in terminal
- [ ] Check for any errors
- [ ] Stop local API (Ctrl+C)

---

## Phase 5: Match Data Processor

### [AI ASSISTANT] Task 5.1: Implement Match Processor Lambda

**→ Now implement Task 5.1 using an AI coding assistant**

This task creates the Lambda function that processes match data from SQS.

**After completion, verify:**
- [ ] `src/processor/matchProcessor.ts` file created
- [ ] Handler processes SQS batch events
- [ ] Batch failure tracking implemented
- [ ] Match data fetched and filtered
- [ ] Data written to DynamoDB
- [ ] WebSocket progress updates sent
- [ ] EventBridge events published
- [ ] Partial batch failure handling implemented

---

### [USER] Task 5.2: Build and Validate Match Processor

Build and validate the match processor implementation.

**Subtasks:**
- [ ] Build TypeScript code:
```bash
pnpmrun build
```
- [ ] Check for compilation errors
- [ ] Verify no TypeScript errors
- [ ] Review generated JavaScript in `dist/processor/`
- [ ] Create test event file `test-events/sqs-event.json`:

```json
{
  "Records": [
    {
      "messageId": "test-123",
      "body": "{\"matchId\":\"NA1_test\",\"puuid\":\"test-puuid\",\"region\":\"americas\",\"year\":2025,\"sessionId\":\"session-123\"}"
    }
  ]
}
```

- [ ] Test locally (optional, requires proper AWS credentials):
```bash
sam local invoke MatchProcessorFunction --event test-events/sqs-event.json
```

---

## Phase 6: Step Functions State Machine

### [AI ASSISTANT] Task 6.1: Create Step Functions Definition

**→ Now implement Task 6.1 using an AI coding assistant**

This task defines the Step Functions state machine for multi-agent orchestration.

**After completion, verify:**
- [ ] `statemachine/multi-agent-orchestration.asl.json` file created
- [ ] ParallelAgentExecution state with 6 branches defined
- [ ] Each branch has Task state, Retry policy, and Catch block
- [ ] Synthesizer task state defined
- [ ] Parameter substitutions use ${FunctionArn} format
- [ ] JSON is valid (use online JSON validator)

---

## Phase 7: Agent Lambda Functions

### [AI ASSISTANT] Task 7.1: Implement Build Agent

**→ Now implement Task 7.1 using an AI coding assistant**

This task creates the Build Optimization Agent Lambda function.

**After completion, verify:**
- [ ] `src/agents/buildAgent.ts` file created
- [ ] Handler reads from DynamoDB
- [ ] `analyzeBuild()` function implemented
- [ ] WebSocket update sent on completion
- [ ] AgentResult returned
- [ ] Error handling implemented

---

### [AI ASSISTANT] Task 7.2: Implement Combat Agent

**→ Now implement Task 7.2 using an AI coding assistant**

This task creates the Combat Analysis Agent Lambda function.

**After completion, verify:**
- [ ] `src/agents/combatAgent.ts` file created
- [ ] `analyzeCombat()` function implemented
- [ ] KDA and damage analysis included
- [ ] WebSocket update sent
- [ ] Follows agent template structure

---

### [AI ASSISTANT] Task 7.3: Implement Vision Agent

**→ Now implement Task 7.3 using an AI coding assistant**

This task creates the Vision Control Agent Lambda function.

**After completion, verify:**
- [ ] `src/agents/visionAgent.ts` file created
- [ ] Vision score and ward analysis implemented
- [ ] Agent follows standard template

---

### [AI ASSISTANT] Task 7.4: Implement Economy Agent

**→ Now implement Task 7.4 using an AI coding assistant**

This task creates the Economy Management Agent Lambda function.

**After completion, verify:**
- [ ] `src/agents/economyAgent.ts` file created
- [ ] Gold and CS analysis implemented
- [ ] Resource optimization analysis included

---

### [AI ASSISTANT] Task 7.5: Implement Champion Agent

**→ Now implement Task 7.5 using an AI coding assistant**

This task creates the Champion Meta Agent Lambda function.

**After completion, verify:**
- [ ] `src/agents/championAgent.ts` file created
- [ ] Champion metadata extraction implemented
- [ ] Meta benchmark comparison included

---

### [AI ASSISTANT] Task 7.6: Implement Competitive Agent

**→ Now implement Task 7.6 using an AI coding assistant**

This task creates the Competitive Insight Agent Lambda function.

**After completion, verify:**
- [ ] `src/agents/competitiveAgent.ts` file created
- [ ] Rank-appropriate analysis implemented
- [ ] Competitive recommendations generated

---

## Phase 8: Results Aggregation & Synthesis

### [AI ASSISTANT] Task 8.1: Implement Synthesizer Lambda

**→ Now implement Task 8.1 using an AI coding assistant**

This task creates the Lambda function that aggregates all agent results.

**After completion, verify:**
- [ ] `src/aggregation/synthesizer.ts` file created
- [ ] Agent results flattened and processed
- [ ] `generateSummary()` function implemented
- [ ] Results written to S3
- [ ] Summary written to DynamoDB
- [ ] Completion WebSocket update sent
- [ ] ResultId and S3 key returned

---

## Phase 9: Build & Deployment

### [USER] Task 9.1: Install Project Dependencies

Install all Node.js dependencies.

**Subtasks:**
- [ ] Navigate to project root
- [ ] Run `pnpminstall`
- [ ] Wait for installation to complete
- [ ] Verify no errors
- [ ] Check that `node_modules/` directory is created

---

### [USER] Task 9.2: Build TypeScript Code

Compile all TypeScript code to JavaScript.

**Subtasks:**
- [ ] Run `pnpmrun build`
- [ ] Verify build completes successfully
- [ ] Check that `dist/` directory is created
- [ ] Verify all subdirectories exist in `dist/`:
  - [ ] `dist/websocket/`
  - [ ] `dist/processor/`
  - [ ] `dist/agents/`
  - [ ] `dist/aggregation/`
  - [ ] `dist/shared/`
- [ ] Review any TypeScript warnings or errors
- [ ] Fix any compilation issues before proceeding

---

### [USER] Task 9.3: Validate SAM Template

Validate the CloudFormation template syntax.

**Subtasks:**
- [ ] Run `sam validate`
- [ ] Check output for validation success
- [ ] If errors appear, review and fix template.yaml
- [ ] Common issues to check:
  - [ ] Correct indentation (YAML is whitespace-sensitive)
  - [ ] All required properties present
  - [ ] Valid resource references (!Ref, !GetAtt)
- [ ] Re-run validation until successful

---

### [USER] Task 9.4: Build SAM Application

Package Lambda functions and dependencies.

**Subtasks:**
- [ ] Run `sam build`
- [ ] Wait for build process to complete (may take 2-5 minutes)
- [ ] Verify success message: "Build Succeeded"
- [ ] Check `.aws-sam/` directory is created
- [ ] Review build artifacts in `.aws-sam/build/`
- [ ] If build fails, check:
  - [ ] `dist/` directory exists and contains compiled code
  - [ ] `template.yaml` CodeUri points to `./dist`
  - [ ] All handler paths are correct

---

### [USER] Task 9.5: Deploy to AWS (Guided Deployment)

Deploy the complete stack to AWS using guided mode.

**Subtasks:**
- [ ] Run `sam deploy --guided`
- [ ] Respond to prompts:
  - **Stack Name**: Enter `hexcore-ai-test`
  - **AWS Region**: Enter `us-west-2` (or your preferred region)
  - **Parameter Stage**: Press Enter (uses default: test)
  - **Parameter RiotApiKeySecretArn**: Paste ARN from Task 1.4
  - **Confirm changes before deploy**: Enter `Y`
  - **Allow SAM CLI IAM role creation**: Enter `Y`
  - **Disable rollback**: Enter `N` (keep rollback enabled)
  - **Save arguments to configuration file**: Enter `Y`
  - **SAM configuration file**: Press Enter (uses default: samconfig.toml)
  - **SAM configuration environment**: Press Enter (uses default: default)
- [ ] Wait for deployment (typically 10-15 minutes)
- [ ] Watch CloudFormation events in terminal
- [ ] Verify "Successfully created/updated stack" message

---

### [USER] Task 9.6: Capture Deployment Outputs

Save all CloudFormation outputs for testing.

**Subtasks:**
- [ ] After deployment completes, note the outputs displayed
- [ ] Copy and save the following values:
  - [ ] **WebSocketURL**: `wss://xxxxx.execute-api.us-west-2.amazonaws.com/test`
  - [ ] **ConnectionsTableName**: `HexCore-Connections`
  - [ ] **MatchDataTableName**: `HexCore-MatchData`
  - [ ] **MatchQueueUrl**: Full SQS queue URL
  - [ ] **ResultsBucketName**: `hexcore-results-ACCOUNT_ID`
- [ ] Alternatively, retrieve outputs anytime with:
```bash
aws cloudformation describe-stacks \
  --stack-name hexcore-ai-test \
  --query 'Stacks[0].Outputs' \
  --output table
```
- [ ] Save outputs to a text file for reference

---

## Phase 10: Testing & Validation

### [USER] Task 10.1: Verify AWS Resources Created

Confirm all AWS resources were created successfully.

**Subtasks:**
- [ ] Verify DynamoDB tables:
```bash
aws dynamodb list-tables | grep HexCore
```
- [ ] Should see: HexCore-Connections, HexCore-MatchData, HexCore-AnalysisResults

- [ ] Verify Lambda functions:
```bash
aws lambda list-functions | grep HexCore
```
- [ ] Should see all 10 functions (Connect, Disconnect, Processor, 6 Agents, Synthesizer)

- [ ] Verify SQS queues:
```bash
aws sqs list-queues | grep HexCore
```
- [ ] Should see MatchQueue and MatchQueue-DLQ

- [ ] Verify S3 bucket:
```bash
aws s3 ls | grep hexcore-results
```

- [ ] Verify Step Functions:
```bash
aws stepfunctions list-state-machines | grep HexCore
```

- [ ] Verify WebSocket API:
```bash
aws apigatewayv2 get-apis | grep HexCore
```

---

### [USER] Task 10.2: Test WebSocket Connection

Test the WebSocket API connection flow.

**Subtasks:**
- [ ] Install wscat if not already installed:
```bash
pnpminstall -g wscat
```

- [ ] Replace placeholders and connect (use a real PUUID for testing):
```bash
wscat -c "wss://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/test?sessionId=test-$(date +%s)&puuid=YOUR_PUUID&region=americas&year=2024"
```

- [ ] Verify connection established (should see "Connected")
- [ ] Wait for initial message: `{"status":"started",...}`
- [ ] Keep connection open to receive progress updates
- [ ] Note: Processing may take several minutes depending on match count

---

### [USER] Task 10.3: Monitor CloudWatch Logs

Monitor Lambda execution logs during testing.

**Subtasks:**
- [ ] Open CloudWatch Logs in AWS Console
- [ ] Navigate to Log groups
- [ ] Monitor the following log groups:
  - [ ] `/aws/lambda/HexCore-WebSocket-Connect`
  - [ ] `/aws/lambda/HexCore-Match-Processor`
  - [ ] `/aws/lambda/HexCore-BuildAgent` (and other agents)
  - [ ] `/aws/lambda/HexCore-Synthesizer`

- [ ] Look for successful execution logs
- [ ] Check for any ERROR level logs
- [ ] Verify correlation IDs (sessionId) appear in logs

- [ ] Alternatively, use AWS CLI to tail logs:
```bash
sam logs -n HexCore-WebSocket-Connect --stack-name hexcore-ai-test --tail
```

---

### [USER] Task 10.4: Verify SQS Message Processing

Confirm messages are being processed from the queue.

**Subtasks:**
- [ ] Check SQS queue metrics in AWS Console
- [ ] Navigate to SQS → Queues → HexCore-MatchQueue
- [ ] Monitor "Messages Available" count (should increase then decrease)
- [ ] Check "Messages in Flight" (should show active processing)
- [ ] Verify "Messages Received" metric increases
- [ ] Check Dead Letter Queue has 0 messages:
```bash
aws sqs get-queue-attributes \
  --queue-url YOUR_DLQ_URL \
  --attribute-names ApproximateNumberOfMessages
```

---

### [USER] Task 10.5: Verify DynamoDB Data

Check that filtered match data is being written to DynamoDB.

**Subtasks:**
- [ ] Open DynamoDB console
- [ ] Navigate to Tables → HexCore-MatchData
- [ ] Click "Explore table items"
- [ ] Verify items are being created
- [ ] Check item structure includes:
  - [ ] `dataKey` (format: match:xxx:puuid:xxx)
  - [ ] `build`, `combat`, `vision`, `economy` objects
  - [ ] `expiresAt` TTL value
- [ ] Check Connections table:
  - [ ] Navigate to HexCore-Connections
  - [ ] Verify connection record exists with your sessionId
  - [ ] Note the `ttl` value (should be ~2 hours from now)

---

### [USER] Task 10.6: Monitor Step Functions Execution

Watch the Step Functions state machine process matches.

**Subtasks:**
- [ ] Open Step Functions console
- [ ] Navigate to State machines → HexCore-MultiAgent-Orchestration
- [ ] Click on "Executions" tab
- [ ] Verify executions appear (one per match processed)
- [ ] Click on a running execution to view graph
- [ ] Watch parallel agent execution:
  - [ ] All 6 agent branches should run simultaneously
  - [ ] Green = success, Orange = running, Red = failed
- [ ] Verify Synthesizer step executes after agents complete
- [ ] Check execution time (should be under 2 minutes per match)
- [ ] Review execution input/output JSON

---

### [USER] Task 10.7: Verify WebSocket Progress Updates

Confirm real-time progress updates are received.

**Subtasks:**
- [ ] Return to your wscat connection (if still open)
- [ ] Verify you received messages with:
  - [ ] `"status":"started"` - Initial connection
  - [ ] `"status":"processing"` - Data fetching updates
  - [ ] `"status":"processing"` - Agent completion messages
  - [ ] `"status":"processing"` - Synthesis message
  - [ ] `"status":"complete"` - Final completion with resultId
- [ ] Note the `resultId` from the final message
- [ ] If connection was closed, test again with new connection

---

### [USER] Task 10.8: Verify Results in S3

Check that synthesized results are stored in S3.

**Subtasks:**
- [ ] List S3 bucket contents:
```bash
aws s3 ls s3://hexcore-results-YOUR_ACCOUNT_ID/results/ --recursive
```

- [ ] Verify files exist with pattern: `results/{puuid}/{matchId}.json`
- [ ] Download a result file:
```bash
aws s3 cp s3://hexcore-results-YOUR_ACCOUNT_ID/results/{puuid}/{matchId}.json ./test-result.json
```

- [ ] Open and review `test-result.json`:
  - [ ] Should contain `matchId`, `puuid`, `timestamp`
  - [ ] Should have `agents` array with 6 agent results
  - [ ] Should have `summary` object with overallScore, strengths, improvements
- [ ] Verify JSON structure is valid

---

### [USER] Task 10.9: Verify Results in DynamoDB

Check that analysis summaries are indexed in DynamoDB.

**Subtasks:**
- [ ] Open DynamoDB console
- [ ] Navigate to Tables → HexCore-AnalysisResults
- [ ] Click "Explore table items"
- [ ] Verify result records exist
- [ ] Check item structure:
  - [ ] `resultId` matches WebSocket message
  - [ ] `puuid` and `matchId` are correct
  - [ ] `s3Key` points to S3 object
  - [ ] `summary` contains analysis overview
  - [ ] `expiresAt` TTL set (90 days)
- [ ] Test GSI query by puuid:
  - [ ] Click "Scan/Query items"
  - [ ] Select index: PuuidIndex
  - [ ] Enter a puuid value
  - [ ] Verify query returns results for that player

---

### [USER] Task 10.10: Test Error Handling

Verify error handling with invalid data.

**Subtasks:**
- [ ] Send invalid match ID to SQS manually:
```bash
aws sqs send-message \
  --queue-url YOUR_QUEUE_URL \
  --message-body '{"matchId":"INVALID_MATCH","puuid":"test","region":"americas","year":2024,"sessionId":"test-error"}'
```

- [ ] Monitor processor Lambda logs for error handling
- [ ] After ~5 retries, verify message moves to DLQ:
```bash
aws sqs receive-message --queue-url YOUR_DLQ_URL
```

- [ ] Check DLQ alarm triggered in CloudWatch
- [ ] Delete test message from DLQ:
```bash
aws sqs purge-queue --queue-url YOUR_DLQ_URL
```

---

### [USER] Task 10.11: Load Test with Multiple Matches

Test system with realistic workload.

**Subtasks:**
- [ ] Choose a PUUID with 50-100 matches in a year
- [ ] Connect via WebSocket with valid parameters
- [ ] Monitor system behavior:
  - [ ] SQS queue depth (should process ~10 at a time)
  - [ ] Lambda concurrent executions (should respect reserved concurrency)
  - [ ] DynamoDB throttling (should be none with on-demand)
  - [ ] Step Functions executions (multiple parallel)
- [ ] Measure total processing time (should be 3-5 minutes for 100 matches)
- [ ] Verify all matches processed successfully
- [ ] Check no messages in DLQ

---

## Phase 11: Observability & Monitoring

### [USER] Task 11.1: Create CloudWatch Dashboard

Build a monitoring dashboard for the system.

**Subtasks:**
- [ ] Open CloudWatch console → Dashboards
- [ ] Click "Create dashboard"
- [ ] Name: `HexCore-AI-Monitoring`
- [ ] Add widgets for key metrics:

**Widget 1: SQS Queue Metrics**
- [ ] Add widget → Line graph
- [ ] Select metrics:
  - [ ] SQS → Queue Metrics → ApproximateNumberOfMessagesVisible
  - [ ] ApproximateNumberOfMessagesNotVisible
  - [ ] ApproximateAgeOfOldestMessage
- [ ] Title: "SQS Queue Status"

**Widget 2: Lambda Invocations**
- [ ] Add widget → Line graph
- [ ] Select all Lambda functions → Invocations metric
- [ ] Title: "Lambda Invocations"

**Widget 3: Lambda Errors**
- [ ] Add widget → Line graph
- [ ] Select all Lambda functions → Errors metric
- [ ] Title: "Lambda Errors"

**Widget 4: Lambda Duration**
- [ ] Add widget → Line graph
- [ ] Select key functions → Duration metric (Average)
- [ ] Title: "Lambda Execution Time"

**Widget 5: DynamoDB Operations**
- [ ] Add widget → Line graph
- [ ] Select all tables → ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits
- [ ] Title: "DynamoDB Throughput"

**Widget 6: Step Functions**
- [ ] Add widget → Number
- [ ] Select state machine → ExecutionsSucceeded, ExecutionsFailed
- [ ] Title: "Step Functions Status"

- [ ] Save dashboard
- [ ] Set auto-refresh to 1 minute

---

### [USER] Task 11.2: Verify CloudWatch Alarms

Check that alarms are configured and functioning.

**Subtasks:**
- [ ] Open CloudWatch console → Alarms
- [ ] Verify alarms exist:
  - [ ] `HexCore-DLQ-Messages` (state should be OK)
  - [ ] `HexCore-Queue-Age` (state should be OK)
- [ ] Review alarm configuration:
  - [ ] Click each alarm → View details
  - [ ] Verify thresholds are appropriate
  - [ ] Check evaluation period
- [ ] Test DLQ alarm (optional):
  - [ ] Send message to DLQ manually
  - [ ] Wait for alarm to trigger (5 minutes)
  - [ ] Verify alarm state changes to "In alarm"
  - [ ] Purge DLQ to clear alarm

---

### [USER] Task 11.3: Configure SNS Notifications

Set up email/SMS notifications for alarms.

**Subtasks:**
- [ ] Create SNS topic:
```bash
aws sns create-topic --name hexcore-ai-alarms
```
- [ ] Note the Topic ARN returned

- [ ] Subscribe your email:
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-2:ACCOUNT_ID:hexcore-ai-alarms \
  --protocol email \
  --notification-endpoint your-email@example.com
```

- [ ] Check your email for confirmation
- [ ] Click "Confirm subscription" in email

- [ ] Update CloudWatch alarms to use SNS:
  - [ ] Open CloudWatch console → Alarms
  - [ ] For each alarm, click "Edit"
  - [ ] Under "Notification", add the SNS topic
  - [ ] Save changes

- [ ] Test notification:
  - [ ] Trigger an alarm (send message to DLQ)
  - [ ] Verify you receive email notification

---

### [USER] Task 11.4: Enable X-Ray Tracing

Verify X-Ray tracing is active and review traces.

**Subtasks:**
- [ ] Open X-Ray console
- [ ] Verify tracing is enabled (already set in SAM template)
- [ ] Navigate to "Service map"
- [ ] Trigger some requests (connect via WebSocket)
- [ ] Wait 2-3 minutes for data to appear
- [ ] Review service map:
  - [ ] Should show: API Gateway → Lambda → DynamoDB/SQS/EventBridge
  - [ ] Should show: Step Functions → Agent Lambdas
- [ ] Click on a Lambda node → View traces
- [ ] Examine trace timeline:
  - [ ] API Gateway latency
  - [ ] Lambda initialization
  - [ ] DynamoDB operations
  - [ ] External API calls (Riot API)
- [ ] Identify bottlenecks or slow operations
- [ ] Export trace data for analysis (optional)

---

### [AI ASSISTANT] Task 11.5: Add Structured Logging

**→ Now implement Task 11.5 using an AI coding assistant**

This task updates all Lambda functions to include structured JSON logging with correlation IDs.

**After completion, verify:**
- [ ] All Lambda functions use structured logging
- [ ] SessionId appears as correlation ID in logs
- [ ] Log levels are consistent (INFO, WARN, ERROR)
- [ ] Context included in all log statements

---

## Phase 12: Optimization & Refinement

### [USER] Task 12.1: Analyze Lambda Memory Usage

Right-size Lambda memory for cost optimization.

**Subtasks:**
- [ ] Open CloudWatch Logs Insights
- [ ] Run query for each Lambda function:
```
fields @timestamp, @message
| filter @type = "REPORT"
| stats max(@memorySize / 1000 / 1000) as provisioned_mb,
        max(@maxMemoryUsed / 1000 / 1000) as max_used_mb,
        avg(@maxMemoryUsed / 1000 / 1000) as avg_used_mb
```

- [ ] Review results for each function:
  - [ ] If `avg_used_mb` is < 50% of `provisioned_mb`, reduce memory
  - [ ] If `max_used_mb` is close to `provisioned_mb`, increase memory

- [ ] Update template.yaml with optimized memory values
- [ ] Redeploy:
```bash
pnpmrun build
sam deploy
```

- [ ] Monitor performance after changes

---

### [USER] Task 12.2: Tune SQS Batch Size

Optimize batch processing for throughput.

**Subtasks:**
- [ ] Review Match Processor duration in CloudWatch:
```
fields @timestamp, @duration
| filter @type = "REPORT"
| stats avg(@duration) as avg_duration, max(@duration) as max_duration
```

- [ ] Current batch size: 10
- [ ] If avg_duration < 30 seconds:
  - [ ] Consider increasing batch size to 15
  - [ ] More API calls per invocation = fewer Lambda cold starts
- [ ] If max_duration > 50 seconds:
  - [ ] Consider decreasing batch size to 5-7
  - [ ] Prevents timeout risk
- [ ] Update template.yaml:
```yaml
BatchSize: 15  # or your optimal value
```

- [ ] Redeploy and monitor

---

### [USER] Task 12.3: Monitor Costs

Track AWS costs for the HexCore AI system.

**Subtasks:**
- [ ] Open AWS Cost Explorer
- [ ] Filter by Service: Lambda, DynamoDB, S3, SQS, Step Functions, API Gateway
- [ ] Filter by Tag (if you added tags): `Project: HexCore-AI`
- [ ] Review costs by service:
  - [ ] Lambda: Cost per invocation and duration
  - [ ] DynamoDB: On-demand read/write costs
  - [ ] S3: Storage and request costs
  - [ ] Step Functions: Express execution costs
- [ ] Set up cost budget:
  - [ ] Navigate to AWS Budgets
  - [ ] Create monthly budget (e.g., $50)
  - [ ] Set alerts at 80% and 100%
- [ ] Review recommendations for cost optimization

---

### [USER] Task 12.4: Review Security Best Practices

Ensure the system follows AWS security best practices.

**Subtasks:**
- [ ] Review IAM policies:
  - [ ] Open IAM console
  - [ ] Find roles created by SAM (format: `hexcore-ai-test-*-role-*`)
  - [ ] Review attached policies
  - [ ] Verify principle of least privilege
  - [ ] No overly permissive wildcards (*)

- [ ] Enable AWS CloudTrail (if not already):
```bash
aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::Lambda::Function
```

- [ ] Review S3 bucket security:
  - [ ] Verify encryption is enabled
  - [ ] Check bucket policy doesn't allow public access
  - [ ] Enable versioning (optional):
```bash
aws s3api put-bucket-versioning --bucket hexcore-results-YOUR_ACCOUNT_ID --versioning-configuration Status=Enabled
```

- [ ] Review Secrets Manager access:
  - [ ] Only Lambda roles should have access to Riot API key
  - [ ] Enable rotation policy (optional, requires custom Lambda)

- [ ] Enable GuardDuty for threat detection (optional):
  - [ ] Navigate to GuardDuty console
  - [ ] Enable GuardDuty
  - [ ] Review findings

---

### [AI ASSISTANT] Task 12.5: Implement Advanced Agent Logic

**→ Now implement Task 12.5 using an AI coding assistant**

This task enhances agent analysis with AWS Bedrock integration and external data sources.

**After completion, verify:**
- [ ] Bedrock client integrated in agent functions
- [ ] Champion meta data fetching implemented
- [ ] Enhanced recommendation algorithms deployed
- [ ] Test with real match data

---

### [AI ASSISTANT] Task 12.6: Add Client WebSocket Reconnection Logic

**→ Now implement Task 12.6 using an AI coding assistant**

This task creates documentation for client-side WebSocket resilience patterns.

**After completion, verify:**
- [ ] Client utility documentation created
- [ ] Reconnection strategy documented
- [ ] Code examples provided for Next.js
- [ ] Message handling patterns documented

---

### [AI ASSISTANT] Task 12.7: Implement Result Caching

**→ Now implement Task 12.7 using an AI coding assistant**

This task adds caching layer for frequently accessed results.

**After completion, verify:**
- [ ] Caching strategy documented
- [ ] ETag-based conditional reads implemented
- [ ] Cache invalidation handling documented

---

## Phase 13: Production Hardening

### [USER] Task 13.1: Create Production Environment

Deploy a separate production stack.

**Subtasks:**
- [ ] Update samconfig.toml to add production configuration:
```toml
[production]
[production.deploy]
[production.deploy.parameters]
stack_name = "hexcore-ai-prod"
s3_bucket = "hexcore-ai-deployment-YOUR-NAME"
s3_prefix = "hexcore-ai-prod"
region = "us-west-2"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Stage=prod RiotApiKeySecretArn=arn:aws:secretsmanager:us-west-2:ACCOUNT_ID:secret:riot-api-key-XXXXX"
confirm_changeset = true
```

- [ ] Deploy production stack:
```bash
sam deploy --config-env production
```

- [ ] Verify separate stack created:
```bash
aws cloudformation list-stacks | grep hexcore-ai
```

- [ ] Note production outputs separately
- [ ] Update monitoring dashboard for production
- [ ] Configure production-specific alarms (stricter thresholds)

---

### [USER] Task 13.2: Enable DynamoDB Backups

Configure automated backups for production data.

**Subtasks:**
- [ ] Enable Point-in-Time Recovery (already enabled for MatchData in template)
- [ ] Verify PITR status:
```bash
aws dynamodb describe-continuous-backups --table-name HexCore-MatchData
```

- [ ] Create on-demand backup:
```bash
aws dynamodb create-backup \
  --table-name HexCore-Connections \
  --backup-name hexcore-connections-backup-$(date +%Y%m%d)
```

- [ ] Repeat for other tables
- [ ] Set up automated backup schedule (optional):
  - [ ] Create EventBridge rule to trigger daily
  - [ ] Lambda function to create backups
  - [ ] Or use AWS Backup service

- [ ] Test restore procedure:
  - [ ] Create test backup
  - [ ] Restore to new table
  - [ ] Verify data integrity
  - [ ] Delete test table

---

### [USER] Task 13.3: Enable S3 Versioning and Replication

Protect analysis results from accidental deletion.

**Subtasks:**
- [ ] Enable S3 versioning:
```bash
aws s3api put-bucket-versioning \
  --bucket hexcore-results-YOUR_ACCOUNT_ID \
  --versioning-configuration Status=Enabled
```

- [ ] Verify versioning enabled:
```bash
aws s3api get-bucket-versioning --bucket hexcore-results-YOUR_ACCOUNT_ID
```

- [ ] Configure lifecycle policy for old versions:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket hexcore-results-YOUR_ACCOUNT_ID \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json:**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
```

- [ ] Set up cross-region replication (optional, for disaster recovery):
  - [ ] Create destination bucket in different region
  - [ ] Configure replication rule
  - [ ] Test replication

---

### [USER] Task 13.4: Implement API Authentication

Secure the WebSocket API with authentication.

**Subtasks:**
- [ ] Choose authentication method (API Keys or IAM):

**Option A: API Keys**
- [ ] Create API keys in API Gateway console
- [ ] Associate keys with usage plan
- [ ] Update client to include API key in connection
- [ ] Update Lambda authorizer (if needed)

**Option B: IAM Authentication**
- [ ] Update template.yaml ConnectRoute:
```yaml
AuthorizationType: AWS_IAM
```

- [ ] Redeploy stack
- [ ] Update client to sign requests with AWS SigV4
- [ ] Provide IAM credentials to authorized users

- [ ] Test authenticated connections
- [ ] Verify unauthorized connections are rejected
- [ ] Document authentication requirements for clients

---

### [USER] Task 13.5: Configure WAF (Optional)

Add Web Application Firewall for additional security.

**Subtasks:**
- [ ] Create WAF Web ACL:
```bash
aws wafv2 create-web-acl \
  --name hexcore-ai-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=HexCoreWAF
```

- [ ] Associate WAF with API Gateway:
```bash
aws wafv2 associate-web-acl \
  --web-acl-arn YOUR_WAF_ARN \
  --resource-arn YOUR_API_GATEWAY_ARN
```

- [ ] Configure rate limiting rules
- [ ] Configure geo-blocking (if needed)
- [ ] Monitor WAF metrics in CloudWatch

---

### [USER] Task 13.6: Create Disaster Recovery Plan

Document procedures for system recovery.

**Subtasks:**
- [ ] Create runbook document with procedures for:
  - [ ] Stack restoration from backup
  - [ ] DynamoDB table recovery
  - [ ] S3 data recovery
  - [ ] Secret rotation
  - [ ] Lambda function rollback

- [ ] Document RTO (Recovery Time Objective): Target recovery time
- [ ] Document RPO (Recovery Point Objective): Acceptable data loss window

- [ ] Test disaster recovery procedure:
  - [ ] Delete test stack
  - [ ] Restore from CloudFormation template
  - [ ] Restore DynamoDB data
  - [ ] Verify system functionality

- [ ] Create escalation contacts
- [ ] Store runbook in secure, accessible location

---

### [USER] Task 13.7: Perform Security Audit

Conduct comprehensive security review.

**Subtasks:**
- [ ] Run AWS Trusted Advisor checks
- [ ] Review Security recommendations
- [ ] Address any HIGH or MEDIUM findings

- [ ] Run AWS Config rules:
  - [ ] Enable AWS Config if not already
  - [ ] Add rules for:
    - [ ] Lambda function public access
    - [ ] S3 bucket public access
    - [ ] IAM password policy
    - [ ] Encrypted volumes

- [ ] Review AWS Security Hub findings (if enabled)

- [ ] Conduct IAM Access Analyzer review:
```bash
aws accessanalyzer list-findings
```

- [ ] Document findings and remediation actions
- [ ] Create tickets for any security issues
- [ ] Schedule regular security audits (quarterly)

---

### [USER] Task 13.8: Set Up Monitoring and Alerting for Production

Configure production-grade monitoring.

**Subtasks:**
- [ ] Create separate CloudWatch dashboard for production
- [ ] Set up enhanced alarms with stricter thresholds:
  - [ ] Lambda error rate > 1% (was 5% in test)
  - [ ] Queue age > 5 minutes (was 10 minutes)
  - [ ] DynamoDB throttling > 0
  - [ ] Step Functions failure rate > 5%
  - [ ] API Gateway 5XX errors > 1%

- [ ] Configure alarm actions:
  - [ ] Critical: SNS → Email + SMS + PagerDuty
  - [ ] Warning: SNS → Email
  - [ ] Set up auto-recovery where possible

- [ ] Enable Enhanced Monitoring for Lambda:
```bash
aws lambda update-function-configuration \
  --function-name HexCore-Match-Processor \
  --tracing-config Mode=Active
```

- [ ] Set up log aggregation:
  - [ ] Consider CloudWatch Logs Insights saved queries
  - [ ] Or integrate with external logging (Datadog, Splunk)

- [ ] Create operational dashboard showing:
  - [ ] System health status
  - [ ] Current processing rate
  - [ ] Error rates
  - [ ] Cost metrics

---

### [USER] Task 13.9: Conduct Load Testing

Test system under production-level load.

**Subtasks:**
- [ ] Define load test scenarios:
  - [ ] Normal load: 10 concurrent users
  - [ ] Peak load: 50 concurrent users
  - [ ] Stress test: 100+ concurrent users

- [ ] Create load test script:
```javascript
// Example Node.js script
const WebSocket = require('ws');

for (let i = 0; i < 50; i++) {
  const ws = new WebSocket(WEBSOCKET_URL + '?sessionId=load-test-' + i + '&puuid=VALID_PUUID&region=americas&year=2024');
  
  ws.on('message', (data) => {
    console.log(`User ${i}: ${data}`);
  });
}
```

- [ ] Run load test against test environment first
- [ ] Monitor all metrics during load test:
  - [ ] Lambda concurrent executions
  - [ ] DynamoDB throughput
  - [ ] SQS queue depth
  - [ ] API Gateway throttling
  - [ ] Step Functions executions

- [ ] Identify bottlenecks
- [ ] Tune parameters as needed:
  - [ ] Increase Lambda reserved concurrency if needed
  - [ ] Adjust SQS batch size
  - [ ] Scale up DynamoDB (if using provisioned)

- [ ] Verify system handles load gracefully
- [ ] Verify no data loss under load
- [ ] Document maximum supported throughput

---

### [USER] Task 13.10: Create Operations Documentation

Document operational procedures for the team.

**Subtasks:**
- [ ] Create operations manual covering:

**System Architecture**
- [ ] Architecture diagram
- [ ] Component descriptions
- [ ] Data flow explanations
- [ ] Integration points

**Deployment Procedures**
- [ ] How to deploy updates
- [ ] Rollback procedures
- [ ] Environment promotion process
- [ ] Configuration management

**Monitoring and Alerting**
- [ ] Dashboard locations
- [ ] Alarm descriptions
- [ ] Expected metrics and thresholds
- [ ] How to interpret alerts

**Troubleshooting Guide**
- [ ] Common issues and solutions
- [ ] Log locations and how to search
- [ ] Debugging workflows
- [ ] When to escalate

**Maintenance Procedures**
- [ ] Secret rotation
- [ ] Backup verification
- [ ] Cost review
- [ ] Performance tuning

**Incident Response**
- [ ] Severity definitions
- [ ] Response procedures by severity
- [ ] Communication templates
- [ ] Post-mortem process

- [ ] Store documentation in accessible wiki/repository
- [ ] Train team members on procedures
- [ ] Schedule regular documentation reviews

---

## Final Verification Checklist

### [USER] Task 14.1: Complete End-to-End Test

Perform comprehensive end-to-end validation.

**Subtasks:**
- [ ] Test complete user flow:
  - [ ] Connect to WebSocket with valid credentials
  - [ ] Process full year of match data (50+ matches)
  - [ ] Receive all progress updates
  - [ ] Get final completion message with resultId
  - [ ] Retrieve results from S3
  - [ ] Query results from DynamoDB

- [ ] Verify all 6 agents produced analysis:
  - [ ] Build Agent results present
  - [ ] Combat Agent results present
  - [ ] Vision Agent results present
  - [ ] Economy Agent results present
  - [ ] Champion Agent results present
  - [ ] Competitive Agent results present

- [ ] Verify data quality:
  - [ ] Analysis makes sense for the player
  - [ ] Recommendations are relevant
  - [ ] No obvious errors in calculations
  - [ ] Data properly formatted

- [ ] Test edge cases:
  - [ ] Player with very few matches
  - [ ] Player with 100+ matches
  - [ ] Recent matches vs old matches
  - [ ] Different regions
  - [ ] Different queue types

- [ ] Verify error handling:
  - [ ] Invalid PUUID
  - [ ] Invalid region
  - [ ] Invalid year
  - [ ] Network errors
  - [ ] Riot API downtime

- [ ] Check performance:
  - [ ] Processing time acceptable (< 5 minutes for 100 matches)
  - [ ] No timeouts
  - [ ] No memory issues
  - [ ] Costs within budget

---

### [USER] Task 14.2: System Health Check

Verify all systems are operational.

**Subtasks:**
- [ ] Check all Lambda functions:
```bash
for func in $(aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `HexCore`)].FunctionName' --output text); do
  echo "Testing $func"
  aws lambda get-function --function-name $func
done
```

- [ ] Check all DynamoDB tables:
```bash
for table in HexCore-Connections HexCore-MatchData HexCore-AnalysisResults; do
  aws dynamodb describe-table --table-name $table
done
```

- [ ] Verify SQS queues empty and healthy:
```bash
aws sqs get-queue-attributes \
  --queue-url YOUR_QUEUE_URL \
  --attribute-names All
```

- [ ] Check CloudWatch alarms (all should be OK):
```bash
aws cloudwatch describe-alarms --state-value ALARM
```

- [ ] Verify Step Functions state machine active:
```bash
aws stepfunctions describe-state-machine --state-machine-arn YOUR_STATE_MACHINE_ARN
```

- [ ] Check recent error logs:
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/HexCore-Match-Processor" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

### [USER] Task 14.3: Cost Analysis

Review and optimize costs.

**Subtasks:**
- [ ] Generate cost report for past week:
  - [ ] Open AWS Cost Explorer
  - [ ] Filter to past 7 days
  - [ ] Group by Service
  - [ ] Analyze costs by component:
    - [ ] Lambda: $X.XX
    - [ ] DynamoDB: $X.XX
    - [ ] S3: $X.XX
    - [ ] Step Functions: $X.XX
    - [ ] Other: $X.XX
  - [ ] Total: $X.XX

- [ ] Calculate cost per analysis:
  - [ ] Count number of complete analyses
  - [ ] Divide total cost by number of analyses
  - [ ] Target: < $0.50 per full year analysis

- [ ] Identify cost optimization opportunities:
  - [ ] Unused resources to delete
  - [ ] Over-provisioned Lambda memory
  - [ ] Inefficient API calls
  - [ ] Excessive logging

- [ ] Project monthly costs
- [ ] Compare against budget
- [ ] Document cost optimizations implemented

---

### [USER] Task 14.4: Documentation Review

Ensure all documentation is complete and accurate.

**Subtasks:**
- [ ] Review README.md in project root
- [ ] Verify architecture documentation is current
- [ ] Check API documentation (if applicable)
- [ ] Verify deployment guide is accurate
- [ ] Update troubleshooting guide with learnings
- [ ] Document any deviations from original plan
- [ ] Add code comments where needed
- [ ] Create system diagram
- [ ] Document environment variables
- [ ] List all external dependencies

---

### [USER] Task 14.5: Cleanup Test Resources (Optional)

Remove test environment if no longer needed.

**Subtasks:**
- [ ] **WARNING**: This will delete all test resources
- [ ] Backup any important test data
- [ ] Export CloudWatch logs for reference
- [ ] Delete CloudFormation stack:
```bash
sam delete --stack-name hexcore-ai-test
```

- [ ] Verify stack deletion:
```bash
aws cloudformation describe-stacks --stack-name hexcore-ai-test
```
  Should return error: "Stack does not exist"

- [ ] Manually delete resources not managed by stack:
  - [ ] S3 deployment bucket (if not needed)
  - [ ] CloudWatch Logs (if retention expired)
  - [ ] Any test data

- [ ] Verify no orphaned resources:
```bash
aws resourcegroupstaggingapi get-resources --tag-filters Key=aws:cloudformation:stack-name,Values=hexcore-ai-test
```

---

## Completion Summary

### Project Status: **[COMPLETE / IN PROGRESS]**

**Total Tasks Completed**: _____ / 90+

**Deployment Environment**: 
- [ ] Test environment deployed
- [ ] Production environment deployed

**System Status**:
- [ ] All tests passing
- [ ] All alarms green
- [ ] Documentation complete
- [ ] Team trained

**Outstanding Items**:
- [ ] (List any remaining tasks or issues)

**Next Steps**:
- [ ] (List any follow-up actions)

---

## Appendix: Quick Reference

### Useful Commands

**Deploy Updates:**
```bash
pnpmrun build && sam deploy
```

**View Logs:**
```bash
sam logs -n HexCore-Match-Processor --stack-name hexcore-ai-test --tail
```

**Test WebSocket:**
```bash
wscat -c "wss://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/test?sessionId=test-123&puuid=YOUR_PUUID&region=americas&year=2024"
```

**Check Queue Status:**
```bash
aws sqs get-queue-attributes --queue-url YOUR_QUEUE_URL --attribute-names ApproximateNumberOfMessages
```

**View Step Functions Execution:**
```bash
aws stepfunctions list-executions --state-machine-arn YOUR_STATE_MACHINE_ARN --max-results 5
```

---

**Congratulations on completing the HexCore AI implementation!** 🎉

This comprehensive guide has walked you through building a production-ready, serverless AI-powered League of Legends analysis system using AWS services. The system processes player match history, performs multi-agent analysis, and delivers personalized insights through real-time WebSocket updates.