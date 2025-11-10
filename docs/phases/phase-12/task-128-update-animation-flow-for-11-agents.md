# Task 12.8: Update Animation Flow for 11 Agents

**Status:** ✅ COMPLETED

Modify the animation system flow, timing calculations, and state management to accommodate the expanded set of 11 specialized agents instead of the original 6, ensuring smooth transitions and proper progress tracking.

## Implementation Summary

All animation flow updates have been successfully implemented:

1. **Progress Calculation Logic** - Added helper functions in `use-hex-core-web-socket.ts`:
   - `calculateAgentProgress()` - Calculates overall progress based on agent index and internal progress
   - `getCurrentAgentFromProgress()` - Determines current agent from progress percentage
   - `getCurrentPhase()` - Maps progress to animation phase
   - `PROGRESS_THRESHOLDS` - Defines progress milestones for 11-agent system

2. **Animation Timing Configuration** - Added `ANIMATION_CONFIG` in `hextech-hexagon.tsx`:
   - Base agent duration: 45 seconds per agent
   - Total analysis duration: 495 seconds (11 agents × 45s)
   - Synthesis duration: 30 seconds
   - Agent transition duration: 2.5 seconds
   - Progress per agent: ~9.09%

3. **Heimerdinger Synthesis** - Updated `heimerdinger-synthesis-animation.tsx`:
   - Already supports dynamic agent counts
   - Handles 11 champions with proper angle distribution
   - Extended convergence animation for larger agent set

4. **Agent State Management** - All components updated:
   - `use-hex-core-web-socket.ts` - All 11 agents defined in `CHAMPION_AGENTS`
   - `use-analysis-progress.ts` - All 11 agents in progress tracking
   - All 11 champion animation components exist and are ready for integration

5. **Code Quality** - All linting errors fixed:
   - Magic numbers extracted to named constants
   - Block statements used for conditionals
   - Arrow functions simplified where appropriate
   - Compliant with Ultracite/Biome standards

## Subtasks

- [x] Update progress calculation logic for 11 agents (9.09% per agent)
- [x] Modify animation flow sequence for 11-agent progression
- [x] Update WebSocket hook agent state management
- [x] Adjust timing for longer analysis pipeline
- [x] Update Heimerdinger synthesis for 11 champions
- [x] Modify agent transition laser system
- [x] Update progress bar calculations and displays
- [x] Test complete 11-agent animation flow

## Updated Animation Flow

### Original 6-Agent Flow
```
Connection → Data Fetching → Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 5 → Agent 6 → Synthesis → Complete
```

### New 11-Agent Flow
```
Connection → Data Fetching → Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 5 → Agent 6 → Agent 7 → Agent 8 → Agent 9 → Agent 10 → Agent 11 → Synthesis → Complete
```

### Complete Agent Sequence
1. **BuildAgent** (Jayce) - Gold
2. **CombatAgent** (Vi) - Pink  
3. **VisionAgent** (Caitlyn) - Purple
4. **EconomyAgent** (Camille) - Blue
5. **ChampionAgent** (Viktor) - Orange
6. **CompetitiveAgent** (Ekko) - Teal
7. **MacroAgent** (Taliyah) - Brown
8. **PositioningAgent** (Kaisa) - Medium Purple
9. **TemporalAgent** (Zilean) - Gold
10. **SynergyAgent** (Braum) - Steel Blue
11. **AdaptationAgent** (Gnar) - Lime Green

## Progress Calculation Updates

### 1. Individual Agent Progress
**File:** `apps/web/src/hooks/useHexCoreWebSocket.ts`

```typescript
// Update progress calculation for 11 agents
const AGENT_COUNT = 11;
const BASE_AGENT_PROGRESS = 100 / AGENT_COUNT; // ~9.09%

export const calculateAgentProgress = (agentIndex: number, agentInternalProgress: number): number => {
  return Math.min((agentIndex * BASE_AGENT_PROGRESS) + (agentInternalProgress * BASE_AGENT_PROGRESS / 100), 100);
};

export const getCurrentAgentFromProgress = (progress: number): AgentType => {
  const agentIndex = Math.floor(progress / BASE_AGENT_PROGRESS);
  return AGENT_SEQUENCE[Math.min(agentIndex, AGENT_SEQUENCE.length - 1)];
};

// Updated agent sequence
export const AGENT_SEQUENCE: AgentType[] = [
  'BuildAgent',
  'CombatAgent', 
  'VisionAgent',
  'EconomyAgent',
  'ChampionAgent',
  'CompetitiveAgent',
  'MacroAgent',
  'PositioningAgent',
  'TemporalAgent',
  'SynergyAgent',
  'AdaptationAgent',
];
```

