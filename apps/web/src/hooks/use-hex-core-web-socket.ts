"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AgentType as AgentTypeType,
  MessageStatus as MessageStatusType,
  ToolInvocation as ToolInvocationType,
  WebSocketMessage as WebSocketMessageType,
} from "@/contexts/web-socket-context";
import { useWebSocketContext } from "@/contexts/web-socket-context";

// Re-export types for convenience
export type WebSocketMessage = WebSocketMessageType;
export type AgentType = AgentTypeType;
export type ToolInvocation = ToolInvocationType;
export type MessageStatus = MessageStatusType;

// Enhanced types for animation state management
export type AgentProgress = {
  agent: AgentType;
  champion: string;
  laserColor: string;
  status: "started" | "processing" | "completed" | "error";
  progress: number;
  message: string;
  toolInvocation?: ToolInvocation;
};

export type AnimationPhase = {
  phase:
    | "idle"
    | "connecting"
    | "fetching"
    | "analyzing"
    | "completing"
    | "completed"
    | "error";
  progress: number;
  activeAgents: AgentType[];
  completedAgents: AgentType[];
  currentMessage: string;
  transitioning: boolean;
  currentChampion: string | null;
};

// Champion-agent mapping with colors
export const CHAMPION_AGENTS = {
  BuildAgent: { champion: "Jayce", color: "#FFD700", laserColor: "#FFD700" },
  CombatAgent: { champion: "Vi", color: "#FF6B9D", laserColor: "#FF6B9D" },
  VisionAgent: { champion: "Caitlyn", color: "#B8A8DB", laserColor: "#B8A8DB" },
  EconomyAgent: {
    champion: "Camille",
    color: "#4DB8E8",
    laserColor: "#4DB8E8",
  },
  ChampionAgent: {
    champion: "Viktor",
    color: "#FF6B35",
    laserColor: "#FF6B35",
  },
  CompetitiveAgent: {
    champion: "Ekko",
    color: "#00FFB3",
    laserColor: "#00FFB3",
  },
  MacroAgent: {
    champion: "Taliyah",
    color: "#8B4513",
    laserColor: "#8B4513",
  },
  PositioningAgent: {
    champion: "Kaisa",
    color: "#9370DB",
    laserColor: "#9370DB",
  },
  TemporalAgent: {
    champion: "Zilean",
    color: "#FFD700",
    laserColor: "#FFD700",
  },
  SynergyAgent: {
    champion: "Braum",
    color: "#4682B4",
    laserColor: "#4682B4",
  },
  AdaptationAgent: {
    champion: "Gnar",
    color: "#32CD32",
    laserColor: "#32CD32",
  },
  Synthesizer: {
    champion: "Heimerdinger",
    color: "#FF69B4",
    laserColor: "#FF69B4",
  },
} as const;

// Progress calculation constants for 11-agent system
const AGENT_COUNT = 11;
const FULL_PROGRESS_PERCENTAGE = 100;
const BASE_AGENT_PROGRESS = FULL_PROGRESS_PERCENTAGE / AGENT_COUNT; // ~9.09%
const MAX_PROGRESS = 100;

// Progress thresholds for 11-agent system
export const PROGRESS_THRESHOLDS = {
  CONNECTION_START: 0,
  DATA_FETCHING_START: 1,
  DATA_FETCHING_COMPLETE: 8, // Reduced from 15 to accommodate more agents
  FIRST_AGENT_START: 9,
  LAST_AGENT_COMPLETE: 91, // 11 agents * ~8.27% each
  SYNTHESIS_START: 92,
  SYNTHESIS_COMPLETE: 98,
  ANALYSIS_COMPLETE: 100,
} as const;

// Calculate overall progress based on agent index and internal progress
export const calculateAgentProgress = (
  agentIndex: number,
  agentInternalProgress: number
): number =>
  Math.min(
    agentIndex * BASE_AGENT_PROGRESS +
      (agentInternalProgress * BASE_AGENT_PROGRESS) / FULL_PROGRESS_PERCENTAGE,
    MAX_PROGRESS
  );

