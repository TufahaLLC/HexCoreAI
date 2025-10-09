# Phase 10: Next.js Client WebSocket Integration

## Overview

Connect the HexCore AI client web app (Next.js) to the AWS API Gateway WebSocket to receive real-time analysis updates. This phase uses `react-use-websocket` with a React Context provider to manage connection lifecycle, message handling, reconnection, and heartbeat.

- Project: `apps/web/` (Next.js 15)
- Path alias: `@/*` maps to `apps/web/src/*` per `apps/web/tsconfig.json`

## Tasks

1. [Task 10.1: Install Client Dependencies](./task-101-install-client-dependencies.md)
2. [Task 10.2: Create WebSocket Context Provider](./task-102-create-websocket-context-provider.md)
3. [Task 10.3: App-Level Integration](./task-103-app-level-integration.md)
4. [Task 10.4: Analysis Dashboard Component](./task-104-analysis-dashboard-component.md)
5. [Task 10.5: Environment Configuration](./task-105-environment-configuration.md)
6. [Task 10.6: Custom Hook: useAnalysisProgress](./task-106-custom-hook-useAnalysisProgress.md)
7. [Task 10.7: Testing & Verification](./task-107-testing-and-verification.md)

## Prerequisites

- Phase 4 WebSocket handlers deployed and reachable
- API Gateway WebSocket URL available
- `apps/web` runs with `pnpm -F web dev` or `npm run dev`

## Key Features

- Type-safe message interfaces aligned to backend schema
- Heartbeat ping every 25s to stay under API Gateway 29s idle timeout
- Reconnect with exponential backoff for abnormal closures
- Global state with React Context, accessible via `useWebSocketContext()`
- Example dashboard to visualize real-time progress and final synthesis

## References

- Architecture: `docs/HexCoreAi_architecture_design.md`
- WebSocket flow: `docs/phases/README.md` → End-to-End WebSocket Analysis Flow
- Backend WebSocket handlers: `docs/phases/phase-04/`
