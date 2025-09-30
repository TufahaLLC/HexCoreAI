# HexCore AI Implementation Plan

## Purpose

Document the locally developable pieces of the HexCore AI pipeline described in `docs/HexCoreAi_architecture_design.md`, aligning the Next.js project with the eventual AWS deployment.

## Local Components to Implement

### Real-time progress (WebSockets)

- **WebSocket API**: Configure an API Gateway WebSocket with `$connect`, `$disconnect`, `$default`, and `routeSelectionExpression=$request.body.action`, plus a custom `progress` route.
- **Connection management**: Use `$connect`/`$disconnect` Lambdas to persist `connectionId` values and enforce IAM or authorizer-based protection on `$connect`.
- **Progress publishing**: Allow ingestion, agent, and synthesis Lambdas or Step Functions to push updates via `ApiGatewayManagementApi.post_to_connection` with standardized payloads.
- **Platform constraints**: Respect the 128 KB message payload, 32 KB frame size, 2-hour connection cap, and 10-minute idle timeout limits.
- **Operations**: Retry transient publish failures, prune stale `connectionId` records, and emit metrics/alarms for publish failures and connection churn.

- **Riot data access layer (`src/lib/riot/`)**
  Extract RIOT API calls from `src/app/api/matches/route.ts` into helpers (`getPUUID()`, `getMatchIds()`, `getMatchDetails()`, `getTimeline()`). Provide shared typing, rate-limit error handling, and optional caching hooks.

- **Match filtering module (`src/lib/match/filter.ts`)**
  Encapsulate `filterMatchData()` logic plus timeline shaping. Export TypeScript types (e.g., `FilteredMatch`, `FilteredParticipant`, `TimelineSlice`), and add unit tests to ensure deterministic filtering.

- **Queue abstraction (`src/lib/queue/sqsClient.ts`)**
  Implement a local interface (`enqueueMatchWorkItem()`, `dequeueBatch()`), backed by LocalStack SQS or an in-memory queue for now. Supports the handoff from the API layer to the ingestion worker.

- **Ingestion worker (`src/workers/ingestionWorker.ts`)**
  Create a script or serverless-style handler that processes batches of queued messages, calls the Riot data layer, filters results, and writes slices to Redis. Mirrors the Lambda responsibilities.

- **Redis schema helpers (`src/lib/memorydb/`)**
  Wrap `src/lib/redis.ts` with functions like `writeFilteredMatchSlice()` and `readParticipantSlice()`. Enforce key shapes such as `match:{matchId}:puuid:{puuid}` and attach data-contract typings.

- **Event payload definitions (`src/types/events.ts`)**
  Define interfaces for `MatchFilteredReadyEvent`, agent result payloads, and supervisor aggregation outputs to keep the pipeline consistent.

- **Agent stubs (`src/agents/`)**
  Scaffold placeholder modules (`buildAgent.ts`, `combatAgent.ts`, etc.) that read filtered Redis slices and return mock analyses. These will be swapped with real Bedrock Agents later.

- **Supervisor orchestrator (`src/lib/orchestration/supervisor.ts`)**
  Implement a coordinator that receives filtered keys, invokes agent stubs in parallel, aggregates outputs, and returns a combined analysis object.

- **Analysis API route (`src/app/api/analysis/route.ts`)**
  Provide an endpoint to trigger the supervisor orchestrator and deliver aggregated results to the front end or external consumers.

- **Frontend view (`src/app/page.tsx`)**
  Add client components to request analysis, display filtered data previews, and show aggregated insights.

## Implementation Phases

1. **Phase 1 – Data Access & Filtering**

   - [x] **Extract Riot client module**: Completed in `src/lib/riot/client.ts`, which centralizes base URLs, shared retry logic, and helpers such as `getPUUID()`, `getMatchIds()`, `getMatchDetails()`, and `getMatchTimeline()`.
   - [x] **Refactor matches API route**: `src/app/api/matches/route.ts` now consumes the Riot client helpers, simplifying the handler and returning enqueue metadata instead of raw match payloads.
   - [x] **Enqueue match work items**: Each match ID from the past year is wrapped as `{ matchId, puuid, region, year, schemaVersion }` and passed to the new queue abstraction via `enqueueMatchWorkItem()`.
   - [x] **Design filtering interfaces**: Implemented in `src/lib/match/filter.ts` with `FilteredMatch`, `FilteredParticipant`, and `TimelineSlice` typings plus helpers to build timeline slices.
   - [x] **Cover transformation with tests**: Added `src/lib/match/filter.test.ts` (Vitest) to validate filtering, timeline extraction, and no-op behavior on malformed inputs. The `package.json` test script runs these checks.

