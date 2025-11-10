"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useHexCoreWebSocket } from "@/hooks/use-hex-core-web-socket";
import { AgentTransitionLaser } from "./agent-transition-laser";
import { BraumAnimation } from "./champion-animations/braum-animation";
import { CaitlynAnimation } from "./champion-animations/caitlyn-animation";
import { CamilleAnimation } from "./champion-animations/camille-animation";
import { EkkoAnimation } from "./champion-animations/ekko-animation";
import { GnarAnimation } from "./champion-animations/gnar-animation";
import { JayceAnimation } from "./champion-animations/jayce-animation";
import { KaisaAnimation } from "./champion-animations/kaisa-animation";
import { TaliyahAnimation } from "./champion-animations/taliyah-animation";
import { ViAnimation } from "./champion-animations/vi-animation";
import { ViktorAnimation } from "./champion-animations/viktor-animation";
import { ZileanAnimation } from "./champion-animations/zilean-animation";
import { HeimerdingerSynthesis } from "./heimerdinger-synthesis-animation";
import { HextechHexagon } from "./hextech-hexagon";
import { VelKozLaser } from "./vel-koz-laser";

const DEFAULT_HEXAGON_SIZE = 300;

const ChampionAnimations = ({
  currentAgent,
  progress,
}: {
  currentAgent: string | null;
  progress: number;
}) => {
  if (!currentAgent) {
    return null;
  }

  switch (currentAgent) {
    case "BuildAgent":
      return <JayceAnimation isActive={true} progress={progress} />;
    case "CombatAgent":
      return <ViAnimation isActive={true} progress={progress} />;
    case "VisionAgent":
      return <CaitlynAnimation isActive={true} progress={progress} />;
    case "EconomyAgent":
      return <CamilleAnimation isActive={true} progress={progress} />;
    case "ChampionAgent":
      return <ViktorAnimation isActive={true} progress={progress} />;
    case "CompetitiveAgent":
      return <EkkoAnimation isActive={true} progress={progress} />;
    case "MacroAgent":
      return <TaliyahAnimation isActive={true} progress={progress} />;
    case "PositioningAgent":
      return <KaisaAnimation isActive={true} progress={progress} />;
    case "TemporalAgent":
      return <ZileanAnimation isActive={true} progress={progress} />;
    case "SynergyAgent":
      return <BraumAnimation isActive={true} progress={progress} />;
    case "AdaptationAgent":
      return <GnarAnimation isActive={true} progress={progress} />;
    default:
      return null;
  }
};

export const AnalysisProgress = () => {
  const {
    isConnected,
    isProcessing,
    isComplete,
    animationState,
    progress,
    currentAgent,
    currentChampion,
    currentLaserColor,
    agentProgress,
    error,
  } = useHexCoreWebSocket();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {currentChampion
            ? `${currentChampion} Analysis`
            : "Analysis Progress"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hextech Visualization */}
        <div className="relative flex justify-center py-8">
          <div className="relative">
            {/* SVG Container */}
            <svg
              height={DEFAULT_HEXAGON_SIZE}
              viewBox={`0 0 ${DEFAULT_HEXAGON_SIZE} ${DEFAULT_HEXAGON_SIZE}`}
              width={DEFAULT_HEXAGON_SIZE}
            >
              <title>Hextech Analysis Visualization</title>
              <HextechHexagon
                championActive={currentChampion}
                glowColor={currentLaserColor}
                isActive={isProcessing}
                progress={progress}
                size={DEFAULT_HEXAGON_SIZE}
              />
              <VelKozLaser
                isActive={isProcessing}
                laserColor={currentLaserColor}
                progress={progress}
                rotationSpeed={20}
                size={DEFAULT_HEXAGON_SIZE}
              />
            </svg>

            {/* Champion animations overlay for all 11 agents */}
            <ChampionAnimations
              currentAgent={currentAgent}
              progress={progress}
            />

            {/* Heimerdinger Synthesis */}
            {animationState.phase === "completing" && (
              <HeimerdingerSynthesis
                completedAgents={animationState.completedAgents}
                isActive={true}
              />
            )}

            {/* Agent Transition Laser */}
            {currentAgent && animationState.transitioning && (
              <AgentTransitionLaser
                isActive={animationState.transitioning}
                laserColor={currentLaserColor}
                onTransitionComplete={() => {
                  // Transition complete callback
                }}
                toAgent={currentChampion ?? currentAgent}
              />
            )}

            {/* Progress text overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="font-bold text-4xl"
                  style={{ color: currentLaserColor }}
                >
                  {Math.round(progress)}%
                </div>
                <div className="mt-2 text-muted-foreground text-sm">
                  {animationState.currentMessage}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar with Dynamic Colors */}
        <div className="space-y-2">
          <Progress
            className="w-full"
            style={{
              backgroundColor: `${currentLaserColor}20`,
            }}
            value={progress}
          />
        </div>

        {/* Completion State */}
        {isComplete && (
          <div className="text-center font-semibold text-green-500">
            ✓ Analysis Complete!
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center font-semibold text-red-500">
            Error: {error}
          </div>
        )}

        {/* Agent Progress Display */}
        {agentProgress.size > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Agent Progress</h3>
            <div className="space-y-2">
              {Array.from(agentProgress.entries()).map(
                ([agent, progressData]) => (
                  <div
                    className="flex items-center gap-3 rounded-lg border p-2"
                    key={agent}
                    style={{
                      borderColor: `${progressData.laserColor}40`,
                      backgroundColor: `${progressData.laserColor}10`,
                    }}
                  >
                    <Badge
                      style={{
                        borderColor: progressData.laserColor,
                        color: progressData.laserColor,
                      }}
                      variant="outline"
                    >
                      {progressData.champion}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      ({agent})
                    </span>
                    <div className="flex-1 text-right">
                      <span className="font-medium text-sm">
                        {progressData.status === "completed" && "✓ Complete"}
                        {progressData.status === "processing" &&
                          `${progressData.progress}%`}
                        {progressData.status === "started" && "Initializing..."}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center text-muted-foreground text-sm">
            Not connected
          </div>
        )}
      </CardContent>
    </Card>
  );
};
