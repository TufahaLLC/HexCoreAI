# Task 12.1: Install Animation Dependencies

Install the Motion library (Framer Motion successor) required for the Hextech animation system.

## Subtasks

- [x] Add `motion` package to the web app
- [x] Verify TypeScript path alias `@/*` → `./src/*` is configured
- [x] Verify build compiles successfully with new dependency

## Commands

Using pnpm (monorepo workspace):

```bash
cd apps/web
pnpm add motion
```

## Package Details

- **Package**: `motion`
- **Purpose**: Modern animation library for React with GPU-accelerated animations
- **Features**: 
  - State-driven animations
  - Keyframe arrays
  - AnimatePresence for enter/exit animations
  - Transform & opacity optimizations
  - TypeScript support

## Validation

- [x] `apps/web/package.json` lists `motion` in dependencies
- [x] `pnpm -F web dev` (or `npm run dev`) compiles successfully
- [x] No TypeScript errors related to motion imports

## Notes

- Motion is the successor to Framer Motion with improved performance
- All animations will use GPU-accelerated properties (transform, opacity)
- The library supports React 19 (used in Next.js 15.5)

## Next

Proceed to [Task 12.2](./task-122-create-enhanced-websocket-hook.md) to create the enhanced WebSocket state management hook.
