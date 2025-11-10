# Task 10.1: Install Client Dependencies

Install packages required for the WebSocket client and dashboard.

## Subtasks

- [x] Add `react-use-websocket` to the web app
- [x] Add `uuid` for generating session IDs in the dashboard example
- [x] Verify TypeScript path alias `@/*` → `./src/*` (`apps/web/tsconfig.json`)

## Commands

Using pnpm (monorepo workspace):

```bash
pnpm -F web add react-use-websocket uuid
```

Using npm (inside `apps/web`):

```bash
npm install react-use-websocket uuid
```

## Validation

- [x] `apps/web/package.json` lists `react-use-websocket` and `uuid` in dependencies
- [x] `pnpm -F web dev` (or `npm run dev`) compiles successfully

## Next

Proceed to [Task 10.2](./task-102-create-websocket-context-provider.md) to create the Context provider.
