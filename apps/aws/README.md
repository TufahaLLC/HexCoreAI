# HexCore AI - AWS Serverless Backend

This directory contains the AWS serverless backend implementation for HexCore AI, a League of Legends match analysis platform using multi-agent AI.

## Project Structure

```
apps/aws/
├── template.yaml              # SAM IaC template
├── samconfig.toml            # SAM CLI configuration
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── websocket/            # WebSocket connection handlers
│   ├── processor/            # Match data processing Lambda
│   ├── agents/               # 6 specialized AI analysis agents
│   ├── aggregation/          # Results synthesis Lambda
│   ├── shared/               # Utility functions and types
│   └── layers/nodejs/        # Lambda layers (shared dependencies)
└── statemachine/             # Step Functions state machine definitions
```

## Getting Started

### Prerequisites
- Node.js 20.x
- AWS SAM CLI
- AWS credentials configured
- pnpm (for monorepo management)

### Installation

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Test locally
pnpm run local

# Deploy to AWS
pnpm run deploy
```

## Development

### Build Commands
- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run watch` - Watch mode for development
- `pnpm run clean` - Remove build artifacts

### SAM Commands
- `sam build` - Build Lambda functions
- `sam local start-api` - Run API Gateway locally
- `sam deploy --guided` - Deploy to AWS (first time)
- `sam deploy` - Deploy using saved configuration

## Architecture

This backend uses:
- **API Gateway WebSocket** for real-time client communication
- **Lambda** for serverless compute (TypeScript/Node.js 20.x on ARM64)
- **DynamoDB** for connections and match data storage
- **SQS** for reliable match queue processing
- **EventBridge** for event-driven architecture
- **Step Functions** for multi-agent orchestration
- **S3** for analysis results storage
- **Secrets Manager** for Riot API key

## Implementation Status

**Phase 1: Project Structure & Configuration** ✅ **COMPLETE**
- ✅ Directory structure created
- ✅ package.json configured
- ✅ tsconfig.json configured
- ✅ Placeholder files created

**Next Steps:**
- Phase 2: Complete SAM template with all AWS resources
- Phase 3: Implement shared utilities and type definitions
- Phase 4: Implement Lambda function handlers

## Documentation

See `/docs` in the repository root for:
- Architecture design document
- Implementation guides
- API contracts and data schemas