// Get current agent from overall progress percentage
export const getCurrentAgentFromProgress = (progress: number): AgentType => {
  const agentOrder = getAgentOrder();
  const agentIndex = Math.floor(progress / BASE_AGENT_PROGRESS);
  return agentOrder[Math.min(agentIndex, agentOrder.length - 1)];
};

// Determine current animation phase from progress
export const getCurrentPhase = (progress: number): AnimationPhase["phase"] => {
  if (progress === 0) {
    return "idle";
  }
  if (progress < PROGRESS_THRESHOLDS.DATA_FETCHING_COMPLETE) {
    return "fetching";
  }
  if (progress < PROGRESS_THRESHOLDS.SYNTHESIS_START) {
    return "analyzing";
  }
  if (progress < PROGRESS_THRESHOLDS.ANALYSIS_COMPLETE) {
    return "completing";
  }
  return "completed";
};

export type ConnectionParams = {
  sessionId: string;
  gameName: string;
  tagLine: string;
  region: string;
  year: number;
};

export type UseHexCoreWebSocketReturn = {
  isConnected: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  animationState: AnimationPhase;
  progress: number;
  currentAgent: AgentType | null;
  currentChampion: string | null;
  currentLaserColor: string;
  agentProgress: Map<AgentType, AgentProgress>;
  messages: WebSocketMessage[];
  error: string | null;
  connect: (params: ConnectionParams) => void;
  disconnect: () => void;
};

// Helper function to determine animation phase based on status
const getAnimationPhase = (
  status: MessageStatus,
  currentPhase: AnimationPhase["phase"],
  agent?: AgentType
): { phase: AnimationPhase["phase"]; transitioning: boolean } => {
  const transitioning = false;

  switch (status) {
    case "started": {
      if (currentPhase === "idle") {
        return { phase: "connecting", transitioning };
      }
      if (agent) {
        return { phase: "analyzing", transitioning: true };
      }
      return { phase: currentPhase, transitioning };
    }

    case "processing": {
      return { phase: agent ? "analyzing" : "fetching", transitioning };
    }

    case "completed": {
      if (agent === "Synthesizer") {
        return { phase: "completing", transitioning: true };
      }
      if (agent) {
        return { phase: "analyzing", transitioning: true };
      }
      return { phase: currentPhase, transitioning };
    }

    case "error": {
      return { phase: "error", transitioning };
    }

    default: {
      return { phase: currentPhase, transitioning };
    }
  }
};

const SYNTHESIS_DELAY_MS = 1000;

// Helper function to get agent order for progression
const getAgentOrder = (): AgentType[] => [
  "BuildAgent",
  "CombatAgent",
  "VisionAgent",
  "EconomyAgent",
  "ChampionAgent",
  "CompetitiveAgent",
  "MacroAgent",
  "PositioningAgent",
  "TemporalAgent",
  "SynergyAgent",
  "AdaptationAgent",
  "Synthesizer",
];

// Create initial animation state
const createInitialAnimationState = (): AnimationPhase => ({
  phase: "idle",
  progress: 0,
  activeAgents: [],
  completedAgents: [],
  currentMessage: "",
  transitioning: false,
  currentChampion: null,
});

// Create initial agent progress map
const createInitialAgentProgress = (): Map<AgentType, AgentProgress> => {
  const progress = new Map<AgentType, AgentProgress>();
  const agentOrder = getAgentOrder();

  for (const agent of agentOrder) {
    progress.set(agent, {
      agent,
      champion: CHAMPION_AGENTS[agent].champion,
      laserColor: CHAMPION_AGENTS[agent].laserColor,
      status: "started",
      progress: 0,
      message: "",
    });
  }

  return progress;
};

