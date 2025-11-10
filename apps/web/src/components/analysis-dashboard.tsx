"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnalysisConfirmationDialog } from "@/components/analysis-confirmation-dialog";
import { AnalysisForm } from "@/components/analysis-form";
import { AnalysisResults } from "@/components/analysis-results";
import { ConnectionStatus } from "@/components/connection-status";
import { HextechHexagon } from "@/components/hextech-hexagon";
import { MessageHistory } from "@/components/message-history";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VelKozLaser } from "@/components/vel-koz-laser";
import { useAnalysisDashboard } from "@/hooks/use-analysis-dashboard";
import { useHexCoreWebSocket } from "@/hooks/use-hex-core-web-socket";
import type { AnalysisFormData } from "@/types/analysis";

// Animation constants
const FORM_EXIT_DURATION = 0.5;
const PROGRESS_ENTRANCE_DELAY = 0.2;
const PROGRESS_ENTRANCE_DURATION = 0.6;
const HEXAGON_ENTRANCE_DURATION = 0.8;
const HEXAGON_SCALE_FROM = 0.8;
const HEXAGON_SCALE_TO = 1;
const PROGRESS_TEXT_DELAY = 0.3;
const DEFAULT_HEXAGON_SIZE = 300;

// TEMPORARY: Force connection for testing - remove this in production
const FORCE_CONNECTED_FOR_TESTING = false;

