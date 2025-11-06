# Task 10.6: Custom Hook: useAnalysisProgress

Provide a convenience hook to derive per-agent progress and completion flags from the WebSocket context.

## Subtasks

- [x] Create `apps/web/src/hooks/useAnalysisProgress.ts`
- [x] Paste the implementation below

## File: `apps/web/src/hooks/useAnalysisProgress.ts`

```typescript
import { useEffect, useState } from 'react';
import { useWebSocketContext, type AgentType } from '@/contexts/WebSocketContext';

export const useAnalysisProgress = () => {
  const { lastMessage, messageHistory } = useWebSocketContext();
  
  const [agentProgress, setAgentProgress] = useState<Record<AgentType, number>>({
    BuildAgent: 0,
    CombatAgent: 0,
    VisionAgent: 0,
    EconomyAgent: 0,
    ChampionAgent: 0,
    CompetitiveAgent: 0,
    Synthesizer: 0,
  });

  useEffect(() => {
    if (lastMessage?.agent && lastMessage.progress) {
      setAgentProgress(prev => ({
        ...prev,
        [lastMessage.agent!]: lastMessage.progress!
      }));
    }
  }, [lastMessage]);

  const isAnalysisComplete = lastMessage?.status === 'completed';
  const hasError = lastMessage?.status === 'error';

  return {
    agentProgress,
    isAnalysisComplete,
    hasError,
    messageHistory
  };
};
```

## Validation

- [x] Hook returns per-agent progress map
- [x] Flags update based on the latest message

## Next

Proceed to [Task 10.7](./task-107-testing-and-verification.md) to validate end-to-end.
