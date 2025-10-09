# Task 8.2: Build Idempotent Synthesis Core

Implement the core aggregation logic that validates agent outputs, performs summary generation, and persists results to S3 and DynamoDB with idempotent safeguards.

**Dependencies:** Task 8.1 must be completed so the SAM function, environment variables, and TypeScript scaffold exist.

**Subtasks:**
- [ ] Import AWS SDK clients, Powertools utilities, and Zod schemas into `src/aggregation/synthesizer.ts`
- [ ] Initialize shared clients (`DynamoDBDocumentClient`, `S3Client`) and Powertools Logger
- [ ] Configure `DynamoDBPersistenceLayer` for idempotency using `process.env.IDEMPOTENCY_TABLE`
- [ ] Extend the placeholder synthesis module with:
  - [ ] `interface SynthesizerInput` and `type AgentAnalysisResult`
  - [ ] `synthesizerInputSchema` and `agentAnalysisResultSchema` imports from `../shared/schemas`
  - [ ] `generateSummary()`, `calculateOverallScore()`, `identifyStrengths()`, and `identifyImprovements()` helper stubs (return placeholder values for now)
- [ ] Implement `synthesizeResultsIdempotent = makeIdempotent(...)` that:
  - [ ] Captures `const now = Date.now()` once and reuses it for `timestamp`, `resultId`, `createdAt`, and TTL calculations
  - [ ] Validates each agent result with `agentAnalysisResultSchema` and skips invalid entries with logged warnings
  - [ ] Builds the `synthesis` object containing metadata, agents, and summary
  - [ ] Writes the synthesis JSON to S3 at `results/${puuid}/${matchId}.json` with pretty formatting
  - [ ] Writes the summary record to DynamoDB `AnalysisResultsTable` using `ConditionExpression attribute_not_exists(resultId)`
  - [ ] On DynamoDB failure, attempts to delete the S3 object, logs both the primary and rollback errors, and rethrows to signal retry
- [ ] Ensure the idempotent function returns `{ resultId, s3Key, synthesis }`
- [ ] Export the idempotent function for use by Task 8.3 handler logic (e.g., `export { synthesizeResultsIdempotent }`)

**Deliverables:**
- `src/aggregation/synthesizer.ts` contains the fully implemented idempotent synthesis core with shared timestamp handling and persistence safeguards.
- Comprehensive logging around validation, S3 writes, DynamoDB writes, and rollback attempts.
- No direct WebSocket calls or handler logic yet (reserved for Task 8.3).

**Validation:**
- Run unit tests (to be added) or temporary script to ensure the idempotent function can be invoked with mocked clients.
- Verify logs include `correlationId` derived from `sessionId`.
- Confirm that repeated invocations with the same payload hit the idempotency cache without duplicate writes.
