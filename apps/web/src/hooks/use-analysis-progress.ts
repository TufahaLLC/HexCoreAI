import { useEffect, useState } from "react";
import {
  type AgentType,
  useWebSocketContext,
} from "@/contexts/web-socket-context";

const INITIAL_PROGRESS = 0;

export const useAnalysisProgress = () => {
  const { lastMessage, messageHistory } = useWebSocketContext();

  const [agentProgress, setAgentProgress] = useState<Record<AgentType, number>>(
    {
      BuildAgent: INITIAL_PROGRESS,
      CombatAgent: INITIAL_PROGRESS,
      VisionAgent: INITIAL_PROGRESS,
      EconomyAgent: INITIAL_PROGRESS,
      ChampionAgent: INITIAL_PROGRESS,
      CompetitiveAgent: INITIAL_PROGRESS,
      Synthesizer: INITIAL_PROGRESS,
    }
  );

  useEffect(() => {
    if (lastMessage?.agent && lastMessage.progress) {
      setAgentProgress((prev) => ({
        ...prev,
        [lastMessage.agent as AgentType]: lastMessage.progress as number,
      }));
    }
  }, [lastMessage]);

  const isAnalysisComplete = lastMessage?.status === "completed";
  const hasError = lastMessage?.status === "error";

  return {
    agentProgress,
    isAnalysisComplete,
    hasError,
    messageHistory,
  };
};