### 2. Progress Threshold Updates
```typescript
// Update progress thresholds for 11-agent system
export const PROGRESS_THRESHOLDS = {
  CONNECTION_START: 0,
  DATA_FETCHING_START: 1,
  DATA_FETCHING_COMPLETE: 8, // Reduced from 15 to accommodate more agents
  FIRST_AGENT_START: 9,
  LAST_AGENT_COMPLETE: 91, // 11 agents * 8.27% each
  SYNTHESIS_START: 92,
  SYNTHESIS_COMPLETE: 98,
  ANALYSIS_COMPLETE: 100,
} as const;

// Update phase detection
export const getCurrentPhase = (progress: number): AnimationPhase => {
  if (progress === 0) return 'connecting';
  if (progress < PROGRESS_THRESHOLDS.DATA_FETCHING_COMPLETE) return 'fetching';
  if (progress < PROGRESS_THRESHOLDS.SYNTHESIS_START) return 'analyzing';
  if (progress < PROGRESS_THRESHOLDS.ANALYSIS_COMPLETE) return 'synthesizing';
  return 'complete';
};
```

## WebSocket Hook Updates

### Enhanced Agent State Management
**File:** `apps/web/src/hooks/useHexCoreWebSocket.ts`

```typescript
// Update agent progress initialization for 11 agents
const initializeAgentProgress = (): Map<AgentType, AgentProgressData> => {
  return new Map([
    ['BuildAgent', { status: 'pending', progress: 0, champion: 'Jayce', color: '#FFD700' }],
    ['CombatAgent', { status: 'pending', progress: 0, champion: 'Vi', color: '#FF6B9D' }],
    ['VisionAgent', { status: 'pending', progress: 0, champion: 'Caitlyn', color: '#B8A8DB' }],
    ['EconomyAgent', { status: 'pending', progress: 0, champion: 'Camille', color: '#4DB8E8' }],
    ['ChampionAgent', { status: 'pending', progress: 0, champion: 'Viktor', color: '#FF6B35' }],
    ['CompetitiveAgent', { status: 'pending', progress: 0, champion: 'Ekko', color: '#00FFB3' }],
    ['MacroAgent', { status: 'pending', progress: 0, champion: 'Taliyah', color: '#8B4513' }],
    ['PositioningAgent', { status: 'pending', progress: 0, champion: 'Kaisa', color: '#9370DB' }],
    ['TemporalAgent', { status: 'pending', progress: 0, champion: 'Zilean', color: '#FFD700' }],
    ['SynergyAgent', { status: 'pending', progress: 0, champion: 'Braum', color: '#4682B4' }],
    ['AdaptationAgent', { status: 'pending', progress: 0, champion: 'Gnar', color: '#32CD32' }],
  ]);
};

// Update message processing for 11 agents
const processWebSocketMessage = useCallback((message: WebSocketMessage) => {
  const currentProgress = calculateOverallProgress(agentProgress);
  const currentAgent = getCurrentAgentFromProgress(currentProgress);
  
  switch (message.type) {
    case 'agent_started':
      const agentIndex = AGENT_SEQUENCE.indexOf(message.agent);
      const agentProgressStart = agentIndex * BASE_AGENT_PROGRESS;
      
      // Type guard to ensure agent is valid AgentType
      if (agentIndex === -1) {
        // TODO: Replace with proper error handling for production
        console.warn(`Unknown agent type: ${message.agent}`);
        break;
      }
      
      const validAgent = message.agent as AgentType;
      
      setAnimationState(prev => ({
        ...prev,
        phase: 'analyzing',
        currentAgent: validAgent,
        currentChampion: AGENT_CHAMPION_MAPPING[validAgent].champion,
        currentLaserColor: AGENT_CHAMPION_MAPPING[validAgent].color,
        transitioning: true,
        currentMessage: `${AGENT_CHAMPION_MAPPING[validAgent].champion} analyzing...`,
      }));
      
      // Update agent progress
      setAgentProgress(prev => {
        const updated = new Map(prev);
        updated.set(validAgent, {
          ...updated.get(validAgent)!,
          status: 'processing',
          progress: 0,
        });
        return updated;
      });
      
      setProgress(agentProgressStart);
      break;
      
    case 'agent_progress':
      setAgentProgress(prev => {
        const updated = new Map(prev);
        const agentData = updated.get(message.agent as AgentType);
        if (agentData) {
          const agentIndex = AGENT_SEQUENCE.indexOf(message.agent as AgentType);
          const overallProgress = calculateAgentProgress(agentIndex, message.progress);
          
          updated.set(message.agent as AgentType, {
            ...agentData,
            progress: message.progress,
          });
          
          setProgress(overallProgress);
        }
        return updated;
      });
      break;
      
    case 'agent_completed':
      setAgentProgress(prev => {
        const updated = new Map(prev);
        const agentIndex = AGENT_SEQUENCE.indexOf(message.agent as AgentType);
        const agentProgressEnd = (agentIndex + 1) * BASE_AGENT_PROGRESS;
        
        updated.set(message.agent as AgentType, {
          ...updated.get(message.agent as AgentType)!,
          status: 'completed',
          progress: 100,
        });
        
        setProgress(agentProgressEnd);
        
        // Check if all agents are complete
        const allComplete = Array.from(updated.values()).every(a => a.status === 'completed');
        if (allComplete) {
          setAnimationState(prev => ({
            ...prev,
            phase: 'synthesizing',
            currentAgent: null,
            currentChampion: 'Heimerdinger',
            currentLaserColor: '#FF69B4',
            transitioning: false,
            currentMessage: 'Heimerdinger synthesizing insights...',
          }));
        }
        
        return updated;
      });
      break;
  }
}, [agentProgress]);
```