2. **Phase 2 – Queue & Ingestion Worker**

   - [ ] **Implement queue abstraction**: add `src/lib/queue/sqsClient.ts` supporting enqueue/dequeue semantics and a pluggable in-memory driver for local dev.
   - [ ] **Define worker configuration**: specify batch size, backoff, and failure handling options in a shared config module.
   - [ ] **Build ingestion worker**: create `src/workers/ingestionWorker.ts` that reads batches, fetches match/timeline data, applies filters, and writes Redis slices.
   - [ ] **Extend Redis helpers**: add `src/lib/memorydb/` functions for upserting participant hashes and verifying key schemas.
   - [ ] **Emit progress events**: have ingestion and downstream workers call `ApiGatewayManagementApi.post_to_connection` with standardized payloads to update connected clients.

3. **Phase 3 – Agent Stubs & Orchestration**

   - [ ] **Scaffold agent modules**: add `src/agents/buildAgent.ts`, `combatAgent.ts`, etc., each exposing an `analyze()` returning mocked insights from Redis data.
   - [ ] **Implement supervisor orchestrator**: create `src/lib/orchestration/supervisor.ts` to fan out over agent modules, aggregate results, and propagate errors.
   - [ ] **Expose analysis API**: add `src/app/api/analysis/route.ts` that receives match keys, invokes the supervisor orchestrator, and returns the combined payload.
   - [ ] **Document event handling**: update `src/types/events.ts` with request/response contracts used between API, worker, and agents.

4. **Phase 4 – UI & Reporting**
   - [ ] **Build analysis trigger UI**: enhance `src/app/page.tsx` with a form to enqueue work items or request analysis runs.
   - [ ] **Display pipeline status**: create components showing queue depth, worker progress, and last analysis timestamp (mocked initially) and subscribe to the WebSocket `progress` route for live updates.
   - [ ] **Render agent outputs**: design cards/tables to present each agent’s summary and a synthesized overview using sample data.
   - [ ] **Validate UX through smoke test**: script an end-to-end flow that enqueues data, processes it locally, and surfaces the results in the UI.

## Data Contracts & Types

- **Queue Message**

  ```ts
  type MatchWorkItem = {
    matchId: string;
    puuid: string;
    region: string;
    year: number;
    schemaVersion: number;
  };
  ```

- **Redis Schema**
  Store filtered slices under keys like `match:{matchId}:puuid:{puuid}` with hash fields grouped by agent domain (build, combat, economy, vision, championMeta).

- **Event Payload**
  ```ts
  interface MatchFilteredReadyEvent {
    detailType: "match.filtered.ready";
    detail: {
      keys: string[];
      matchId: string;
      puuid: string;
      region: string;
      year: number;
      schemaVersion: number;
    };
  }
  ```

## Local Testing Approach

- **Mocked Queue Runner**
  Provide `npm run process-queue` that invokes `src/workers/ingestionWorker.ts` against a local queue.

- **Redis**
  Use Dockerized Redis or Elasticache-compatible MemoryDB mock; load environment variables via `.env.local`.

- **Unit Tests**
  Focus initial coverage on `src/lib/match/filter.ts`, queue utilities, and orchestrator fan-out behavior.

- **Integration Smoke Test**
  Script: enqueue a sample set of matches, run the worker, call the analysis API, and verify aggregated output shape.

## Transition to AWS

- **Replace queue abstraction with real SQS** by configuring AWS SDK clients and IAM.
- **Deploy ingestion worker as Lambda** triggered by SQS.
- **Swap Redis helper config with MemoryDB endpoints** and TLS settings.
- **Connect supervisor orchestrator to Step Functions** by invoking executions instead of local Promise maps.
- **Persist agent outputs to S3/DynamoDB** before returning final responses.

## Next Steps

1. Set up `src/lib/riot/` and port existing API calls.
2. Implement `src/lib/match/filter.ts` with tests.
3. Introduce queue abstraction and ingestion worker skeleton.
4. Scaffold agent stubs and supervisor orchestrator to enable end-to-end local flow.
