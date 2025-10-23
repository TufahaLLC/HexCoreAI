# Task 8.4: Enable Cached Analysis Short-Circuit

**Status**: ✅ Complete

## Overview

Extend the WebSocket connect handler so returning clients can reuse an existing analysis for the same `puuid`/`region`/`year` instead of triggering a full reprocessing cycle. This protects downstream services from unnecessary load and reduces wait time for users who reconnect shortly after a successful run.

---

## Objectives

- Detect previously completed analyses before enqueuing new match-processing work.
- Surface cached results to the client via WebSocket, including metadata and synthesis payload.
- Preserve current behavior when no cached result exists.

---

## Subtasks

### 8.4.1: Expose Cached Result Lookup Utilities

- [x] Add environment variables for `ANALYSIS_RESULTS_TABLE` and `RESULTS_BUCKET` to `apps/aws/template.yaml` and the connect Lambda configuration.
- [x] Grant the connect Lambda IAM permissions to read from `AnalysisResultsTable` (Query/GetItem) and `ResultsBucket` (GetObject).
- [x] Implement `findCachedAnalysis({ puuid, region, year })` in `apps/aws/src/shared/cache.ts` (new file) that:
  - [x] Queries DynamoDB `PuuidIndex` using a composite key like `regionYear = "${region}#${year}"`.
  - [x] Returns early when no items exist.
  - [x] Fetches the S3 object referenced by `s3Key` and parses the synthesis payload when metadata is found.

### 8.4.2: Integrate Lookup into WebSocket Connect Handler

- [x] Import the new cache helper within `apps/aws/src/websocket/connect.ts`.
- [x] After validating query parameters, call `findCachedAnalysis` prior to idempotent match enqueueing.
- [x] When cached data is available:
  - [x] Send a WebSocket message indicating reuse (status `completed`, message `"Analysis already available"`, plus `resultId`, `s3Key`, `synthesis`).
  - [x] Return `{ statusCode: 200, body: "Analysis already completed" }` without touching SQS.
- [x] When no cache is found, proceed with existing enqueue logic unchanged.

### 8.4.3: Testing & Verification

- [ ] Add unit tests covering cached-hit and cache-miss paths (mock DynamoDB and S3) for `findCachedAnalysis` and the connect handler.
- [ ] Update any integration test fixtures to include `regionYear` data in DynamoDB records and S3 synthesis payloads.
- [ ] Verify Powertools logging includes `correlationId` for cached responses.

---

## Deliverables

- Updated infrastructure definitions and connect handler logic that short-circuit repeated analyses within the specified scope.
- Supporting cache utility module with test coverage.
- Documentation updates reflecting the new behavior (Phase 4 Task 4.1 notes + API usage guidance).

---

## Acceptance Criteria

1. Reconnecting clients with the same `sessionId`, `puuid`, `region`, and `year` receive cached results immediately instead of triggering match ingestion.
2. New or unmatched combinations follow the original processing pipeline with no regressions.
3. CloudWatch logs show a concise trace for the cached path (no SQS or Riot API activity).
4. Automated tests demonstrate both cached and uncached scenarios.
