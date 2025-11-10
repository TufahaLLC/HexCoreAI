# Task 8.3: Finalize Synthesizer Handler & Client Delivery

**Status**: ✅ Complete

Connect the Step Functions entry point to the idempotent synthesis core, emit WebSocket updates, and harden observability/error handling.

**Dependencies:** Task 8.1 (infrastructure/scaffold) and Task 8.2 (synthesis core) must be complete.

**Subtasks:**
- [x] Import `synthesizeResultsIdempotent` from the synthesis core module
- [x] Parse the incoming Step Functions payload using `synthesizerInputSchema.parse(event)`
- [x] Extract `sessionId` for logging context and WebSocket operations
- [x] Send a WebSocket progress update at 90% via `sendWebSocketUpdate(sessionId, {...})`
- [x] Invoke `synthesizeResultsIdempotent(validatedInput)` and capture `{ resultId, s3Key, synthesis }`
- [x] Send the completion WebSocket message including status, message, progress=100, `resultId`, `s3Key`, and the `synthesis` object
- [x] Return `{ resultId, s3Key }` to Step Functions so downstream steps can reference storage keys
- [x] Wrap the handler in try/catch blocks that:
  - [x] Log validation errors with Powertools Logger and throw `Invalid synthesizer input`
  - [x] Log unexpected errors with stack traces and rethrow for Step Functions retries
  - [x] Ensure correlation IDs (sessionId) are included in all log entries
- [x] Add TODO or placeholder unit test references (optional) to encourage future coverage

**Deliverables:**
- `src/aggregation/synthesizer.ts` handler fully implemented, invoking the idempotent core and managing WebSocket notifications
- Error handling differentiates between Zod validation failures and operational errors
- Progress/completion messages mirror examples defined in `phase-08/README.md`

**Validation:**
- Run integration tests (manual or automated) by invoking the handler with sample payloads to confirm WebSocket messages and returned values.
- Confirm CloudWatch logs show correlation IDs for both progress and completion paths.
- Verify behavior under retries: repeated calls should hit the idempotent cache and still send the completion payload.
