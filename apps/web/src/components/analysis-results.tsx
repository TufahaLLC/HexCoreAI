import { Activity, BarChart3, Eye, Hammer, Shield, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CompletedAnalysis } from "@/types/analysis";

type AnalysisResultsProps = {
  analysis: CompletedAnalysis;
};

// Agent icon mapping
const agentIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  BuildAgent: Hammer,
  CombatAgent: Shield,
  VisionAgent: Eye,
  EconomyAgent: BarChart3,
  ChampionAgent: Trophy,
  CompetitiveAgent: Activity,
};

// Agent display names
const agentDisplayNames: Record<string, string> = {
  BuildAgent: "Build Optimization",
  CombatAgent: "Combat Analysis",
  VisionAgent: "Vision Control",
  EconomyAgent: "Economy Management",
  ChampionAgent: "Champion Meta",
  CompetitiveAgent: "Competitive Insights",
};

// Helper function to get border color based on status
const getBorderColorClass = (
  status: "success" | "failed" | "partial"
): string => {
  if (status === "success") {
    return "border-l-green-500";
  }
  if (status === "failed") {
    return "border-l-red-500";
  }
  return "border-l-yellow-500";
};

// Helper function to get badge variant based on status
const getBadgeVariant = (
  status: "success" | "failed" | "partial"
): "default" | "destructive" | "secondary" => {
  if (status === "success") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "secondary";
};

export const AnalysisResults = ({ analysis }: AnalysisResultsProps) => {
  const { synthesis } = analysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Analysis Complete!
          <Badge variant="default">Success</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs className="w-full" defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {synthesis.agents.map((agent) => (
              <TabsTrigger key={agent.agentName} value={agent.agentName}>
                {agentDisplayNames[agent.agentName] || agent.agentName}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent className="space-y-6" value="overview">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span className="font-medium">Result ID: </span>
                <span className="font-mono text-muted-foreground text-sm">
                  {analysis.resultId}
                </span>
              </div>
              <div>
                <span className="font-medium">Overall Score: </span>
                <Badge className="px-3 py-1 text-lg" variant="secondary">
                  {synthesis.summary.overallScore}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold text-green-700">Strengths</h3>
                <div className="space-y-2">
                  {synthesis.summary.strengths.map((strength: string) => (
                    <div className="flex items-center gap-2" key={strength}>
                      <Badge
                        className="bg-green-100 text-green-800"
                        variant="secondary"
                      >
                        ✓
                      </Badge>
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-orange-700">
                  Areas for Improvement
                </h3>
                <div className="space-y-2">
                  {synthesis.summary.improvements.map((improvement: string) => (
                    <div className="flex items-center gap-2" key={improvement}>
                      <Badge
                        className="bg-orange-100 text-orange-800"
                        variant="secondary"
                      >
                        ↑
                      </Badge>
                      <span className="text-sm">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 font-semibold">Agent Status Summary</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {synthesis.agents.map((agent) => {
                  const Icon = agentIcons[agent.agentName] || Activity;
                  return (
                    <Card
                      className={`border-l-4 ${getBorderColorClass(agent.status)}`}
                      key={agent.agentName}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div className="font-medium">
                            {agentDisplayNames[agent.agentName] ||
                              agent.agentName}
                          </div>
                        </div>
                        <Badge
                          className="mt-2"
                          variant={getBadgeVariant(agent.status)}
                        >
                          {agent.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Individual Agent Tabs */}
          {synthesis.agents.map((agent) => {
            const Icon = agentIcons[agent.agentName] || Activity;
            return (
              <TabsContent
                className="space-y-4"
                key={agent.agentName}
                value={agent.agentName}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-xl">
                      {agentDisplayNames[agent.agentName] || agent.agentName}
                    </h3>
                  </div>
                  <Badge variant={getBadgeVariant(agent.status)}>
                    {agent.status}
                  </Badge>
                </div>

                <Separator />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Detailed Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {agent.analysis}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-muted-foreground text-xs">
                  Analyzed at:{" "}
                  {new Date(agent.timestamp).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
