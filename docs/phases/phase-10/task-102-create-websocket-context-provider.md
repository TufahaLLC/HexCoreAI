# Task 10.2: Create WebSocket Context Provider

Create a React Context that manages the WebSocket connection, lifecycle, reconnection, and message history using `react-use-websocket`.

## Subtasks

- [x] Create `apps/web/src/contexts/WebSocketContext.tsx`
- [x] Paste the implementation below
- [ ] Ensure `NEXT_PUBLIC_WEBSOCKET_URL` is set (see Task 10.5)

## File: `apps/web/src/contexts/WebSocketContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

// Message types based on architecture
export type MessageStatus = 'started' | 'processing' | 'completed' | 'error';

export type AgentType = 
  | 'BuildAgent' 
  | 'CombatAgent' 
  | 'VisionAgent' 
  | 'EconomyAgent' 
  | 'ChampionAgent' 
  | 'CompetitiveAgent' 
  | 'Synthesizer';

export interface ToolInvocation {
  tool: string;
  status: 'started' | 'completed';
  parameters?: Record<string, any>;
  resultPreview?: string;
}

export interface AgentResult {
  agentName: AgentType;
  status: 'success' | 'failed';
  analysis: string;
  timestamp: number;
  toolsInvoked?: string[];
}

export interface SynthesisSummary {
  overallScore: number;
  strengths: string[];
  improvements: string[];
}

export interface Synthesis {
  agents: AgentResult[];
  summary: SynthesisSummary;
}

export interface WebSocketMessage {
  status: MessageStatus;
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
}

interface WebSocketContextValue {
  // Connection state
  readyState: ReadyState;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Message handling
  lastMessage: WebSocketMessage | null;
  messageHistory: WebSocketMessage[];
  
  // Connection management
  connect: (sessionId: string, puuid: string, region: string, year: number) => void;
  disconnect: () => void;
  
  // Session info
  sessionId: string | null;
  puuid: string | null;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  websocketUrl?: string; // Optional override for testing
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children,
  websocketUrl 
}) => {
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [puuid, setPuuid] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Configure react-use-websocket
  const { 
    sendMessage,
    lastJsonMessage,
    readyState,
    getWebSocket
  } = useWebSocket(
    socketUrl,
    {
      // Connection lifecycle callbacks
      onOpen: () => {
        console.log('[WebSocket] Connection established');
      },
      onClose: (event) => {
        console.log('[WebSocket] Connection closed', event.code, event.reason);
      },
      onError: (event) => {
        console.error('[WebSocket] Connection error', event);
      },
      
      // Reconnection strategy
      shouldReconnect: (closeEvent) => {
        // Reconnect on abnormal closures (not intentional disconnect)
        return closeEvent.code !== 1000 && closeEvent.code !== 1001;
      },
      reconnectAttempts: 5,
      reconnectInterval: (attemptNumber) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        return Math.min(1000 * Math.pow(2, attemptNumber), 16000);
      },
      
      // Keep connection alive
      heartbeat: {
        message: JSON.stringify({ action: 'ping' }),
        returnMessage: JSON.stringify({ action: 'pong' }),
        timeout: 60000, // 1 minute
        interval: 25000, // 25 seconds (under 29s API Gateway timeout)
      },
      
      // Parse messages as JSON
      share: false, // Don't share connection between components
      filter: () => true, // Accept all messages
      retryOnError: true,
    },
    // Only connect when socketUrl is set
    socketUrl !== null
  );

  // Process incoming messages
  useEffect(() => {
    if (lastJsonMessage) {
      const message = lastJsonMessage as WebSocketMessage;
      setLastMessage(message);
      setMessageHistory(prev => [...prev, message]);
      
      console.log('[WebSocket] Message received:', message);
      
      // Handle error status
      if (message.status === 'error') {
        console.error('[WebSocket] Error message:', message.message, message.error);
      }
      
      // Handle completion
      if (message.status === 'completed') {
        console.log('[WebSocket] Analysis completed:', message.resultId);
      }
    }
  }, [lastJsonMessage]);

  // Connection management
  const connect = useCallback((
    sessionId: string,
    puuid: string,
    region: string,
    year: number
  ) => {
    const baseUrl = websocketUrl || process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    
    if (!baseUrl) {
      throw new Error('WebSocket URL not configured');
    }
    
    // Build connection URL with query parameters
    const url = `${baseUrl}?sessionId=${encodeURIComponent(sessionId)}&puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}&year=${year}` ;
    
    console.log('[WebSocket] Connecting to:', url);
    
    setSocketUrl(url);
    setSessionId(sessionId);
    setPuuid(puuid);
    setMessageHistory([]);
    setLastMessage(null);
  }, [websocketUrl]);

  const disconnect = useCallback(() => {
    console.log('[WebSocket] Disconnecting...');
    setSocketUrl(null);
    setSessionId(null);
    setPuuid(null);
    
    const ws = getWebSocket();
    if (ws) {
      ws.close(1000, 'Client initiated disconnect');
    }
  }, [getWebSocket]);

  // Derived connection states
  const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  const value: WebSocketContextValue = {
    readyState,
    isConnected,
    isConnecting,
    lastMessage,
    messageHistory,
    connect,
    disconnect,
    sessionId,
    puuid,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for consuming WebSocket context
export const useWebSocketContext = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};

// Utility function to get connection status label
export const getConnectionStatusLabel = (readyState: ReadyState): string => {
  const statusMap = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Connected',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  };
  return statusMap[readyState] || 'Unknown';
};
```

## Validation

- [x] TypeScript builds in `apps/web`
- [x] `useWebSocketContext()` available to client components

## Next

Proceed to [Task 10.3](./task-103-app-level-integration.md) to wrap the app with the provider.
