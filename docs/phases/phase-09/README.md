# Phase 9: User Validation & Testing (Test Environment)

## Overview

This phase defines a comprehensive, manual end-to-end validation plan for the first eight phases. You will verify the full AWS-powered backend of the agent analysis pipeline in a dedicated test environment, from WebSocket connection and match ingestion to Step Functions orchestration and final synthesis delivery.

- Scope: Validate Phases 1–8 end-to-end in the `test` stage.
- Objective: Ensure the backend is production-ready, idempotent, observable, and resilient.
- Inputs: Valid Riot `puuid`, routing `region` (e.g., `americas`), `year` window, and a unique `sessionId`.

---

## Prerequisites

- Deployed stack per `apps/aws/template.yaml` with Stage `test`.
- AWS credentials with read access to CloudFormation, DynamoDB, S3, SQS, CloudWatch, and Step Functions.
- Riot API key configured in Secrets Manager at `RIOT_API_KEY_SECRET`.
- Local tools:
  - AWS CLI v2
  - wscat (`npm i -g wscat`) or an equivalent WebSocket client

---

## Helpful Stack Outputs

Use these CloudFormation outputs to drive tests:

- `WebSocketURL` – Connect endpoint: `wss://.../test`
- `ConnectionsTableName` – DynamoDB table: `HexCore-Connections`
- `MatchDataTableName` – DynamoDB table: `HexCore-MatchData`
- `MatchQueueUrl` – SQS queue URL: `https://sqs.../HexCore-MatchQueue`
- `ResultsBucketName` – S3 bucket: `hexcore-results-<accountId>`

Example command to fetch outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name <STACK_NAME> \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' \
  --output table