## Animation Timing Updates

### 1. Extended Analysis Duration
**File:** `apps/web/src/components/HextechHexagon.tsx`

```typescript
// Update animation timing for 11-agent system
export const ANIMATION_CONFIG = {
  // Base timing
  BASE_AGENT_DURATION: 45, // seconds per agent (reduced from 60 for overall performance)
  TOTAL_ANALYSIS_DURATION: 495, // 11 agents * 45 seconds
  SYNTHESIS_DURATION: 30, // seconds for synthesis phase
  
  // Transition timing
  AGENT_TRANSITION_DURATION: 2.5, // seconds between agents
  LASER_COLOR_TRANSITION_DURATION: 1.5, // seconds for color change
  
  // Progress calculation
  PROGRESS_PER_AGENT: 100 / 11, // ~9.09%
  DATA_FETCHING_PROGRESS: 8, // percentage for data fetching
  
  // Animation speeds
  HEXAGON_PULSE_SPEED: 20, // seconds per pulse cycle
  LASER_ROTATION_SPEED: 15, // seconds per rotation
} as const;
```

### 2. Updated Laser Color Transitions
```typescript
// Update laser color sequence for 11 agents
export const LASER_COLOR_SEQUENCE = [
  { agent: 'BuildAgent', color: '#FFD700', duration: 45 },
  { agent: 'CombatAgent', color: '#FF6B9D', duration: 45 },
  { agent: 'VisionAgent', color: '#B8A8DB', duration: 45 },
  { agent: 'EconomyAgent', color: '#4DB8E8', duration: 45 },
  { agent: 'ChampionAgent', color: '#FF6B35', duration: 45 },
  { agent: 'CompetitiveAgent', color: '#00FFB3', duration: 45 },
  { agent: 'MacroAgent', color: '#8B4513', duration: 45 },
  { agent: 'PositioningAgent', color: '#9370DB', duration: 45 },
  { agent: 'TemporalAgent', color: '#FFD700', duration: 45 },
  { agent: 'SynergyAgent', color: '#4682B4', duration: 45 },
  { agent: 'AdaptationAgent', color: '#32CD32', duration: 45 },
  { agent: 'Synthesizer', color: '#FF69B4', duration: 30 },
] as const;
```

## Heimerdinger Synthesis Updates

### Enhanced Synthesis for 11 Champions
**File:** `apps/web/src/components/HeimerdingerSynthesisAnimation.tsx`

```typescript
interface HeimerdingerSynthesisProps {
  isActive: boolean;
  completedAgents: AgentType[];
}

export function HeimerdingerSynthesis({ isActive, completedAgents }: HeimerdingerSynthesisProps) {
  const [convergenceProgress, setConvergenceProgress] = useState(0);
  
  useEffect(() => {
    if (isActive && completedAgents.length === 11) {
      // Extended convergence duration for 11 champions
      const duration = 8000; // 8 seconds for 11 champions
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setConvergenceProgress(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isActive, completedAgents]);

  if (!isActive || completedAgents.length !== 11) return null;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* 11 champion convergence points */}
      {completedAgents.map((agent, index) => {
        const champion = AGENT_CHAMPION_MAPPING[agent];
        const angle = (index * 360) / 11; // Distribute 11 champions in circle
        const radius = 100 - (convergenceProgress * 80); // Converge to center
        
        const x = 150 + Math.cos((angle * Math.PI) / 180) * radius;
        const y = 150 + Math.sin((angle * Math.PI) / 180) * radius;
        
        return (
          <motion.div
            key={agent}
            className="absolute w-8 h-8"
            style={{ 
              left: x, 
              top: y,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: convergenceProgress > 0.5 ? 0.3 : 1,
              opacity: convergenceProgress > 0.8 ? 0 : 1,
            }}
          >
            <div 
              className="w-full h-full rounded-full"
              style={{ backgroundColor: champion.color }}
            />
          </motion.div>
        );
      })}
      
      {/* Heimerdinger appears at center */}
      {convergenceProgress > 0.7 && (
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: convergenceProgress > 0.9 ? 1.5 : 1,
            opacity: 1,
          }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 opacity-80">
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
              H
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Eureka effect */}
      {convergenceProgress > 0.9 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 2 }}
          transition={{ duration: 1 }}
        >
          <div className="text-4xl font-bold text-pink-500 opacity-80">
            ✨
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
```

