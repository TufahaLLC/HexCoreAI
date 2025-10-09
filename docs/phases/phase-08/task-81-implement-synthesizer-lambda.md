# Task 8.1: Configure Synthesizer Infrastructure

Prepare the Synthesizer Lambda by defining its SAM resources, wiring environment variables, and creating a scaffolded handler ready for later implementation.

**Subtasks:**
- [ ] Define `SynthesizerFunction` in `apps/aws/template.yaml`
  - [ ] Set handler: `aggregation/synthesizer.handler`
  - [ ] Set timeout: 60 seconds, memory: 1024MB
  - [ ] Attach Powertools logger layer reference
  - [ ] Add DynamoDB CRUD policies for `AnalysisResultsTable`, `ConnectionsTable`, and `IdempotencyTable`
  - [ ] Add S3 CRUD policy for `ResultsBucket`
  - [ ] Add API Gateway `execute-api:ManageConnections` policy scoped to the WebSocket API
  - [ ] Expose environment variables for all referenced resources (`RESULTS_BUCKET`, `ANALYSIS_RESULTS_TABLE`, `IDEMPOTENCY_TABLE`, `CONNECTIONS_TABLE`, `WEBSOCKET_ENDPOINT`)
- [ ] Ensure the SAM template exports any new outputs required for validation in Phase 9
- [ ] Create `src/aggregation/synthesizer.ts` with placeholder handler and TODO comments referencing Tasks 8.2 and 8.3
- [ ] Add Powertools logger/idempotency initialization stubs so follow-up tasks only need to fill logic
- [ ] Update `tsconfig.json`/esbuild entry points if needed to include the new file
- [ ] Document the new function in `apps/aws/README.md` (if applicable) so deployment scripts capture it

**Deliverables:**
- SAM template includes the Synthesizer Lambda definition with correct IAM and environment wiring
- TypeScript file created with scaffolding comments for later implementation
- No business logic written yet; stubs should throw or mark TODOs pointing to Tasks 8.2 & 8.3

**Next Steps:**
- Implement aggregation and storage logic in `task-82-build-synthesis-core.md`
- Finalize handler behavior and WebSocket delivery in `task-83-finalize-synthesizer-handler.md`
