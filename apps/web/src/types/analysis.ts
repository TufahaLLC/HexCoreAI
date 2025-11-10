import type { UseFormReturn } from "react-hook-form";

/**
 * Analysis Dashboard Types and Constants
 */

// Form validation constants
export const MIN_YEAR = 2020;
export const MAX_YEAR = 2030;
export const DEFAULT_YEAR = 2025;

// Form data types
export type AnalysisFormData = {
  gameName: string;
  tagLine: string;
  region: "americas" | "europe" | "asia";
  year: number;
};

// Analysis state types
export type AnalysisProgress = {
  currentProgress: number;
  analysisStatus: string;
  totalMatches: number;
  processedMatches: number;
  agentUpdates: Record<string, string>;
};

export type CompletedAnalysis = {
  resultId?: string;
  s3Key?: string;
  synthesis: {
    summary: {
      overallScore: number;
      strengths: string[];
      improvements: string[];
    };
    agents: Array<{
      agentName: string;
      status: string;
    }>;
  };
};

// Connection parameters
export type ConnectionParams = {
  sessionId: string;
  gameName: string;
  tagLine: string;
  region: string;
  year: number;
};

// Return type for useAnalysisDashboard hook
export type UseAnalysisDashboardReturn = {
  // Form
  form: UseFormReturn<AnalysisFormData>;
  handleSubmit: (data: AnalysisFormData) => void;

  // Connection
  connectionStatus: string;
  isConnected: boolean;
  isConnecting: boolean;
  sessionId: string | null;
  gameName: string | null;
  tagLine: string | null;

  // Progress
  progress: AnalysisProgress;

  // Results
  completedAnalysis: CompletedAnalysis | null;

  // Messages
  messageHistory: Array<{
    timestamp: number;
    status: string;
    message: string;
    agent?: string;
  }>;

  // Actions
  handleStartAnalysis: (data: AnalysisFormData) => void;
  handleStopAnalysis: () => void;
};
