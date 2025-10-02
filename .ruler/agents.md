# HexCore AI - League of Legends Match Analysis Platform

## Project Overview

HexCore AI is a serverless, event-driven platform that analyzes League of Legends match data using multi-agent AI analysis. The system fetches match data from Riot's API, processes it through specialized AI agents, and delivers real-time insights via WebSocket to a Next.js web application.

**Key Features**:
- Real-time match analysis with WebSocket progress updates
- Multi-agent AI system (6 specialized agents analyzing different game aspects)
- Serverless architecture on AWS (API Gateway, Lambda, DynamoDB, Step Functions)
- Modern Next.js frontend with TailwindCSS and shadcn/ui components

## Architecture

### High-Level Flow
```
Next.js Client → API Gateway WebSocket → Lambda (Connect) → SQS Queue
                                                              ↓
                                                    Lambda (Match Processor)
                                                              ↓
                                                    DynamoDB (Filtered Data)
                                                              ↓
                                                    EventBridge → Step Functions
                                                              ↓
                                            6 Agent Lambdas (Parallel Analysis)
                                                              ↓
                                                    Aggregation & Synthesis
                                                              ↓
                                                    Final Results (S3/DynamoDB)
```

### Core Components
1. **Next.js Web App** (`apps/web`): User-facing application with WebSocket client
2. **AWS Backend** (`apps/aws`): SAM-based serverless infrastructure with TypeScript Lambdas
3. **6 AI Agents**: Build, Combat, Vision, Economy, Champion Meta, Competitive Insight analyzers
4. **WebSocket API**: Real-time bidirectional communication for progress updates
5. **Event-Driven Pipeline**: SQS → EventBridge → Step Functions orchestration

## Monorepo Structure

```
HexCoreAI/
├── apps/
│   ├── web/                    # Next.js 15 frontend (port 3001)
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router pages
│   │   │   ├── components/    # React components (shadcn/ui)
│   │   │   └── lib/           # Utilities and helpers
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── aws/                    # AWS SAM backend (TypeScript)
│   │   ├── template.yaml      # SAM IaC template
│   │   ├── samconfig.toml     # SAM CLI configuration
│   │   ├── package.json       # TypeScript dependencies
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── websocket/
│   │   │   │   ├── connect.ts       # WebSocket $connect handler
│   │   │   │   └── disconnect.ts    # WebSocket $disconnect handler
│   │   │   ├── processor/
│   │   │   │   └── matchProcessor.ts  # SQS-triggered match fetcher
│   │   │   ├── agents/
│   │   │   │   ├── buildAgent.ts          # Build optimization
│   │   │   │   ├── combatAgent.ts         # Combat analysis
│   │   │   │   ├── visionAgent.ts         # Vision control
│   │   │   │   ├── economyAgent.ts        # Economy management
│   │   │   │   ├── championAgent.ts       # Champion meta
│   │   │   │   └── competitiveAgent.ts    # Competitive insights
│   │   │   ├── aggregation/
│   │   │   │   └── synthesizer.ts   # Results aggregation
│   │   │   ├── shared/
│   │   │   │   ├── websocketClient.ts  # WebSocket utilities
│   │   │   │   ├── riotApi.ts          # Riot API client
│   │   │   │   └── types.ts            # Shared TypeScript types
│   │   │   └── layers/
│   │   │       └── nodejs/        # Lambda layer (shared deps)
│   │   └── statemachine/
│   │       └── multi-agent-orchestration.asl.json
│   │
│   └── fumadocs/               # Documentation site (Fumadocs)
│
├── docs/                       # Architecture & implementation guides
│   ├── HexCoreAi_architecture_design.md
│   ├── HexCoreAI_assistant_implementation_guide.md
│   └── HexCoreAI_dev_implementation_guide.md
│
├── package.json               # Root workspace config
├── pnpm-workspace.yaml        # pnpm workspaces
├── turbo.json                 # Turborepo config
└── biome.json                 # Biome linter config
```

## Technology Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 15.5 with App Router, React 19, Turbopack
- **Styling**: TailwindCSS 4.1, shadcn/ui components, Lucide icons
- **State**: TanStack React Query, TanStack React Form
- **Validation**: Zod
- **Theme**: next-themes (dark mode support)
- **Notifications**: Sonner toasts

### Backend (`apps/aws`)
- **IaC**: AWS SAM (CloudFormation-based)
- **Runtime**: Node.js with TypeScript
- **Services**:
  - API Gateway WebSocket API
  - Lambda (Connect, Disconnect, Match Processor, 6 Agents, Synthesizer)
  - DynamoDB (Connections, MatchData tables with TTL)
  - SQS (Standard queue + DLQ)
  - EventBridge (event routing)
  - Step Functions Express (orchestration)
  - S3 (final results storage)
  - Secrets Manager (Riot API key)
  - CloudWatch (logging, metrics, alarms)
  - X-Ray (tracing)

### Development Tools
- **Monorepo**: Turborepo with pnpm workspaces
- **Linting**: Biome, Ultracite
- **Git Hooks**: Husky with lint-staged
- **Package Manager**: pnpm 10.15.0

