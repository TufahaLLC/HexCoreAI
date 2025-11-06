"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

// Message types based on architecture
export type MessageStatus = "started" | "processing" | "completed" | "error";

export type AgentType =
  | "BuildAgent"
  | "CombatAgent"
  | "VisionAgent"
  | "EconomyAgent"
  | "ChampionAgent"
  | "CompetitiveAgent"
  | "Synthesizer";

export type ToolInvocation = {
  tool: string;
  status: "started" | "completed";
  parameters?: Record<string, unknown>;
  resultPreview?: string;
};

export type AgentResult = {
  agentName: AgentType;
  status: "success" | "failed";
  analysis: string;
  timestamp: number;
  toolsInvoked?: string[];
};

export type SynthesisSummary = {
  overallScore: number;
  strengths: string[];
  improvements: string[];
};

export type Synthesis = {
  agents: AgentResult[];
  summary: SynthesisSummary;
};

export type WebSocketMessage = {
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
};

type WebSocketContextValue = {
  // Connection state
  readyState: ReadyState;
  isConnected: boolean;
  isConnecting: boolean;

  // Message handling
  lastMessage: WebSocketMessage | null;
  messageHistory: WebSocketMessage[];

  // Connection management
  connect: (
    sessionId: string,
    puuid: string,
    region: string,
    year: number
  ) => void;
  disconnect: () => void;

  // Session info
  sessionId: string | null;
  puuid: string | null;
};

const WebSocketContext = createContext<WebSocketContextValue | undefined>(
  undefined
);

type WebSocketProviderProps = {
  children: React.ReactNode;
  websocketUrl?: string; // Optional override for testing
};

// Connection constants
const NORMAL_CLOSURE_CODE = 1000;
const GOING_AWAY_CODE = 1001;
const RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_INTERVAL = 1000;
const MAX_RECONNECT_INTERVAL = 16_000;
const HEARTBEAT_TIMEOUT = 60_000; // 1 minute
const HEARTBEAT_INTERVAL = 25_000; // 25 seconds (under 29s API Gateway timeout)

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  websocketUrl,
}) => {
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [puuid, setPuuid] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Configure react-use-websocket
  const { lastJsonMessage, readyState, getWebSocket } = useWebSocket(
    socketUrl,
    {
      // Connection lifecycle callbacks
      onOpen: () => {
        // Connection established
      },
      onClose: () => {
        // Connection closed
      },
      onError: () => {
        // Connection error
      },

      // Reconnection strategy
      shouldReconnect: (closeEvent) => {
        // Reconnect on abnormal closures (not intentional disconnect)
        return (
          closeEvent.code !== NORMAL_CLOSURE_CODE &&
          closeEvent.code !== GOING_AWAY_CODE
        );
      },
      reconnectAttempts: RECONNECT_ATTEMPTS,
      reconnectInterval: (attemptNumber) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        return Math.min(
          BASE_RECONNECT_INTERVAL * 2 ** attemptNumber,
          MAX_RECONNECT_INTERVAL
        );
      },

      // Keep connection alive
      heartbeat: {
        message: JSON.stringify({ action: "ping" }),
        returnMessage: JSON.stringify({ action: "pong" }),
        timeout: HEARTBEAT_TIMEOUT,
        interval: HEARTBEAT_INTERVAL,
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
      setMessageHistory((prev) => [...prev, message]);
    }
  }, [lastJsonMessage]);

  // Connection management
  const connect = useCallback(
    (
      connSessionId: string,
      connPuuid: string,
      region: string,
      year: number
    ) => {
      const baseUrl = websocketUrl || process.env.NEXT_PUBLIC_WEBSOCKET_URL;

      if (!baseUrl) {
        throw new Error("WebSocket URL not configured");
      }

      // Build connection URL with query parameters
      const url = `${baseUrl}?sessionId=${encodeURIComponent(connSessionId)}&puuid=${encodeURIComponent(connPuuid)}&region=${encodeURIComponent(region)}&year=${year}`;

      setSocketUrl(url);
      setSessionId(connSessionId);
      setPuuid(connPuuid);
      setMessageHistory([]);
      setLastMessage(null);
    },
    [websocketUrl]
  );

  const disconnect = useCallback(() => {
    setSocketUrl(null);
    setSessionId(null);
    setPuuid(null);

    const ws = getWebSocket();
    if (ws) {
      ws.close(NORMAL_CLOSURE_CODE, "Client initiated disconnect");
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
    throw new Error(
      "useWebSocketContext must be used within WebSocketProvider"
    );
  }
  return context;
};

// Utility function to get connection status label
export const getConnectionStatusLabel = (readyState: ReadyState): string => {
  const statusMap = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Connected",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  };
  return statusMap[readyState] || "Unknown";
};
