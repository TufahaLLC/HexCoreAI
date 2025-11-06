# Task 10.4: Analysis Dashboard Component

Create a client component demonstrating connection controls, progress UI, agent updates, and final synthesis display.

## Subtasks

- [x] Create `apps/web/src/components/AnalysisDashboard.tsx`
- [x] Paste the implementation below

## File: `apps/web/src/components/AnalysisDashboard.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  useWebSocketContext, 
  getConnectionStatusLabel,
  type WebSocketMessage 
} from '@/contexts/WebSocketContext';

export const AnalysisDashboard: React.FC = () => {
  const {
    readyState,
    isConnected,
    isConnecting,
    lastMessage,
    messageHistory,
    connect,
    disconnect,
    sessionId,
    puuid
  } = useWebSocketContext();

  // Form state
  const [inputPuuid, setInputPuuid] = useState('');
  const [region, setRegion] = useState('americas');
  const [year, setYear] = useState(2025);

  // Analysis state
  const [currentProgress, setCurrentProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [processedMatches, setProcessedMatches] = useState<number>(0);
  const [agentUpdates, setAgentUpdates] = useState<Record<string, string>>({});
  const [completedAnalysis, setCompletedAnalysis] = useState<any>(null);

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
        setAgentUpdates(prev => ({
          ...prev,
          [lastMessage.agent!]: lastMessage.message
        }));
      }

      // Handle completion
      if (lastMessage.status === 'completed' && lastMessage.synthesis) {
        setCompletedAnalysis({
          resultId: lastMessage.resultId,
          s3Key: lastMessage.s3Key,
          synthesis: lastMessage.synthesis
        });
      }

      // Handle errors
      if (lastMessage.status === 'error') {
        console.error('Analysis error:', lastMessage.error);
      }
    }
  }, [lastMessage]);

  // Start analysis
  const handleStartAnalysis = () => {
    if (!inputPuuid.trim()) {
      alert('Please enter a PUUID');
      return;
    }

    // Reset state
    setCurrentProgress(0);
    setAnalysisStatus('');
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
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">HexCore AI Analysis Dashboard</h1>

      {/* Connection Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Start Analysis</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Player PUUID
            </label>
            <input
              type="text"
              value={inputPuuid}
              onChange={(e) => setInputPuuid(e.target.value)}
              placeholder="Enter player PUUID"
              disabled={isConnected}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={isConnected}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="americas">Americas</option>
              <option value="europe">Europe</option>
              <option value="asia">Asia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              disabled={isConnected}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleStartAnalysis}
              disabled={isConnected || isConnecting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isConnecting ? 'Connecting...' : 'Start Analysis'}
            </button>

            <button
              onClick={handleStopAnalysis}
              disabled={!isConnected}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              Stop Analysis
            </button>
          </div>

          <div className="text-sm">
            <span className="font-medium">Connection Status: </span>
            <span className={isConnected ? 'text-green-600' : 'text-gray-600'}>
              {connectionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {isConnected && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Progress</h2>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{analysisStatus}</span>
              <span>{currentProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%`  }}
              />
            </div>
          </div>

          {/* Match Progress */}
          {totalMatches > 0 && (
            <div className="text-sm text-gray-600 mb-4">
              Processed {processedMatches} of {totalMatches} matches
            </div>
          )}

          {/* Agent Updates */}
          {Object.keys(agentUpdates).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Agent Progress</h3>
              <div className="space-y-2">
                {Object.entries(agentUpdates).map(([agent, message]) => (
                  <div key={agent} className="flex items-center gap-2 text-sm">
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
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Complete!</h2>
          
          <div className="space-y-4">
            <div>
              <span className="font-medium">Result ID: </span>
              <span className="text-sm text-gray-600">{completedAnalysis.resultId}</span>
            </div>

            <div>
              <span className="font-medium">Overall Score: </span>
              <span className="text-2xl font-bold text-blue-600">
                {completedAnalysis.synthesis.summary.overallScore}
              </span>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Strengths</h3>
              <ul className="list-disc list-inside space-y-1">
                {completedAnalysis.synthesis.summary.strengths.map((strength: string, idx: number) => (
                  <li key={idx} className="text-green-600">{strength}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Areas for Improvement</h3>
              <ul className="list-disc list-inside space-y-1">
                {completedAnalysis.synthesis.summary.improvements.map((improvement: string, idx: number) => (
                  <li key={idx} className="text-orange-600">{improvement}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Agent Results</h3>
              <div className="space-y-2">
                {completedAnalysis.synthesis.agents.map((agent: any) => (
                  <div key={agent.agentName} className="border-l-4 border-blue-500 pl-3">
                    <div className="font-medium">{agent.agentName}</div>
                    <div className="text-sm text-gray-600">{agent.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message History */}
      {messageHistory.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Message History</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messageHistory.map((msg, idx) => (
              <div key={idx} className="text-sm border-l-2 border-gray-300 pl-3 py-1">
                <div className="font-medium">
                  [{new Date(msg.timestamp).toLocaleTimeString()}] {msg.status}
                </div>
                <div className="text-gray-600">{msg.message}</div>
                {msg.agent && (
                  <div className="text-blue-600 text-xs">Agent: {msg.agent}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Validation

- [x] Component compiles and renders
- [ ] Connect/Disconnect controls work (requires WebSocket URL configuration)
- [ ] Progress and messages update in real time (requires backend connection)

## Next

Proceed to [Task 10.5](./task-105-environment-configuration.md) to wire up the WebSocket URL.
