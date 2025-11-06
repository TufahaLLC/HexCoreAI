"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getConnectionStatusLabel,
  useWebSocketContext,
} from "@/contexts/web-socket-context";

export const AnalysisDashboard = () => {
  const {
    readyState,
    isConnected,
    isConnecting,
    lastMessage,
    messageHistory,
    connect,
    disconnect,
    sessionId,
    puuid,
  } = useWebSocketContext();

  // Form state
  const [inputPuuid, setInputPuuid] = useState("");
  const [region, setRegion] = useState("americas");
  const [year, setYear] = useState(2025);

  // Analysis state
  const [currentProgress, setCurrentProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [processedMatches, setProcessedMatches] = useState<number>(0);
  const [agentUpdates, setAgentUpdates] = useState<Record<string, string>>({});
  const [completedAnalysis, setCompletedAnalysis] = useState<{
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
  } | null>(null);

  // Update state based on messages
  useEffect(() => {
    if (lastMessage) {
      // Update progress
      if (lastMessage.progress !== undefined) {
        setCurrentProgress(lastMessage.progress);
      }

      // Update status message
      setAnalysisStatus(lastMessage.message);

      // Track matches
      if (lastMessage.totalMatches) {
        setTotalMatches(lastMessage.totalMatches);
      }
      if (lastMessage.processedMatches) {
        setProcessedMatches(lastMessage.processedMatches);
      }

      // Track agent updates
      if (lastMessage.agent) {
        setAgentUpdates((prev) => ({
          ...prev,
          [lastMessage.agent as string]: lastMessage.message,
        }));
      }

      // Handle completion
      if (lastMessage.status === "completed" && lastMessage.synthesis) {
        setCompletedAnalysis({
          resultId: lastMessage.resultId,
          s3Key: lastMessage.s3Key,
          synthesis: lastMessage.synthesis,
        });
      }
    }
  }, [lastMessage]);

  // Start analysis
  const handleStartAnalysis = () => {
    if (!inputPuuid.trim()) {
      // biome-ignore lint/suspicious/noConsole: User feedback required
      alert("Please enter a PUUID");
      return;
    }

    // Reset state
    setCurrentProgress(0);
    setAnalysisStatus("");
    setTotalMatches(0);
    setProcessedMatches(0);
    setAgentUpdates({});
    setCompletedAnalysis(null);

    // Generate session ID and connect
    const newSessionId = uuidv4();
    connect(newSessionId, inputPuuid.trim(), region, year);
  };

  // Stop analysis
  const handleStopAnalysis = () => {
    disconnect();
  };

  const connectionStatus = getConnectionStatusLabel(readyState);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 font-bold text-3xl">HexCore AI Analysis Dashboard</h1>

      {/* Connection Form */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 font-semibold text-xl">Start Analysis</h2>

        <div className="space-y-4">
          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="puuid-input"
            >
              Player PUUID
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              disabled={isConnected}
              id="puuid-input"
              onChange={(e) => setInputPuuid(e.target.value)}
              placeholder="Enter player PUUID"
              type="text"
              value={inputPuuid}
            />
          </div>

          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="region-select"
            >
              Region
            </label>
            <select
              className="w-full rounded-md border px-3 py-2"
              disabled={isConnected}
              id="region-select"
              onChange={(e) => setRegion(e.target.value)}
              value={region}
            >
              <option value="americas">Americas</option>
              <option value="europe">Europe</option>
              <option value="asia">Asia</option>
            </select>
          </div>

          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="year-input"
            >
              Year
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              disabled={isConnected}
              id="year-input"
              onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
              type="number"
              value={year}
            />
          </div>

          <div className="flex gap-4">
            <button
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
              disabled={isConnected || isConnecting}
              onClick={handleStartAnalysis}
              type="button"
            >
              {isConnecting ? "Connecting..." : "Start Analysis"}
            </button>

            <button
              className="rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
              disabled={!isConnected}
              onClick={handleStopAnalysis}
              type="button"
            >
              Stop Analysis
            </button>
          </div>

          <div className="text-sm">
            <span className="font-medium">Connection Status: </span>
            <span className={isConnected ? "text-green-600" : "text-gray-600"}>
              {connectionStatus}
            </span>
          </div>

          {sessionId && (
            <div className="text-gray-500 text-xs">
              Session: {sessionId} | PUUID: {puuid}
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {isConnected && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 font-semibold text-xl">Analysis Progress</h2>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>{analysisStatus}</span>
              <span>{currentProgress}%</span>
            </div>
            <div className="h-4 w-full rounded-full bg-gray-200">
              <div
                className="h-4 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>

          {/* Match Progress */}
          {totalMatches > 0 && (
            <div className="mb-4 text-gray-600 text-sm">
              Processed {processedMatches} of {totalMatches} matches
            </div>
          )}

          {/* Agent Updates */}
          {Object.keys(agentUpdates).length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Agent Progress</h3>
              <div className="space-y-2">
                {Object.entries(agentUpdates).map(([agent, message]) => (
                  <div className="flex items-center gap-2 text-sm" key={agent}>
                    <span className="font-medium">{agent}:</span>
                    <span className="text-gray-600">{message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Analysis Results */}
      {completedAnalysis && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 font-semibold text-xl">Analysis Complete!</h2>

          <div className="space-y-4">
            <div>
              <span className="font-medium">Result ID: </span>
              <span className="text-gray-600 text-sm">
                {completedAnalysis.resultId}
              </span>
            </div>

            <div>
              <span className="font-medium">Overall Score: </span>
              <span className="font-bold text-2xl text-blue-600">
                {completedAnalysis.synthesis.summary.overallScore}
              </span>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Strengths</h3>
              <ul className="list-inside list-disc space-y-1">
                {completedAnalysis.synthesis.summary.strengths.map(
                  (strength: string, idx: number) => (
                    <li className="text-green-600" key={idx}>
                      {strength}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Areas for Improvement</h3>
              <ul className="list-inside list-disc space-y-1">
                {completedAnalysis.synthesis.summary.improvements.map(
                  (improvement: string) => (
                    <li className="text-orange-600" key={improvement}>
                      {improvement}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Agent Results</h3>
              <div className="space-y-2">
                {completedAnalysis.synthesis.agents.map((agent) => (
                  <div
                    className="border-blue-500 border-l-4 pl-3"
                    key={agent.agentName}
                  >
                    <div className="font-medium">{agent.agentName}</div>
                    <div className="text-gray-600 text-sm">{agent.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message History */}
      {messageHistory.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 font-semibold text-xl">Message History</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {messageHistory.map((msg) => (
              <div
                className="border-gray-300 border-l-2 py-1 pl-3 text-sm"
                key={`${msg.timestamp}-${msg.status}`}
              >
                <div className="font-medium">
                  [{new Date(msg.timestamp).toLocaleTimeString()}] {msg.status}
                </div>
                <div className="text-gray-600">{msg.message}</div>
                {msg.agent && (
                  <div className="text-blue-600 text-xs">
                    Agent: {msg.agent}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