```

---

## Phase 9 Execution Flow

### Local Implementation Validation (Phases 4–5)

- **Build WebSocket handlers** `pnpm run build` and confirm compiled assets exist in `dist/websocket/` per `docs/phases/phase-04/task-43-build-and-test-websocket-handlers-locally.md`.
- **Exercise connect handler** `sam local start-api` then connect with `wscat` to verify `status:"started"` responses and DynamoDB writes occur locally.
- **Validate match processor** Rebuild with `pnpm run build` and invoke `sam local invoke MatchProcessorFunction --event test-events/sqs-event.json` per `docs/phases/phase-05/task-52-build-and-validate-match-processor.md`.
- **Confirm TypeScript health** Ensure no compilation errors remain before moving to test-environment deployment.

### Build & Package Pre-Deployment (Phase 9 Tasks 9.1–9.4)

- **Install dependencies** Run `pnpm install` (or `pnpm install --frozen-lockfile`) and ensure `node_modules/` exists.
- **Compile sources** Execute `pnpm run build` and confirm all `dist/` subdirectories (`websocket`, `processor`, `agents`, `aggregation`, `shared`) are present.
- **Template validation** `sam validate` must succeed with no warnings.
- **Package build** `sam build` should create `.aws-sam/build/` without errors; if failures occur, resolve handler path or missing artifact issues before proceeding.

### Deploy Test Stack & Capture Outputs (Phase 9 Tasks 9.5–9.6)

- **Guided deployment** Run `sam deploy --guided` using Stage `test`, allowing IAM role creation, then save arguments to `samconfig.toml`.
- **Track deployment** Monitor CloudFormation events until "Successfully created/updated stack" appears.
- **Record outputs** Capture `WebSocketURL`, `ConnectionsTableName`, `MatchDataTableName`, `MatchQueueUrl`, and `ResultsBucketName` (store locally for validation steps).
- **Optional CLI retrieval** Use `aws cloudformation describe-stacks --stack-name hexcore-ai-test --query 'Stacks[0].Outputs' --output table` to re-fetch values on demand.

---

## Test Data

- Choose a valid `puuid` with recent matches.
- Set `region` for Riot Match V5 routing domain, e.g.:
  - americas: NA, LAN, LAS, BR
  - europe: EUW, EUNE, TR, RU
  - asia: KR, JP
- Choose a `year` and ensure the account has matches in that window.
- Generate a unique `sessionId` (UUID).

---

## Validation Checklist (Phases 1–8)

### 1) Infrastructure & Config (Phases 1–2)

- Verify CloudFormation outputs exist (see above).
- Confirm resources:
  - DynamoDB: `HexCore-Connections`, `HexCore-MatchData`, `HexCore-AnalysisResults`, `HexCore-Idempotency`.
  - SQS: `HexCore-MatchQueue` (+ DLQ).
  - S3: `hexcore-results-<accountId>`.
  - WebSocket API + `$connect`/`$disconnect` routes.
- Confirm environment variables in Lambda match template (`CONNECTIONS_TABLE`, `MATCH_DATA_TABLE`, `MATCH_QUEUE_URL`, `WEBSOCKET_ENDPOINT`, `IDEMPOTENCY_TABLE`).

### 2) WebSocket Connect Flow (Phase 4)

- Connect via WebSocket using outputs and query params:

```bash
wscat -c "<WebSocketURL>?sessionId=<UUID>&puuid=<PUUID>&region=<americas|europe|asia>&year=<YYYY>"
```

- Expectations:
  - HTTP 200 on connect.
  - Initial WebSocket message from `sendWebSocketUpdate()`:
    - `status: 'started'`, `message: 'Processing initiated'`, `progress: 0`, `totalMatches` present.
  - DynamoDB `HexCore-Connections` item created with `connectionId`, `sessionId`, `puuid`, `ttl` ≈ 2 hours.
- **Progress events** Keep `wscat` open and confirm follow-up `status:"processing"` messages include match counts and agent stage updates (Phase 10.7).

### 3) Match Ingestion & Idempotency (Phase 5)

- **Queue delivery** `aws sqs get-queue-attributes --queue-url <MatchQueueUrl> --attribute-names ApproximateNumberOfMessages ReceivedNumberOfMessages` should show activity during processing (Phase 10.4).
- **Processor logs** `sam logs -n HexCore-Match-Processor --stack-name hexcore-ai-test --tail` must show Zod validation, timeline fetch, DynamoDB writes, and EventBridge publishing (Phase 10.3).
- **Idempotency** Re-send a processed message via `aws sqs send-message` and confirm logs show idempotent short-circuit with no duplicate DynamoDB writes.

### 4) EventBridge → Step Functions Trigger (Phase 6)

- Confirm Step Functions execution starts on `match.filtered.ready` events.
- Logs:
  - Execution input contains `detail.keys`, `sessionId`, `matchId`, `puuid`.
- Error handling:
  - Verify retry policy (3 attempts, backoff) on Task failures.
- **Execution listing** `aws stepfunctions list-executions --state-machine-arn <StateMachineArn> --status-filter RUNNING` should reflect active runs (Phase 10.6).

### 5) Agent Orchestration Traces (Phase 7)

- Once agent orchestrators are implemented, verify:
  - WebSocket progress updates across 20–90% with tool-call trace messages.
  - CloudWatch logs for each orchestrator Lambda show reasoning/tool invocation traces.
- If not implemented yet, mark as pending and proceed to Phase 8 validation via a synthetic payload (optional):
  - Manually start Step Functions with a stub `agentResults` array to validate Phase 8 (see next section).

### 6) Results Synthesis Delivery (Phase 8)

- Expect WebSocket message with `status: 'processing'`, `message: 'Synthesizing results'`, `progress: 90`.
- On completion, expect final WebSocket message containing:
  - `status: 'complete'`, `resultId`, `s3Key`, `progress: 100`, and the full `synthesis` object (all agent outputs + summary).
- Storage checks:
  - S3 object written: `results/${puuid}/${matchId}.json` in `hexcore-results-<accountId>` with pretty JSON.
  - DynamoDB `HexCore-AnalysisResults` item for `resultId` with 90-day TTL.
- Idempotency check:
  - Re-run synthesizer with the same input; expect cached result with no duplicate S3/DDB writes.
- **S3 validation** `aws s3 ls s3://hexcore-results-<accountId>/results/ --recursive` should list new result objects (Phase 10.8).
- **Download spot-check** `aws s3 cp s3://.../{puuid}/{matchId}.json ./test-result.json` and confirm structure includes `agents` array, `summary`, and timestamps.
- **DynamoDB analysis index** Query `HexCore-AnalysisResults` via console or `aws dynamodb query --table-name HexCore-AnalysisResults --index-name PuuidIndex --key-condition-expression "puuid = :p" --expression-attribute-values '{":p":{"S":"<PUUID>"}}'` to verify records (Phase 10.9).

### 7) Data Integrity & TTLs (Phases 2, 5, 8)

- Confirm DDB TTL attributes set and visible in table settings.
- Spot-check `HexCore-MatchData` and `HexCore-AnalysisResults` items have correct keys, shapes, and TTL values.

### 8) Observability & Error Paths (Cross-cutting)

