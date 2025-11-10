"use client";

import { AnalysisForm } from "@/components/analysis-form";
import { AnalysisProgress } from "@/components/analysis-progress";
import { AnalysisResults } from "@/components/analysis-results";
import { ConnectionStatus } from "@/components/connection-status";
import { MessageHistory } from "@/components/message-history";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAnalysisDashboard } from "@/hooks/use-analysis-dashboard";

export const AnalysisDashboard = () => {
  const {
    // Form
    form,

    // Connection
    connectionStatus,
    isConnected,
    isConnecting,
    sessionId,
    gameName,
    tagLine,

    // Results
    completedAnalysis,

    // Messages
    messageHistory,

    // Actions
    handleStartAnalysis,
    handleStopAnalysis,
  } = useAnalysisDashboard();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl tracking-tight">
          HexCore AI Analysis Dashboard
        </h1>
        <p className="text-muted-foreground">
          Analyze your League of Legends match performance with AI-powered
          insights
        </p>
      </div>

      {/* Connection Form */}
      <Card>
        <CardHeader>
          <CardTitle>Start Analysis</CardTitle>
          <CardDescription>
            Enter your Riot ID and select analysis parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalysisForm
            form={form}
            isConnecting={isConnecting}
            isDisabled={isConnected}
            onSubmit={handleStartAnalysis}
          />

          <div className="mt-6">
            <ConnectionStatus
              gameName={gameName}
              isConnected={isConnected}
              sessionId={sessionId}
              status={connectionStatus}
              tagLine={tagLine}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stop Analysis Button */}
      {isConnected && (
        <Card>
          <CardContent className="pt-6">
            <button
              className="w-full rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
              onClick={handleStopAnalysis}
              type="button"
            >
              Stop Analysis
            </button>
          </CardContent>
        </Card>
      )}

      {/* Progress Section */}
      {isConnected && <AnalysisProgress />}

      {/* Completed Analysis Results */}
      {completedAnalysis && <AnalysisResults analysis={completedAnalysis} />}

      {/* Message History */}
      {messageHistory.length > 0 && (
        <MessageHistory messages={messageHistory} />
      )}
    </div>
  );
};
