# Task 12.2: Create Enhanced WebSocket State Management Hook

Create a custom hook that extends the existing WebSocket context with animation-specific state management, including champion mapping, agent progress tracking, and animation phase transitions.

## Subtasks

- [x] Create `useHexCoreWebSocket.ts` hook in `apps/web/src/hooks/`
- [x] Define champion-agent mapping with colors
- [x] Define TypeScript interfaces for animation state
- [x] Implement animation phase state machine
- [x] Track agent progress with champion metadata
- [x] Export hook and types for component usage

## File Location

`apps/web/src/hooks/use-hex-core-web-socket.ts`

## Key Types to Define

```typescript
export type AgentType = 
  | "BuildAgent" 
  | "CombatAgent" 
  | "VisionAgent" 
  | "EconomyAgent" 
  | "ChampionAgent" 
  | "CompetitiveAgent"
  | "Synthesizer";

export interface AgentProgress {
  agent: AgentType;
  champion: string;
  laserColor: string;
  status: "started" | "processing" | "completed" | "error";
  progress: number;
  message: string;
  toolInvocation?: ToolInvocation;
}

export interface AnimationPhase {
  phase: "idle" | "connecting" | "fetching" | "analyzing" | "completing" | "completed" | "error";
  progress: number;
  activeAgents: AgentType[];
  completedAgents: AgentType[];
  currentMessage: string;
  transitioning: boolean;
  currentChampion: string | null;
}
```

## Champion-Agent Mapping

```typescript
export const CHAMPION_AGENTS = {
  "BuildAgent": { champion: "Jayce", color: "#FFD700", laserColor: "#FFD700" },
  "CombatAgent": { champion: "Vi", color: "#FF6B9D", laserColor: "#FF6B9D" },
  "VisionAgent": { champion: "Caitlyn", color: "#B8A8DB", laserColor: "#B8A8DB" },
  "EconomyAgent": { champion: "Camille", color: "#4DB8E8", laserColor: "#4DB8E8" },
  "ChampionAgent": { champion: "Viktor", color: "#FF6B35", laserColor: "#FF6B35" },
  "CompetitiveAgent": { champion: "Ekko", color: "#00FFB3", laserColor: "#00FFB3" },
  "Synthesizer": { champion: "Heimerdinger", color: "#FF69B4", laserColor: "#FF69B4" },
} as const;
```

## Hook Return Interface

```typescript
export interface UseHexCoreWebSocketReturn {
  isConnected: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  animationState: AnimationPhase;
  progress: number;
  currentAgent: AgentType | null;
  currentChampion: string | null;
  currentLaserColor: string;
  agentProgress: Map<AgentType, AgentProgress>;
  messages: unknown[];
  error: string | null;
  connect: (sessionId: string, gameName: string, tagLine: string, region: string, year: number) => void;
  disconnect: () => void;
}
```

## Implementation Requirements

1. **WebSocket Message Handling**: Use `useEffect` to process `lastMessage` from WebSocket context
2. **Animation State Machine**: Update `animationState.phase` based on message status:
   - `"started"` → `"fetching"`
   - `"processing"` with agent → `"analyzing"`
   - `"completed"` → `"completing"` → `"completed"`
   - `"error"` → `"error"`
3. **Agent Progress Tracking**: Maintain `Map<AgentType, AgentProgress>` with champion metadata
4. **Current Champion**: Set `currentChampion` when agent becomes active
5. **Laser Color**: Derive `currentLaserColor` from current agent's champion config

## Validation

- [x] Hook exports all required types and constants
- [x] Hook properly consumes `useWebSocketContext()`
- [x] Animation state updates correctly based on WebSocket messages
- [x] Agent progress map tracks all 6 agents + synthesizer
- [x] Current champion and laser color update on agent transitions
- [x] TypeScript compiles without errors

## Reference

See complete implementation in `docs/hextech-animation-guide.md` Section 1.

## Next

Proceed to [Task 12.3](./task-123-implement-core-animation-components.md) to implement the core animation components.
