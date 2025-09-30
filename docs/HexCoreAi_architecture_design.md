# Based on our discussion about architecture, create a detailed architectural design using the proposed flow.

The recommended design is an event-driven pipeline: Next.js on Amplify enqueues yearly match IDs to SQS, a Lambda consumes in batches of 10 to fetch and filter Riot data, writes filtered slices to MemoryDB, then publishes a “match.filtered.ready” event that starts a Step Functions workflow which fans out to the multi-agent analysis and persists results durably. This approach decouples ingestion from analysis, enables robust retries and parallelism, and lets agents read minimal, cached fields with low latency from MemoryDB inside a VPC.

### Architecture diagram

![Proposed architecture for yearly match processing and multi-agent analysis](https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/76e784c4449abc1333ba8ec0c4cb40ff/420077e0-0584-4119-941f-759fc73ad459/3f25fb9a.png)

Proposed architecture for yearly match processing and multi-agent analysis

### Components

- Amplify Next.js API: API route resolves yearly MATCH-V5/ids for a PUUID and enqueues one SQS message per match with metadata such as matchId, puuid, region, and year to decouple fetching from processing.
- SQS (standard) with DLQ: Buffers match work items, scales consumers automatically, and isolates bursts; a redrive policy routes poison messages to a DLQ after maxReceiveCount.
- Lambda (SQS trigger): Processes batches of 10 messages, fetches MATCH-V5 and TIMELINE, filters to agent-required fields, writes to MemoryDB, and emits an EventBridge event for orchestration.
- MemoryDB (filtered cache): Stores per-match/per-participant filtered slices as low-latency keys read by agents, with VPC access and TLS via Lambda-attached ENIs.
- EventBridge: Receives “match.filtered.ready” events from the Lambda and starts a Step Functions execution with the relevant MemoryDB keys and metadata.
- Step Functions: Orchestrates parallel agent Lambdas (Build, Combat, Vision, Economy, Champions, Competitive), aggregates results, and writes final artifacts to S3/DynamoDB with retries and timeouts.
- Durable storage: S3/DynamoDB persists agent outputs and synthesized reports for long-term retrieval and downstream analytics.

### End-to-end flow

1. Client calls Amplify API with PUUID and year; API paginates MATCH-V5/ids and enqueues messages: {matchId, puuid, region, year} to SQS to decouple upstream enumeration from downstream processing.
2. SQS triggers Lambda with batchSize=10; the poller delivers up to 10 records per invocation for efficient network and CPU utilization.
3. Lambda fetches MATCH-V5 and TIMELINE for those 10 matches, applies backoff on transient errors, filters to minimal agent fields (items, gold, KDA, damage, vision, CS, timeline metrics, rank metadata), and writes to MemoryDB keys such as match:{matchId}:puuid:{puuid}.
4. After successful writes, Lambda publishes an EventBridge event “match.filtered.ready” with the list of MemoryDB keys, match metadata, and processing status to trigger orchestration.
5. Step Functions starts and fans out to agent tasks (Parallel/Map) that read filtered slices from MemoryDB, produce agent outputs, then a synthesis step aggregates and persists results to S3/DynamoDB with per-state timeouts and retries.

### Data contracts

```
- SQS message: {"matchId":"<id>","puuid":"<puuid>","region":"<platform>","year":2025} to provide all data needed for Lambda fetch and key construction without additional lookups.
```

- EventBridge event: detail contains keys:[“match:{id}:puuid:{puuid}”], region, matchId, year, and a schemaVersion to allow Step Functions and agents to read consistent payloads.
- MemoryDB schema: Redis hashes per participant with fields grouped by agent (build, combat, vision, economy, championMeta) to minimize over-fetch and enable partial reads under tight SLAs.

### Key configurations

- SQS: Standard queue; visibilityTimeout set to 2–6× Lambda timeout; DLQ redrive policy with maxReceiveCount=5; short delivery delay if upstream bursts are expected.
- Lambda SQS mapping: batchSize=10, optional maximumBatchingWindow=0–5s for micro-batching, FunctionResponseTypes=ReportBatchItemFailures for partial success, reserved concurrency to cap downstream pressure.
- MemoryDB access: Lambda and agent functions run in private subnets with security groups allowing TLS Redis to the MemoryDB cluster; reuse VPC configs across ingestion and agent Lambdas.
- Step Functions: Express for high-volume per-match orchestration or Standard if executions will span long durations; use per-task timeouts and Catch/Retry for resilience.

### Error handling and retries

- Partial batch failure: Lambda returns batchItemFailures only for failed SQS records so successful messages are deleted while failed ones are retried, improving throughput and avoiding reprocessing of the whole batch.
- DLQs: Poison messages route to the DLQ, with CloudWatch alarms on DLQ depth and SQS backlog to ensure timely intervention.
- Orchestration-level retries: Step Functions defines Retry/Catch per agent task to handle transient API or MemoryDB issues without failing the entire workflow.

### Idempotency and ordering

- Idempotent writes: Use matchId and puuid to construct keys and guard with SETNX or versioned hashes to avoid duplicates on retries or partial failures.
- Queue ordering: Standard SQS is preferred for scale; any per-match ordering requirements are handled within Step Functions or by key versioning rather than FIFO constraints.

### Security and IAM

- IAM: Amplify API role with sqs:SendMessage; Lambda role with sqs:ReceiveMessage/DeleteMessage and MemoryDB network access; Step Functions role to invoke agents and write to storage; least-privilege throughout.
- Network: MemoryDB accessible only via VPC private subnets and constrained security groups; no public exposure; enforce TLS and Redis ACLs for data plane security.

### Observability

- Metrics and logs: Monitor SQS ApproximateNumberOfMessagesVisible, Lambda concurrency, iterator age, partial failures, Step Functions execution success/failure, and MemoryDB CPU/latency to detect hotspots.
- Tracing/utilities: Use AWS Powertools batch utilities to simplify SQS batch handling, add structured logs per record, and include correlation IDs from message attributes through to agent outputs.

### Performance notes

- Batching: Ten-per-invocation balances external API round trips and function duration; adjust based on Riot API latency and rate limits while keeping headroom in visibility timeout.
- Cache-first agents: Agents read minimal filtered slices from MemoryDB rather than raw match payloads, improving latency and reducing repeated external API calls for analysis.

### Example Step Functions outline

- Start execution on EventBridge rule match.filtered.ready; Map over keys with concurrency controls; each item invokes the appropriate agent task to read from MemoryDB and emit output; a final Task aggregates and persists results with explicit timeouts.
- Prefer Express Workflows for high-volume short tasks; switch to Standard for long-running or audit-heavy runs, following cost and execution-history best practices.

### Example Lambda handler pattern

- Iterate SQS records; for each, fetch match and timeline, filter to agent fields, write to MemoryDB, collect failures, and return batchItemFailures to enable partial success semantics.
- Use VPC-enabled Lambda to connect to MemoryDB securely and reuse connections where possible to minimize cold-start overhead in high-throughput scenarios.

This detailed design keeps ingestion fast and resilient via SQS+Lambda, centralizes filtered data in MemoryDB for ultra-low-latency agent reads, and uses Step Functions for clean fan‑out orchestration with robust retries and timeouts across the multi-agent flow.