export const AnalysisDashboard = () => {
  const {
    // Form
    form,

    // Connection
    connectionStatus,
    isConnected,
    isConnecting,

    // Results
    completedAnalysis,

    // Messages
    messageHistory,

    // Actions
    handleStartAnalysis,
    handleStopAnalysis,
  } = useAnalysisDashboard();

  // Use forced connection for testing
  const isActuallyConnected = isConnected || FORCE_CONNECTED_FOR_TESTING;

  // WebSocket state for hexagon visualization
  const {
    isProcessing,
    isComplete,
    animationState,
    progress,
    currentChampion,
    currentLaserColor,
    error,
  } = useHexCoreWebSocket();

  // Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] =
    useState<AnalysisFormData | null>(null);

  // Track laser rotation for hexagon coloring
  const [laserRotation, setLaserRotation] = useState(0);

  // Handle form submission - show confirmation dialog
  const handleFormSubmit = (data: AnalysisFormData) => {
    setPendingFormData(data);
    setShowConfirmDialog(true);
  };

  // Handle confirmation - actually start analysis
  const handleConfirmAnalysis = () => {
    if (pendingFormData) {
      setShowConfirmDialog(false);
      handleStartAnalysis(pendingFormData);
    }
  };

  // Toast notifications for analysis lifecycle
  useEffect(() => {
    if (isActuallyConnected && !isConnecting) {
      toast.success("HexCore AI Initiated", {
        description: "Analysis agents are now processing your match data...",
        duration: 4000,
      });
    }
  }, [isActuallyConnected, isConnecting]);

  return (
    <div className="relative min-h-screen p-6">
      {/* Header - Only shown when not connected */}
      {!isActuallyConnected && (
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl tracking-tight">
            HexCore AI Analysis Dashboard
          </h1>
          <p className="text-muted-foreground">
            Analyze your League of Legends match performance with AI-powered
            insights
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AnalysisConfirmationDialog
        formData={pendingFormData}
        isConnecting={isConnecting}
        onConfirm={handleConfirmAnalysis}
        onOpenChange={setShowConfirmDialog}
        open={showConfirmDialog}
      />

      {/* Connection Form - Hidden when connected */}
      <AnimatePresence mode="wait">
        {!isActuallyConnected && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-12"
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 1, y: 0 }}
            key="form-card"
            transition={{ duration: FORM_EXIT_DURATION }}
          >
            <Card className="w-full max-w-4xl">
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
                  isDisabled={isActuallyConnected}
                  onSubmit={handleFormSubmit}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Sidebar - Connection Status and Controls - Only shown when connected */}
      <AnimatePresence mode="wait">
        {isActuallyConnected && (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 z-0 w-64 space-y-4"
            exit={{ opacity: 0, x: 20 }}
            initial={{ opacity: 0, x: 20 }}
            key="sidebar"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Connection Status and Controls */}
            <Card className="border-border/60 bg-background/80 shadow-lg backdrop-blur">
              <CardContent className="space-y-4 pt-6">
                <ConnectionStatus
                  isConnected={isActuallyConnected}
                  status={
                    FORCE_CONNECTED_FOR_TESTING
                      ? "Connected (Testing)"
                      : connectionStatus
                  }
                />
                <button
                  className="w-full rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
                  onClick={handleStopAnalysis}
                  type="button"
                >
                  Stop Analysis
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center - Hexagon Analysis Progression - Only shown when connected */}
      <AnimatePresence mode="wait">
        {isActuallyConnected && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 flex flex-col"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            key="center-progress"
            transition={{
              duration: PROGRESS_ENTRANCE_DURATION,
              delay: PROGRESS_ENTRANCE_DELAY,
              ease: "easeOut",
            }}
          >
            {/* Full Screen Hexagon Container */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
              <motion.div
                animate={{ opacity: 1, scale: HEXAGON_SCALE_TO }}
                className="relative"
                initial={{ opacity: 0, scale: HEXAGON_SCALE_FROM }}
                style={{ width: "90vh", height: "90vh" }}
                transition={{
                  duration: HEXAGON_ENTRANCE_DURATION,
                  ease: "easeOut",
                }}
              >
                {/* SVG Container - Full Screen */}
                <svg
                  className="h-full w-full"
                  preserveAspectRatio="xMidYMid meet"
                  viewBox={`0 0 ${DEFAULT_HEXAGON_SIZE} ${DEFAULT_HEXAGON_SIZE}`}
                >
                  <title>Hextech Analysis Visualization</title>
                  <HextechHexagon
                    championActive={currentChampion}
                    glowColor="#FFFFFF"
                    laserRotation={laserRotation}
                    size={DEFAULT_HEXAGON_SIZE}
                  />
                  <VelKozLaser
                    isActive={isProcessing}
                    onRotationUpdate={setLaserRotation}
                    progress={progress}
                    rotationSpeed={20}
                    size={DEFAULT_HEXAGON_SIZE}
                  />
                </svg>
              </motion.div>

              {/* Completion State */}
              {isComplete && (
                <div className="-translate-y-1/2 absolute inset-x-0 top-1/2 text-center font-semibold text-6xl text-green-500">
                  ✓ Analysis Complete!
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="-translate-y-1/2 absolute inset-x-0 top-1/2 text-center font-semibold text-4xl text-red-500">
                  Error: {error}
                </div>
              )}
            </div>

            {/* Status Message and Progress Bar at Bottom */}
            <div className="w-full space-y-3 px-8 pb-8">
              {/* Status Message */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                transition={{
                  delay: PROGRESS_TEXT_DELAY,
                  duration: 0.5,
                }}
              >
                <div className="font-medium text-lg text-white/90">
                  {animationState.currentMessage}
                </div>
              </motion.div>

              {/* Progress Bar */}
              <Progress
                className="h-3 w-full"
                style={{
                  backgroundColor: `${currentLaserColor}20`,
                }}
                value={progress}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed Analysis Results */}
      {completedAnalysis && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-6 bottom-6 z-10 w-96"
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
        >
          <AnalysisResults analysis={completedAnalysis} />
        </motion.div>
      )}

      {/* Message History */}
      {messageHistory.length > 0 && (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-6 left-6 z-10 w-96"
          exit={{ opacity: 0, x: 20 }}
          initial={{ opacity: 0, x: 20 }}
        >
          <MessageHistory messages={messageHistory} />
        </motion.div>
      )}
    </div>
  );
};