- **Correlation IDs** Ensure all log groups (`/aws/lambda/HexCore-WebSocket-Connect`, `/aws/lambda/HexCore-Match-Processor`, agents, synthesizer) emit `sessionId` for traceability (Phase 10.3).
- **Invalid connect params** Attempt malformed queries and confirm 400 responses plus structured error logs.
- **SQS schema failures** Inject malformed payloads and verify partial batch failures are returned and surfaced in logs (Phase 10.10).

### 9) CloudWatch Log Monitoring (Phase 10.3)

- **Tail logs** Use `sam logs -n <FunctionName> --stack-name hexcore-ai-test --tail` during flows to ensure INFO/ERROR output is structured JSON.
- **Saved queries** Capture CloudWatch Logs Insights queries for rapid triage.
- **Session correlation** Filter by `sessionId` to trace full execution path.

### 10) Queue Health & DLQ (Phase 10.4)

- **Queue metrics** Review SQS console metrics for `HexCore-MatchQueue` to confirm messages available decrease during processing.
- **DLQ sanity** `aws sqs get-queue-attributes --queue-url <DLQUrl> --attribute-names ApproximateNumberOfMessages` should remain `0` after success paths.
- **Alarm integration** Ensure CloudWatch alarm `HexCore-DLQ-Messages` remains OK (Phase 11.2).

### 11) DynamoDB Data Verification (Phase 10.5)

- **Match data** Explore `HexCore-MatchData` items, confirming `dataKey` format `match:{matchId}:puuid:{puuid}` and TTL values ~30 days.
- **Connections** Ensure the `HexCore-Connections` record includes `sessionId`, `connectionId`, and expires ~2 hours out.

### 12) Step Functions Execution Monitoring (Phase 10.6)

- **Execution graph** Use AWS Console to watch parallel branches complete successfully with green status.
- **Execution timing** Ensure per-match execution stays under 2 minutes; investigate red branches immediately.

### 13) WebSocket Progress Experience (Phase 10.7)

- **Progress cadence** Validate clients receive each stage (`started`, multiple `processing`, `complete`).
- **Reconnect handling** If connection drops, reconnect and ensure server resumes progress updates without duplicate processing.

### 14) S3 Result Integrity (Phase 10.8)

- **Key naming** Confirm S3 object keys align with `results/{puuid}/{matchId}.json` pattern.
- **JSON schema** Verify summary fields (overallScore, strengths, improvements) exist and match DynamoDB record.

### 15) Analysis Indexing & Queries (Phase 10.9)

- **PuuidIndex** Query DynamoDB GSI to guarantee per-player retrieval works.
- **Result linkage** Ensure `s3Key` attributes in DynamoDB match stored S3 objects.

### 16) Error Handling & DLQ Exercises (Phase 10.10)

- **Invalid payload** Send an intentionally bad message and confirm processor retries then moves record to DLQ after 5 attempts.
- **Alarm trigger** Observe `HexCore-DLQ-Messages` transitions to ALARM, then purge DLQ and watch state return to OK.
- **Postmortem data** Confirm logs capture error stack traces and correlation IDs for quick diagnosis.

### 17) Load & Performance Validation (Phase 10.11)

- **Concurrent sessions** Run scripted load (e.g., Node.js loop) with 50–100 parallel WebSocket connections.
- **Throughput monitoring** Track Lambda concurrency, Step Functions executions, and SQS backlog to ensure the system clears within 3–5 minutes for 100 matches.
- **Bottleneck review** Adjust concurrency limits or batch sizes if throttling occurs.

### 18) Alarm & Dashboard Verification (Phase 11.1–11.2)

- **Dashboard review** Confirm the CloudWatch dashboard `HexCore-AI-Monitoring` contains widgets for SQS, Lambda, DynamoDB, Step Functions, and refreshes every minute.
- **Alarm configuration** Inspect `HexCore-DLQ-Messages` and `HexCore-Queue-Age` to verify thresholds and SNS targets.
- **Notification path** Trigger a test alarm to confirm emails/SMS (if configured) arrive quickly (requires SNS setup from Phase 11.3).

### 19) X-Ray & Tracing Validation (Phase 11.4)

- **Service map** Ensure API Gateway → Lambda → DynamoDB/SQS/EventBridge edges appear in X-Ray.
- **Trace sampling** Inspect traces for cold-start durations and external calls to Riot API.
- **Bottleneck identification** Document any spans exceeding latency SLAs for follow-up.

### 20) Performance & Cost Optimization (Phase 12.1–12.3)

