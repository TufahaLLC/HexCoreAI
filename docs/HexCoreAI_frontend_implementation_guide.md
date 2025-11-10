# HexCore AI - Frontend Implementation Guide

## Overview

This document provides a comprehensive explanation of the HexCore AI frontend implementation, covering the Next.js web application, its integration with the AWS backend, WebSocket communication, and the sophisticated real-time analysis visualization system.

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Core Architecture](#core-architecture)
4. [WebSocket Integration](#websocket-integration)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [Real-time Visualization](#real-time-visualization)
8. [Form Handling & Validation](#form-handling--validation)
9. [Theme & UI System](#theme--ui-system)
10. [Error Handling & User Experience](#error-handling--user-experience)
11. [Performance Optimizations](#performance-optimizations)
12. [Development Workflow](#development-workflow)

## Technology Stack

### Core Framework
- **Next.js 15.5** with App Router and React 19
- **TypeScript** for type safety and better developer experience
- **Turbopack** for fast development builds

### UI & Styling
- **TailwindCSS 4.1** for utility-first styling
- **shadcn/ui** components built on Radix UI primitives
- **Lucide React** for consistent iconography
- **next-themes** for dark/light mode support

### State Management & Data Fetching
- **TanStack React Query** for server state management
- **TanStack React Form** with Zod validation
- **React Hook Form** for form state management
- **Custom WebSocket Context** for real-time communication

### Animation & Visualization
- **Motion** (Framer Motion) for sophisticated animations
- **Custom SVG components** for Hextech visualization
- **React-use-websocket** for WebSocket connection management

### Developer Experience
- **TypeScript** strict mode with path aliases
- **Biome** for linting and formatting
- **Hot reload** with Turbopack
- **Component-driven architecture** with reusable UI components

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Home page (AnalysisDashboard)
│   │   └── favicon.ico        # App icon
│   │
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sonner.tsx
│   │   │   └── tabs.tsx
│   │   │
│   │   ├── analysis-dashboard.tsx      # Main dashboard component
│   │   ├── analysis-form.tsx           # User input form
│   │   ├── analysis-confirmation-dialog.tsx
│   │   ├── analysis-progress.tsx       # Progress visualization
│   │   ├── analysis-results.tsx        # Results display
│   │   ├── connection-status.tsx       # WebSocket status
│   │   ├── message-history.tsx         # Message log
│   │   ├── floating-settings.tsx       # Settings panel
│   │   ├── header.tsx                  # App header
│   │   ├── hextech-hexagon.tsx         # SVG hexagon visualization
│   │   ├── vel-koz-laser.tsx           # Rotating laser animation
│   │   ├── agent-transition-laser.tsx  # Agent transition effects
│   │   ├── heimerdinger-synthesis-animation.tsx
│   │   ├── loader.tsx                  # Loading states
│   │   ├── mode-toggle.tsx             # Theme switcher
│   │   ├── providers.tsx               # React providers
│   │   └── theme-provider.tsx          # Theme context
│   │
│   │   └── champion-animations/        # Agent-specific animations
│   │       ├── braum-animation.tsx
│   │       ├── caitlyn-animation.tsx
│   │       ├── camille-animation.tsx
│   │       ├── ekko-animation.tsx
│   │       ├── gnar-animation.tsx
│   │       ├── jayce-animation.tsx
│   │       ├── kaisa-animation.tsx
│   │       ├── taliyah-animation.tsx
│   │       ├── vi-animation.tsx
│   │       ├── viktor-animation.tsx
│   │       └── zilean-animation.tsx
│   │
│   ├── contexts/              # React contexts
│   │   └── web-socket-context.tsx      # WebSocket state management
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-analysis-dashboard.ts   # Main dashboard logic
│   │   ├── use-analysis-progress.ts    # Progress tracking
│   │   └── use-hex-core-web-socket.ts  # WebSocket integration
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── analysis.ts        # Analysis-related types
│   │
│   ├── lib/                   # Utility libraries
│   │   └── utils.ts           # Shared utilities
│   │
│   └── index.css              # Global styles and Tailwind imports
│
├── components.json            # shadcn/ui configuration
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── .env.example               # Environment variables template
```

## Core Architecture

### Application Flow

The frontend follows a **unidirectional data flow** pattern with clear separation of concerns:

1. **User Input** → Form validation → WebSocket connection
2. **WebSocket Messages** → Context state → Component updates
3. **Backend Events** → Real-time visualization → Results display

### Key Architectural Patterns

#### 1. Provider Pattern
```typescript
// Root layout wraps the entire app with necessary providers
<WebSocketProvider>
  <Providers>
    <FloatingSettings />
    {children}
  </Providers>
</WebSocketProvider>
```

#### 2. Composition over Inheritance
- Components are composed from smaller, reusable pieces
- Custom hooks encapsulate complex logic
- UI components are separated from business logic

#### 3. Type-First Development
- All data structures have TypeScript definitions
- WebSocket messages are strongly typed
- Form validation uses Zod schemas

## WebSocket Integration

### Connection Management

The WebSocket integration is built around a **custom context** that provides:

```typescript
type WebSocketContextValue = {
  // Connection state
  readyState: ReadyState;
  isConnected: boolean;
  isConnecting: boolean;

  // Message handling
  lastMessage: WebSocketMessage | null;
  messageHistory: WebSocketMessage[];

  // Connection management
  connect: (params: ConnectionParams) => void;
  disconnect: () => void;

  // Session info
  sessionId: string | null;
  gameName: string | null;
  tagLine: string | null;
};
```

### Connection URL Construction

The WebSocket URL is dynamically constructed with query parameters:

```typescript
const url = `${baseUrl}?sessionId=${encodeURIComponent(sessionId)}&gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}&region=${encodeURIComponent(region)}&year=${year}`;
```

### Message Types

The system handles structured WebSocket messages:

```typescript
export type WebSocketMessage = {
  status: MessageStatus; // "started" | "processing" | "completed" | "error"
  message: string;
  progress?: number;
  agent?: AgentType;
  totalMatches?: number;
  processedMatches?: number;
  resultId?: string;
  s3Key?: string;
  toolInvocation?: ToolInvocation;
  synthesis?: Synthesis;
  timestamp: number;
  error?: string;
};
```

### Reconnection Strategy

The WebSocket implementation includes robust reconnection logic:

- **Exponential backoff**: 1s, 2s, 4s, 8s, 16s intervals
- **Max attempts**: 5 reconnection attempts
- **Heartbeat**: 25-second intervals to keep connection alive
- **Graceful handling**: Distinguishes between intentional and accidental disconnections

## Component Architecture

### 1. AnalysisDashboard (`analysis-dashboard.tsx`)

The **main orchestrator** component that:

- Manages the overall application state
- Handles form submission and WebSocket connection
- Coordinates between different UI sections
- Manages animation states and transitions

**Key Features:**
- Conditional rendering based on connection state
- Animation orchestration with Motion
- Toast notifications for user feedback
- Responsive layout with floating controls

### 2. AnalysisForm (`analysis-form.tsx`)

A **form component** built with React Hook Form that:

- Collects user input (Game Name, Tag Line, Region, Year)
- Validates input using Zod schemas
- Handles loading and disabled states
- Provides accessible form controls

**Form Fields:**
```typescript
type AnalysisFormData = {
  gameName: string;
  tagLine: string;
  region: "americas" | "europe" | "asia";
  year: number;
};
```

### 3. HextechHexagon (`hextech-hexagon.tsx`)

A **sophisticated SVG visualization** that:

- Renders a perfect hexagon with mathematical precision
- Supports dynamic coloring based on agent progress
- Includes champion-specific visual indicators
- Provides smooth color transitions

**Mathematical Implementation:**
```typescript
// Generate hexagon points with precision
const angle = ((2 * Math.PI) / HEXAGON_SIDES) * i - Math.PI / 2;
const x = centerX + radius * Math.cos(angle);
const y = centerY + radius * Math.sin(angle);
```

### 4. VelKozLaser (`vel-koz-laser.tsx`)

An **animated laser component** that:

- Rotates continuously during analysis
- Extends based on progress percentage
- Provides visual feedback for active processing
- Synchronizes with hexagon coloring

### 5. AnalysisResults (`analysis-results.tsx`)

A **comprehensive results display** that:

- Shows synthesis summary with strengths/improvements
- Displays individual agent analyses in tabs
- Provides status indicators and timestamps
- Supports detailed drill-down views

## State Management

### 1. WebSocket Context

The **central state management** for real-time communication:

```typescript
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  websocketUrl,
}) => {
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  // ... connection and message handling logic
};
```

### 2. Custom Hooks

#### useAnalysisDashboard
Encapsulates **dashboard-level logic**:
- Form management with React Hook Form
- WebSocket connection orchestration
- Progress tracking and state updates
- Error handling and user feedback

#### useHexCoreWebSocket
Manages **visualization-specific state**:
- Agent progress tracking
- Animation phase management
- Champion and color coordination
- Progress calculation for 11-agent system

### 3. Agent Progress System

The system tracks **11 different agents** with individual progress:

```typescript
export const CHAMPION_AGENTS = {
  BuildAgent: { champion: "Jayce", color: "#FFD700", laserColor: "#FFD700" },
  CombatAgent: { champion: "Vi", color: "#FF6B9D", laserColor: "#FF6B9D" },
  VisionAgent: { champion: "Caitlyn", color: "#B8A8DB", laserColor: "#B8A8DB" },
  EconomyAgent: { champion: "Camille", color: "#4DB8E8", laserColor: "#4DB8E8" },
  ChampionAgent: { champion: "Viktor", color: "#FF6B35", laserColor: "#FF6B35" },
  CompetitiveAgent: { champion: "Ekko", color: "#00FFB3", laserColor: "#00FFB3" },
  MacroAgent: { champion: "Taliyah", color: "#8B4513", laserColor: "#8B4513" },
  PositioningAgent: { champion: "Kaisa", color: "#9370DB", laserColor: "#9370DB" },
  TemporalAgent: { champion: "Zilean", color: "#FFD700", laserColor: "#FFD700" },
  SynergyAgent: { champion: "Braum", color: "#4682B4", laserColor: "#4682B4" },
  AdaptationAgent: { champion: "Gnar", color: "#32CD32", laserColor: "#32CD32" },
  Synthesizer: { champion: "Heimerdinger", color: "#FF69B4", laserColor: "#FF69B4" },
} as const;
```

## Real-time Visualization

### Animation System

The visualization system uses **Motion (Framer Motion)** for sophisticated animations:

#### 1. Phase-Based Animations
```typescript
export type AnimationPhase = {
  phase: "idle" | "connecting" | "fetching" | "analyzing" | "completing" | "completed" | "error";
  progress: number;
  activeAgents: AgentType[];
  completedAgents: AgentType[];
  currentMessage: string;
  transitioning: boolean;
  currentChampion: string | null;
};
```

#### 2. Progress Calculation
The system calculates progress across **11 agents plus synthesis**:

```typescript
const PROGRESS_THRESHOLDS = {
  CONNECTION_START: 0,
  DATA_FETCHING_START: 1,
  DATA_FETCHING_COMPLETE: 8,
  FIRST_AGENT_START: 9,
  LAST_AGENT_COMPLETE: 91, // 11 agents * ~8.27% each
  SYNTHESIS_START: 92,
  SYNTHESIS_COMPLETE: 98,
  ANALYSIS_COMPLETE: 100,
} as const;
```

#### 3. Champion-Specific Animations

Each agent has a **dedicated animation component**:
- **Jayce** (BuildAgent): Hammer construction animation
- **Vi** (CombatAgent): Punching gauntlet effects
- **Caitlyn** (VisionAgent): Sniper scope visualization
- **Camille** (EconomyAgent): Precision targeting
- **Viktor** (ChampionAgent): Hex-tech transformations
- **Ekko** (CompetitiveAgent): Time manipulation effects
- And 6 more specialized animations

### Synchronization System

The visualization synchronizes multiple elements:

1. **Laser Rotation**: Matches current agent progress
2. **Hexagon Coloring**: Sides light up as laser passes
3. **Champion Animations**: Activate based on agent processing
4. **Progress Bar**: Reflects overall analysis progress
5. **Status Messages**: Update based on WebSocket events

## Form Handling & Validation

### Form Structure

The form uses **React Hook Form** with **Zod validation**:

```typescript
const form = useForm<AnalysisFormData>({
  defaultValues: {
    gameName: "",
    tagLine: "",
    region: "americas",
    year: 2025,
  },
});
```

### Validation Logic

```typescript
const validateAndSubmit = useCallback((data: AnalysisFormData) => {
  // Validate form data
  if (!data.gameName.trim()) {
    form.setError("gameName", { message: "Game name is required" });
    return;
  }
  if (!data.tagLine.trim()) {
    form.setError("tagLine", { message: "Tag line is required" });
    return;
  }
  if (data.year < MIN_YEAR || data.year > MAX_YEAR) {
    form.setError("year", {
      message: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
    });
    return;
  }

  // Generate session ID and connect
  const newSessionId = uuidv4();
  const connectionParams: ConnectionParams = {
    sessionId: newSessionId,
    gameName: data.gameName.trim(),
    tagLine: data.tagLine.trim(),
    region: data.region,
    year: data.year,
  };

  connect(connectionParams);
}, [form, connect]);
```

### User Experience Features

- **Real-time validation**: Immediate feedback on input
- **Loading states**: Visual feedback during connection
- **Confirmation dialog**: Prevents accidental submissions
- **Accessibility**: Proper form labels and ARIA attributes

## Theme & UI System

### Theme Management

The application uses **next-themes** for theme switching:

```typescript
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
      <Toaster richColors />
    </ThemeProvider>
  );
}
```

### Design System

Based on **shadcn/ui** with custom configurations:

```typescript
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true,
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Color System

The application uses a **consistent color palette**:
- **Primary colors**: HexCore blue (#32B8C6)
- **Agent colors**: Unique colors for each of the 11 agents
- **Status colors**: Green (success), Red (error), Orange (warning)
- **Theme support**: Light/dark mode variants

## Error Handling & User Experience

### Error Boundaries

The application implements **graceful error handling**:

1. **WebSocket Errors**: Connection failures, timeouts
2. **Validation Errors**: Form input validation
3. **Network Errors**: API communication issues
4. **Rendering Errors**: Component failure recovery

### User Feedback Systems

#### 1. Toast Notifications
```typescript
// Success notifications
toast.success("HexCore AI Initiated", {
  description: "Analysis agents are now processing your match data...",
  duration: 4000,
});

// Agent-specific notifications
toast.info(`${championInfo.champion} Agent Activated`, {
  description: message || `Analyzing ${agent.replace("Agent", "")} data...`,
  duration: 3000,
});
```

#### 2. Loading States
- **Connection spinner**: During WebSocket connection
- **Progress indicators**: Throughout analysis
- **Skeleton loaders**: For content placeholders
- **Button states**: Disabled during processing

#### 3. Status Messages
- **Real-time updates**: WebSocket message display
- **Progress percentages**: Visual progress tracking
- **Agent status**: Individual agent completion states
- **Error messages**: Clear error descriptions

### Accessibility Features

- **Semantic HTML**: Proper heading hierarchy
- **ARIA labels**: Screen reader support
- **Keyboard navigation**: Full keyboard accessibility
- **Focus management**: Proper focus handling
- **Color contrast**: WCAG compliant color ratios

## Performance Optimizations

### Code Splitting

The application uses **dynamic imports** and code splitting:

```typescript
// Next.js automatic code splitting
import { AnalysisDashboard } from "@/components/analysis-dashboard";

// Component-level splitting for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

### Animation Performance

#### 1. Hardware Acceleration
```typescript
// Use transform for better performance
<motion.div
  animate={{ 
    x: 0, 
    scale: 1,
    transform: "translateZ(0)" // Force GPU acceleration
  }}
  transition={{ duration: 0.5 }}
/>
```

#### 2. Optimized Re-renders
- **useMemo** for expensive calculations
- **useCallback** for event handlers
- **React.memo** for component memoization
- **Debounced updates** for rapid state changes

### Asset Optimization

#### 1. Image Optimization
- **Next.js Image component**: Automatic optimization
- **SVG optimization**: Inline SVG for animations
- **Lazy loading**: Load components as needed

#### 2. Bundle Optimization
```json
{
  "scripts": {
    "dev": "next dev --turbopack --port=3001",
    "build": "next build",
    "start": "next start"
  }
}
```

### Memory Management

- **Cleanup on disconnect**: WebSocket connection cleanup
- **State reset**: Clear analysis state on completion
- **Event listener cleanup**: Remove listeners on unmount
- **Garbage collection**: Proper object disposal

## Development Workflow

### Environment Setup

#### 1. Environment Variables
```bash
# .env.local
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-api-gateway-url.execute-api.region.amazonaws.com/prod
NEXT_PUBLIC_SERVER_URL=https://your-api-domain.com
```

#### 2. Development Server
```bash
# Install dependencies
pnpm install

# Start development server with Turbopack
pnpm run dev

# Build for production
pnpm run build
```

### Code Quality

#### 1. TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"]
    }
  }
}
```

#### 2. Linting and Formatting
```bash
# Run Biome linter
pnpm run check

# Auto-fix issues
pnpm dlx ultracite fix
```

### Testing Strategy

#### 1. Component Testing
- **Unit tests**: Individual component logic
- **Integration tests**: Component interactions
- **Visual tests**: UI rendering validation

#### 2. WebSocket Testing
- **Mock WebSocket**: Test connection handling
- **Message simulation**: Test message processing
- **Error scenarios**: Test error handling

### Deployment

#### 1. Build Configuration
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  typedRoutes: true,
  output: "export", // Static export for deployment
};

export default nextConfig;
```

#### 2. Deployment Targets
- **Vercel**: Primary deployment platform
- **Netlify**: Alternative static hosting
- **AWS S3 + CloudFront**: Custom CDN setup

## Integration with AWS Backend

### API Gateway WebSocket

The frontend connects to **AWS API Gateway WebSocket API**:

```typescript
const url = `${baseUrl}?sessionId=${sessionId}&gameName=${gameName}&tagLine=${tagLine}&region=${region}&year=${year};
```

### Message Flow

1. **Client Connection**: 
   - Sends connection parameters as query string
   - Establishes WebSocket connection
   - Receives connection confirmation

2. **Analysis Progress**:
   - Receives real-time progress updates
   - Processes agent completion messages
   - Handles synthesis completion

3. **Error Handling**:
   - Processes error messages from backend
   - Displays user-friendly error messages
   - Implements retry logic where appropriate

### Data Contracts

The frontend and backend share **TypeScript types** for consistency:

```typescript
// Shared between frontend and backend
export type WebSocketMessage = {
  status: MessageStatus;
  message: string;
  progress?: number;
  agent?: AgentType;
  synthesis?: Synthesis;
  timestamp: number;
  error?: string;
};
```

## Security Considerations

### Client-Side Security

1. **Input Validation**: All user inputs validated before sending
2. **XSS Prevention**: Proper data sanitization
3. **CSRF Protection**: WebSocket connection validation
4. **Environment Variables**: Sensitive data in environment variables

### WebSocket Security

1. **WSS Protocol**: Secure WebSocket connections
2. **Session Validation**: Unique session IDs
3. **Message Validation**: Type checking for incoming messages
4. **Connection Limits**: Prevent connection abuse

## Future Enhancements

### Planned Features

1. **Advanced Visualizations**:
   - 3D hexagon rendering
   - Interactive agent networks
   - Real-time performance metrics

2. **Enhanced User Experience**:
   - Progressive Web App (PWA) support
   - Offline analysis capabilities
   - Mobile-optimized interface

3. **Performance Improvements**:
   - Web Workers for heavy computations
   - Service worker caching
   - Optimized bundle splitting

### Scalability Considerations

1. **Component Architecture**: Modular design for easy expansion
2. **State Management**: Scalable state patterns
3. **API Integration**: Flexible backend integration
4. **Performance Monitoring**: Built-in performance tracking

## Conclusion

The HexCore AI frontend represents a **sophisticated real-time analysis platform** that combines modern web technologies with thoughtful UX design. The architecture emphasizes:

- **Real-time communication** through WebSocket integration
- **Sophisticated visualization** with custom SVG animations
- **Type-safe development** with comprehensive TypeScript usage
- **Component reusability** through modular architecture
- **Performance optimization** with modern React patterns
- **User experience** through thoughtful error handling and feedback

The system successfully demonstrates how to build complex, real-time applications using Next.js, WebSocket communication, and modern React patterns while maintaining code quality, performance, and user experience standards.

The architecture is designed to be **maintainable, scalable, and extensible**, providing a solid foundation for future enhancements and additional features.
