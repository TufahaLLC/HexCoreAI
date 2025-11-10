import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import {
  getConnectionStatusLabel,
  useWebSocketContext,
} from "@/contexts/web-socket-context";
import type {
  AnalysisFormData,
  AnalysisProgress,
  CompletedAnalysis,
  ConnectionParams,
  UseAnalysisDashboardReturn,
} from "@/types/analysis";
import { MAX_YEAR, MIN_YEAR } from "@/types/analysis";

export const useAnalysisDashboard = (): UseAnalysisDashboardReturn => {
  const {
    readyState,
    isConnected,
    isConnecting,
    lastMessage,
    messageHistory,
    connect,
    disconnect,
    sessionId,
    gameName,
    tagLine,
  } = useWebSocketContext();

  // Form setup
  const form = useForm<AnalysisFormData>({
    defaultValues: {
      gameName: "",
      tagLine: "",
      region: "americas",
      year: 2025,
    },
  });

  // Analysis progress state
  const [progress, setProgress] = useState<AnalysisProgress>({
    currentProgress: 0,
    analysisStatus: "",
    totalMatches: 0,
    processedMatches: 0,
    agentUpdates: {},
  });

  // Completed analysis state
  const [completedAnalysis, setCompletedAnalysis] =
    useState<CompletedAnalysis | null>(null);

  // Update state based on WebSocket messages
  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    setProgress((prev) => ({
      ...prev,
      analysisStatus: lastMessage.message,
    }));

    if (lastMessage.progress !== undefined) {
      setProgress((prev) => ({
        ...prev,
        currentProgress: lastMessage.progress || 0,
      }));
    }

    if (lastMessage.totalMatches) {
      setProgress((prev) => ({
        ...prev,
        totalMatches: lastMessage.totalMatches || 0,
      }));
    }

    if (lastMessage.processedMatches) {
      setProgress((prev) => ({
        ...prev,
        processedMatches: lastMessage.processedMatches || 0,
      }));
    }

    if (lastMessage.agent) {
      setProgress((prev) => ({
        ...prev,
        agentUpdates: {
          ...prev.agentUpdates,
          [lastMessage.agent as string]: lastMessage.message,
        },
      }));
    }

    if (lastMessage.status === "completed" && lastMessage.synthesis) {
      setCompletedAnalysis({
        resultId: lastMessage.resultId,
        s3Key: lastMessage.s3Key,
        synthesis: lastMessage.synthesis,
      });
    }
  }, [lastMessage]);

  // Form validation and submission
  const validateAndSubmit = useCallback(
    (data: AnalysisFormData) => {
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

      // Reset analysis state
      setProgress({
        currentProgress: 0,
        analysisStatus: "",
        totalMatches: 0,
        processedMatches: 0,
        agentUpdates: {},
      });
      setCompletedAnalysis(null);

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
    },
    [form, connect]
  );

  // Stop analysis
  const handleStopAnalysis = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const connectionStatus = getConnectionStatusLabel(readyState);

  return {
    // Form
    form,
    handleSubmit: validateAndSubmit,

    // Connection
    connectionStatus,
    isConnected,
    isConnecting,
    sessionId,
    gameName,
    tagLine,

    // Progress
    progress,

    // Results
    completedAnalysis,

    // Messages
    messageHistory,

    // Actions
    handleStartAnalysis: validateAndSubmit,
    handleStopAnalysis,
  };
};