## AWS Backend Architecture Details

### WebSocket Connection Flow
1. Client connects: `wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}?sessionId={uuid}&puuid={puuid}`
2. **connect.ts**: Stores connectionId in DynamoDB, enqueues match IDs to SQS, sends "started" update
3. **matchProcessor.ts**: Batches 10 matches, fetches from Riot API, filters data, writes to DynamoDB, publishes EventBridge event, sends progress updates
4. **EventBridge → Step Functions**: Triggers multi-agent orchestration per match
5. **6 Agent Lambdas**: Run in parallel, each analyzing specific domain (build/combat/vision/etc)
6. **synthesizer.ts**: Aggregates agent outputs, writes final results to S3/DynamoDB
7. **disconnect.ts**: Cleanup on WebSocket close

### Key Patterns
- **Batch Processing**: SQS batches of 10 with partial failure handling (`batchItemFailures`)
- **Event-Driven**: EventBridge decouples ingestion from analysis
- **Real-Time Updates**: WebSocket messages sent at each stage (data fetch, agent completion, synthesis)
- **Error Handling**: DLQ for poison messages, Step Functions retry policies, graceful degradation
- **Scalability**: On-demand DynamoDB, Lambda auto-scaling, SQS buffering
- **Performance**: No VPC (avoid cold starts), reserved concurrency (50), TTL-based cleanup

### DynamoDB Schema
**Connections Table**:
- PK: `connectionId`, Attributes: `sessionId`, `puuid`, `ttl`
- GSI: `SessionIndex` on `sessionId` for lookups

**MatchData Table**:
- PK: `dataKey` (`match:{matchId}:puuid:{puuid}`)
- Attributes: Filtered JSON grouped by domain (build, combat, vision, economy, championMeta)
- TTL: `expiresAt` (30 days)

### Step Functions Orchestration
- **Type**: Express Workflow (sub-5 minute executions)
- **Parallel State**: Invokes 6 agents concurrently (MaxConcurrency: 6)
- **Error Handling**: Exponential backoff retries, Catch blocks per agent
- **Output**: Aggregated insights from all agents

## Development Workflow

### Starting the Full Stack
```bash
# From project root
pnpm install              # Install all dependencies
pnpm run dev              # Start all apps (web, fumadocs)
```

### Working with Individual Apps
```bash
pnpm run dev:web          # Start Next.js web app only (port 3001)
```

### AWS SAM Development
```bash
cd apps/aws
pnpm install              # Install TypeScript dependencies
sam build                 # Compile TypeScript Lambdas
sam local start-api       # Local API Gateway emulation
sam deploy --guided       # Deploy to AWS (first time)
sam deploy                # Subsequent deployments
```

### Code Quality
```bash
pnpm run check            # Run Biome linter/formatter
pnpm dlx ultracite fix    # Auto-fix linting issues
```

## Key Implementation Notes

### WebSocket Communication
- **Correlation ID**: Use `sessionId` for end-to-end tracing across all services
- **Update Frequency**: Send updates on meaningful milestones (every 10 matches, per agent completion)
- **Error Handling**: Handle 410 Gone (stale connections), remove from DynamoDB on failure

### Riot API Integration
- **Rate Limits**: 20 req/s, 100 req/2min (enforce with Lambda reserved concurrency: 50)
- **Retry Strategy**: Exponential backoff for 429/503 errors
- **Data Filtering**: Extract only agent-required fields to minimize DynamoDB storage

### Agent Design
Each agent Lambda:
1. Reads filtered match data from DynamoDB using `dataKey`
2. Executes specialized analysis (may invoke Bedrock agents)
3. Looks up `connectionId` from Connections table via SessionIndex GSI
4. Sends WebSocket progress update
5. Returns structured output to Step Functions
6. Timeout: 60s, Memory: 512-1024 MB

### Security
- **IAM**: Least-privilege roles per Lambda (see architecture doc for policies)
- **Secrets**: Riot API key in Secrets Manager, accessed via Lambda
- **Encryption**: DynamoDB at rest (AWS managed keys), TLS 1.2+ in transit
- **No VPC**: All services use AWS-managed endpoints (faster, cheaper, no cold starts)

## Reference Documentation

See `docs/HexCoreAi_architecture_design.md` for comprehensive architecture details including:
- Complete data contracts (SQS, EventBridge, DynamoDB, WebSocket schemas)
- Detailed IAM policies for each Lambda role
- Performance tuning, scalability, and cost optimization strategies
- Observability setup (CloudWatch metrics, alarms, X-Ray tracing)
- Deployment checklist and testing procedures

## Important Conventions

1. **TypeScript**: All backend code is TypeScript (compile with SAM build)
2. **Structured Logging**: Use AWS Lambda Powertools with correlation IDs
3. **Error Handling**: Return `batchItemFailures` for partial SQS batch success
4. **Idempotency**: DynamoDB conditional writes, versioned agent outputs
5. **Testing**: Unit tests per Lambda, integration tests for WebSocket flow
6. **Monitoring**: X-Ray tracing enabled on all Lambdas, CloudWatch alarms on critical metrics