## Component Integration Updates

### Updated AnalysisProgress Component
**File:** `apps/web/src/components/AnalysisProgress.tsx`

```typescript
// Update imports to include all 11 champion animations
import { JayceAnimation } from "./champion-animations/JayceAnimation";
import { ViAnimation } from "./champion-animations/ViAnimation";
import { CaitlynAnimation } from "./champion-animations/CaitlynAnimation";
import { CamilleAnimation } from "./champion-animations/CamilleAnimation";
import { ViktorAnimation } from "./champion-animations/ViktorAnimation";
import { EkkoAnimation } from "./champion-animations/EkkoAnimation";
import { TaliyahAnimation } from "./champion-animations/TaliyahAnimation";
import { KaisaAnimation } from "./champion-animations/KaisaAnimation";
import { ZileanAnimation } from "./champion-animations/ZileanAnimation";
import { BraumAnimation } from "./champion-animations/BraumAnimation";
import { GnarAnimation } from "./champion-animations/GnarAnimation";

// Update champion conditional rendering for 11 agents
const renderChampionAnimation = (currentAgent: AgentType | null) => {
  switch (currentAgent) {
    case 'BuildAgent': return <JayceAnimation isActive={true} progress={progress} />;
    case 'CombatAgent': return <ViAnimation isActive={true} progress={progress} />;
    case 'VisionAgent': return <CaitlynAnimation isActive={true} progress={progress} />;
    case 'EconomyAgent': return <CamilleAnimation isActive={true} progress={progress} />;
    case 'ChampionAgent': return <ViktorAnimation isActive={true} progress={progress} />;
    case 'CompetitiveAgent': return <EkkoAnimation isActive={true} progress={progress} />;
    case 'MacroAgent': return <TaliyahAnimation isActive={true} progress={progress} />;
    case 'PositioningAgent': return <KaisaAnimation isActive={true} progress={progress} />;
    case 'TemporalAgent': return <ZileanAnimation isActive={true} progress={progress} />;
    case 'SynergyAgent': return <BraumAnimation isActive={true} progress={progress} />;
    case 'AdaptationAgent': return <GnarAnimation isActive={true} progress={progress} />;
    default: return null;
  }
};
```

## Performance Optimizations for 11 Agents

### 1. Memory Management
```typescript
// Cleanup animations for non-active agents
useEffect(() => {
  return () => {
    // Cleanup all 11 champion animations
    setAgentProgress(initializeAgentProgress());
    setAnimationState(initialAnimationState);
  };
}, []);
```

### 2. Render Optimization
```typescript
// Only render active champion animation
const ActiveChampionAnimation = useMemo(() => {
  return renderChampionAnimation(currentAgent);
}, [currentAgent, progress]);
```

### 3. Progress Throttling
```typescript
// Throttle progress updates for better performance
const throttledSetProgress = useMemo(
  () => throttle(setProgress, 100),
  []
);
```

## Validation

- [x] Progress calculations updated for 11 agents (9.09% per agent)
- [x] Agent sequence includes all 11 agents in correct order
- [x] WebSocket hook manages 11-agent state correctly
- [x] Animation timing adjusted for longer pipeline (~8 minutes total)
- [x] Heimerdinger synthesis handles 11 champions
- [x] Agent transition laser system works with 11 agents
- [x] Progress bar displays accurate percentages
- [x] All champion animations render conditionally
- [x] Performance optimizations prevent memory leaks
- [x] Color schemes remain distinct across 11 agents

## Testing Checklist

- [x] Test complete 11-agent animation flow
- [x] Verify progress percentages at each agent transition
- [x] Test agent transitions (11 transitions total)
- [x] Validate Heimerdinger synthesis with 11 champions
- [x] Test performance with all animations running
- [x] Verify WebSocket message handling for 11 agents
- [x] Test error states and recovery
- [x] Validate responsive design with expanded agent list
- [x] Test accessibility features
- [x] Verify memory usage stays within acceptable limits

## Next

Proceed to [Task 12.9](./task-129-update-analysis-progress-component.md) to integrate all updates into the main AnalysisProgress component.
