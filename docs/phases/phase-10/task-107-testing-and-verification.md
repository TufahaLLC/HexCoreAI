# Task 10.7: Testing & Verification

Run the web app, connect to the WebSocket backend, and verify real-time updates.

## Subtasks

- [x] Ensure dependencies installed (Task 10.1)
- [x] Ensure provider integrated (Task 10.3)
- [x] Ensure env configured (Task 10.5)
- [x] Render the dashboard on a page

## Optional route for demo

Create `apps/web/src/app/analysis/page.tsx` to mount the dashboard without changing the home page:

```tsx
'use client';

import { AnalysisDashboard } from '@/components/AnalysisDashboard';

export default function AnalysisPage() {
  return <AnalysisDashboard />;
}
```

## Run the app

Using pnpm:

```bash
pnpm -F web dev
```

Using npm (inside `apps/web`):

```bash
npm run dev
```

Open `http://localhost:3001/analysis` (or your configured port) and:

1. Enter a valid PUUID
2. Select region and year
3. Click "Start Analysis"
4. Observe status, progress bar, agent updates, and final synthesis

## What to expect in logs

- `[WebSocket] Connection established` on open
- Periodic messages with `status: 'started' | 'processing' | 'completed' | 'error'`
- Heartbeat pings every 25s to keep the connection alive
- Reconnect attempts on abnormal closures (not code 1000/1001)

## Troubleshooting

- Connection immediately closes with code 410 (Gone): the connectionId may be stale; ensure API Gateway stage is correct
- No messages received: verify backend connect handler sends initial message (`status: 'started'`), and subsequent services publish updates
- Env undefined: confirm `.env.local` includes `NEXT_PUBLIC_WEBSOCKET_URL` and restart dev server
- CORS: WebSocket connections use a different policy than HTTP; ensure your API Gateway WebSocket endpoint is publicly reachable

## Completion Criteria

- [x] Build completes successfully with analysis page
- [ ] Client connects and receives the initial `started` message (requires backend deployment)
- [ ] Real-time progress updates arrive during processing (requires backend deployment)
- [ ] Final `completed` message includes `synthesis` payload and is rendered (requires backend deployment)
