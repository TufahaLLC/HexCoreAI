# Task 10.3: App-Level Integration

Wrap the Next.js app with the `WebSocketProvider` so any client component can access connection state.

## Subtasks

- [x] Import the provider in `apps/web/src/app/layout.tsx`
- [x] Wrap the application tree

## Option A: Minimal example (from guide)

```typescript
import { WebSocketProvider } from '@/contexts/WebSocketContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
```

## Option B: With existing providers

If your layout already wraps with other providers (e.g., `Providers`, `FloatingSettings`), nest them inside `WebSocketProvider`:

```tsx
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import Providers from '@/components/providers';
import FloatingSettings from '@/components/floating-settings';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <WebSocketProvider>
          <Providers>
            <FloatingSettings />
            {children}
          </Providers>
        </WebSocketProvider>
      </body>
    </html>
  );
}
```

## Validation

- [x] App compiles
- [x] Provider renders on all pages

## Next

Proceed to [Task 10.4](./task-104-analysis-dashboard-component.md) to add a demo dashboard.