export const useHexCoreWebSocket = (): UseHexCoreWebSocketReturn => {
  const {
    isConnected,
    lastMessage,
    messageHistory,
    connect: wsConnect,
    disconnect: wsDisconnect,
  } = useWebSocketContext();

  const [animationState, setAnimationState] = useState<AnimationPhase>(
    createInitialAnimationState
  );
  const [agentProgress, setAgentProgress] = useState<
    Map<AgentType, AgentProgress>
  >(createInitialAgentProgress);

  // Process WebSocket messages and update animation state
  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    const { status, message, progress: messageProgress, agent } = lastMessage;

    setAnimationState((prevState) => {
      const { phase: newPhase, transitioning } = getAnimationPhase(
        status,
        prevState.phase,
        agent
      );

      const newState = {
        ...prevState,
        phase: newPhase,
        progress: messageProgress ?? prevState.progress,
        currentMessage: message,
        transitioning,
      };

      if (agent && (status === "started" || status === "processing")) {
        newState.currentChampion = CHAMPION_AGENTS[agent].champion;
      }

      return newState;
    });

    // Handle synthesis completion
    if (status === "completed" && agent === "Synthesizer") {
      setTimeout(() => {
        setAnimationState((prev) => ({ ...prev, phase: "completed" }));
      }, SYNTHESIS_DELAY_MS);
    }

    // Update agent progress map
    if (agent) {
      setAgentProgress((prevProgress) => {
        const newProgress = new Map(prevProgress);
        const currentAgentProgress = newProgress.get(agent);

        if (currentAgentProgress) {
          newProgress.set(agent, {
            ...currentAgentProgress,
            status,
            progress: messageProgress ?? currentAgentProgress.progress,
            message,
            toolInvocation: lastMessage.toolInvocation,
          });
        }

        // Update active and completed agents
        if (status === "processing" || status === "started") {
          setAnimationState((prev) => ({
            ...prev,
            activeAgents: prev.activeAgents.includes(agent)
              ? prev.activeAgents
              : [...prev.activeAgents, agent],
          }));
        } else if (status === "completed") {
          setAnimationState((prev) => ({
            ...prev,
            activeAgents: prev.activeAgents.filter((a) => a !== agent),
            completedAgents: prev.completedAgents.includes(agent)
              ? prev.completedAgents
              : [...prev.completedAgents, agent],
          }));
        }

        return newProgress;
      });
    }
  }, [lastMessage]);

  // Reset state when disconnecting
  useEffect(() => {
    if (!isConnected && animationState.phase !== "idle") {
      setAnimationState(createInitialAnimationState());
      setAgentProgress(createInitialAgentProgress());
    }
  }, [isConnected, animationState.phase]);

  // Computed values
  const currentAgent = useMemo(() => {
    const activeAgents = animationState.activeAgents;
    return activeAgents.length > 0 ? (activeAgents.at(-1) ?? null) : null;
  }, [animationState.activeAgents]);

  const currentChampion = useMemo(() => {
    if (!currentAgent) {
      return null;
    }
    return CHAMPION_AGENTS[currentAgent].champion;
  }, [currentAgent]);

  const currentLaserColor = useMemo(() => {
    if (!currentAgent) {
      return "#4DB8E8"; // Default blue for fetching
    }
    return CHAMPION_AGENTS[currentAgent].laserColor;
  }, [currentAgent]);

  const isProcessing = useMemo(
    () =>
      animationState.phase === "connecting" ||
      animationState.phase === "fetching" ||
      animationState.phase === "analyzing",
    [animationState.phase]
  );

  const isComplete = useMemo(
    () => animationState.phase === "completed",
    [animationState.phase]
  );

  const error = useMemo(() => lastMessage?.error ?? null, [lastMessage]);

  return {
    isConnected,
    isProcessing,
    isComplete,
    animationState,
    progress: animationState.progress,
    currentAgent,
    currentChampion,
    currentLaserColor,
    agentProgress,
    messages: messageHistory,
    error,
    connect: (params: ConnectionParams) => {
      wsConnect(params);
    },
    disconnect: wsDisconnect,
  };
};