- **Lambda memory** Use Logs Insights query to compare provisioned vs max memory usage; adjust template values if usage <50%.
- **SQS batch tuning** Review average processor duration; modify `BatchSize` in template to balance throughput and timeouts.
- **Cost review** Run Cost Explorer reports filtered to HexCore services and calculate cost per analysis (<$0.50 target).

### 21) Security & Resilience Validation (Phase 12.4, 13.2–13.4)

- **IAM least privilege** Audit roles (`hexcore-ai-test-*-role-*`) for overly broad permissions and remediate.
- **Secrets access** Confirm only required Lambdas can read the Riot API key secret.
- **Backups & versioning** Enable and verify DynamoDB PITR and S3 versioning policies for test (and later prod) environments.
- **API auth** Decide on IAM or API key gating before production promotion; test unauthorized attempts are rejected.

### 22) Production Smoke Test Preparation (Phase 13.1)

- **Production config** Populate `samconfig.toml` with production environment settings.
- **Dry run** Consider deploying to a production stack and repeating key validation steps before launch.

### 23) End-to-End Validation (Phase 14.1)

- **Full flow** Execute an end-to-end session covering >50 matches, ensuring all agents produce outputs and final synthesis arrives.
- **Edge cases** Test low-match, high-match, different region/year combinations, and observe correct behavior.
- **Data quality** Confirm recommendations align with expectations and formatting is clean.

### 24) System Health Check (Phase 14.2)

- **Inventory scripts** Run provided AWS CLI loops to confirm all Lambdas, DynamoDB tables, and SQS queues respond without error.
- **Alarm scan** `aws cloudwatch describe-alarms --state-value ALARM` should return empty during steady state.
- **Recent errors** Filter Logs Insights for ERROR entries within the last hour and address any findings.

### 25) Cost & Documentation Review (Phase 14.3–14.4)

- **Weekly cost report** Capture service-by-service breakdowns and compare to budget expectations.
- **Documentation audit** Ensure README, architecture, troubleshooting, and operational guides reflect the deployed system.
- **Diagram updates** Refresh system diagrams and note any deviations from planned architecture.

### 26) Optional Test Environment Cleanup (Phase 14.5)

- **Stack deletion** If the test stack is no longer needed, run `sam delete --stack-name hexcore-ai-test` after backing up artifacts.
- **Orphan check** Use `aws resourcegroupstaggingapi get-resources --tag-filters Key=aws:cloudformation:stack-name,Values=hexcore-ai-test` to ensure no residual resources remain.

---

## Success Criteria

- WebSocket lifecycle: connect → progress messages → final synthesis → client closes.
- SQS ingestion and DDB writes are idempotent; no duplicates on retries.
- EventBridge triggers Step Functions with correct payload.
- S3 and DynamoDB contain the expected outputs with correct keys and TTLs.
- CloudWatch logs and correlation IDs trace the full request path.
- All alarms remain in OK state during nominal load; alarms trigger and recover appropriately during fault injection.
- Load tests with ≥50 concurrent sessions complete within defined SLAs and without DLQ accumulation.
- Cost, security, and documentation reviews are complete with action items captured.

---

## Rollback and Cleanup

- Close WebSocket client after `status: 'complete'`.
- Allow TTL to expire test data or manually delete test items/objects if needed.
- Optionally delete the test stack with `sam delete --stack-name hexcore-ai-test` after preserving logs and artifacts.
- Remove temporary load-test assets and ensure alarms return to OK after fault-injection exercises.

---

## References

- Phase 4 Connect Handler: `docs/phases/phase-04/task-41-implement-websocket-connect-handler.md`
- Match Processor: `docs/phases/phase-05/task-51-implement-match-processor-lambda.md`
- Step Functions Definition: `docs/phases/phase-06/task-61-create-step-functions-definition.md`
- Synthesizer Lambda: `docs/phases/phase-08/task-81-implement-synthesizer-lambda.md`
- SAM Template: `apps/aws/template.yaml`
- Local Handler Validation: `docs/phases/phase-04/task-43-build-and-test-websocket-handlers-locally.md`
- Match Processor Validation: `docs/phases/phase-05/task-52-build-and-validate-match-processor.md`
- Deployment Tasks: `docs/HexCoreAI_dev_implementation_guide.md` Phase 9
- Testing & Validation Tasks: `docs/HexCoreAI_dev_implementation_guide.md` Phase 10
- Observability Tasks: `docs/HexCoreAI_dev_implementation_guide.md` Phase 11
- Optimization & Security Tasks: `docs/HexCoreAI_dev_implementation_guide.md` Phase 12–13
- Final Verification Tasks: `docs/HexCoreAI_dev_implementation_guide.md` Phase 14
