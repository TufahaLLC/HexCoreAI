import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CompletedAnalysis } from "@/types/analysis";

type AnalysisResultsProps = {
  analysis: CompletedAnalysis;
};

export const AnalysisResults = ({ analysis }: AnalysisResultsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        Analysis Complete!
        <Badge variant="default">Success</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
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
            {analysis.synthesis.summary.overallScore}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold text-green-700">Strengths</h3>
          <div className="space-y-2">
            {analysis.synthesis.summary.strengths.map((strength: string) => (
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
            {analysis.synthesis.summary.improvements.map(
              (improvement: string) => (
                <div className="flex items-center gap-2" key={improvement}>
                  <Badge
                    className="bg-orange-100 text-orange-800"
                    variant="secondary"
                  >
                    ↑
                  </Badge>
                  <span className="text-sm">{improvement}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 font-semibold">Agent Results</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {analysis.synthesis.agents.map((agent) => (
            <Card
              className="border-l-4 border-l-blue-500"
              key={agent.agentName}
            >
              <CardContent className="p-4">
                <div className="font-medium">{agent.agentName}</div>
                <div className="text-muted-foreground text-sm">
                  {agent.status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);
