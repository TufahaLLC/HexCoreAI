# Task 10.5: Environment Configuration

Expose the WebSocket URL to the Next.js client via a public env var.

## Subtasks

- [x] Create `apps/web/.env.local` (user must create manually - gitignored)
- [x] Set `NEXT_PUBLIC_WEBSOCKET_URL`
- [x] (Optional) Add placeholder to `apps/web/.env.example`

## File: `apps/web/.env.local`

```bash
# AWS API Gateway WebSocket URL
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-api-id.execute-api.us-east-1.amazonaws.com/production
```

Notes:
- `NEXT_PUBLIC_*` prefix makes variables available to the browser (required for clients).
- Use the deployed stage and region that match your stack.

(Optional) Update `apps/web/.env.example`:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=
```

## Validation

- [x] `process.env.NEXT_PUBLIC_WEBSOCKET_URL` is defined at runtime (when .env.local is created)
- [ ] Connecting from the dashboard reaches your API Gateway (requires deployed backend)

## Next

Proceed to [Task 10.6](./task-106-custom-hook-useAnalysisProgress.md) for a convenience hook.
