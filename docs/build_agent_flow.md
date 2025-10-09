# Build Agent Execution Flow Explanation

![Build Agent Execution Flow Diagram](build_agent_flow.png)

## Detailed Flow Breakdown
### Phase 1: Orchestrator Invocation**Step Functions → Build Agent Orchestrator**
  - The Step Functions state machine invokes the `BuildAgentOrchestratorFunction` Lambda
  - Input includes (validated by `agentOrchestratorInputSchema`): `keys` (string[]), `sessionId` (uuid), `matchId` (string), `puuid` (string), `region` (optional), `year` (number, optional)
  - **WebSocket Update #1:** "Build Agent initializing..." (progress: 20%)

### Phase 2: Bedrock Agent Invocation**Build Agent Orchestrator → Bedrock Agent Runtime**
  - Orchestrator calls `invokeBedrockAgentWithTracing()` from bedrock-client utility
  - Uses `@aws-sdk/client-bedrock-agent-runtime` package
  - Creates `InvokeAgentCommand` with parameters:
  - `agentId`: Build Analysis Agent ID
  - `agentAliasId`: Agent alias (e.g., TSTALIASID)
  - `sessionId`: Unique session identifier
  - `inputText`: Analysis prompt requesting build optimization insights
  - `enableTrace`: based on `ENABLE_BEDROCK_TRACES` environment variable
 - Traces drive real-time WebSocket updates (pre-processing validation, rationale, tool invocation start/complete, post-processing)

### Phase 3: Bedrock Agent Reasoning**Build Analysis Agent (anthropic.claude-3-5-sonnet-20241022-v2:0)**
 - Receives the prompt: "Analyze the build optimization for match X and player Y..."
 - The agent's instruction guides its behavior: "You are an expert League of Legends build optimization analyst..."
  - Agent uses **agentic reasoning** to determine which tools to call and in what order
  - Decision tree:
   1. First, I need build data → Call `getMatchBuildData`
   2. Then, I need to analyze efficiency → Call `analyzeBuildEfficiency`
   3. Finally, I need recommendations → Call `recommendItemAdaptations`

### Phase 4: Action Group Tool Execution (Loop)#### Tool Call #1: getMatchBuildData

**Bedrock Agent → Build Agent Action Group Lambda**
- Agent invokes Lambda function with event structure:
```json
{
  "function": "getMatchBuildData",
  "parameters": [
    {"name": "matchId", "value": "NA1_4567890123"},
    {"name": "puuid", "value": "abc123"}
  ]
}
```

**Lambda → DynamoDB**
- AWS Powertools `BedrockAgentFunctionResolver` routes to correct tool
- Lambda executes `GetCommand` on MatchDataTable
- Retrieves build data: items, itemTimeline, goldPerMinute

**Lambda → Bedrock Agent**
- Returns formatted response:
```json
{
  "items": [3078, 3031, 3094],
  "itemTimeline": [...],
  "goldPerMinute": [350, 420, 480]
}
```

#### Tool Call #2: analyzeBuildEfficiency

**Bedrock Agent → Build Agent Action Group Lambda**
- Agent passes retrieved data for analysis
- Lambda calculates:
  - Power spike timings
  - Gold efficiency percentage
  - Average time between major items
- Returns efficiency metrics

#### Tool Call #3: recommendItemAdaptations

**Bedrock Agent → Build Agent Action Group Lambda**
- Agent passes current build and enemy champions
- Lambda analyzes enemy composition:
  - AP-heavy? Recommend MR items
  - AD-heavy? Recommend Armor
  - Healing champions? Recommend Grievous Wounds
- Returns situational recommendations
### Phase 5: Response Streaming**Bedrock Agent → Build Agent Orchestrator**
- As the agent generates its final analysis, it streams response chunks
- Each chunk is a piece of the complete text response
- The agent synthesizes tool results into natural language insights

**Build Agent Orchestrator Processing**
- Receives chunks via async iterator: `for await (const event of response.completion)`
- Each chunk decoded: `new TextDecoder('utf-8').decode(event.chunk.bytes)`
- Concatenates chunks to build full response
- **Chunk counter increments** with each received chunk

**WebSocket Updates (Trace-driven + periodic chunk milestones)**
- Trace-driven updates:
  - Pre-processing: "Build Agent: Input validated ✓" (progress: 21%)
  - Rationale: "Build Agent: ..." (progress unchanged)
  - Tool start: 🔍/📊/💡 message (+3 progress, capped ≤ 34)
  - Tool complete: ✓ message (+2 progress, capped ≤ 35)
  - Post-processing: "Build Agent: Formatting final response..." (progress: 35)
- Periodic chunks: Every 10 chunks → "Build Agent generating insights... (N chunks)" (+1 progress up to 34)

### Session Management (Orchestrator)
- Register session at start with `registerAgentSession()` using an isolated `agentSessionId` (e.g., `${sessionId}-build-${Date.now()}`)
- Mark session complete/failed with `markSessionComplete()` / `markSessionFailed()` and include metadata (e.g., tools invoked)
- TTL-based cleanup via `AgentSessionsTable` (DynamoDB)
- Idempotency: wrap invocation with `makeIdempotent` and `DynamoDBPersistenceLayer` to safely handle Step Functions retries

### Phase 6: Completion**Build Agent Orchestrator**
 - All chunks received and concatenated into complete analysis
 - **WebSocket Update #5:** "Build Agent analysis complete" (progress: 35%)
  - Returns structured output to Step Functions:
  ```typescript
  {
   agentName: "BuildAgent",
   status: "success",
   analysis: "Full text analysis of build optimization...",
   timestamp: 1728048000000,
   // Optional metadata used by downstream synthesis/monitoring
   metadata: {
     executionTimeMs: 8123,
     retryCount: 0,
   }
   // Optional (for logging/UX):
   // toolsInvoked: ["getMatchBuildData", "analyzeBuildEfficiency", "recommendItemAdaptations"]
  }
  ```

### Phase 7: State Machine Continuation**Step Functions**
- Receives Build Agent output
- Stores result in execution context
- Proceeds to next parallel agent invocation (Combat Agent)
- Eventually all 6 agents complete
- Final synthesizer combines all analyses

## WebSocket Update Timeline
| **Event** | **Message** | **Progress** | **Timing** |
|-----------|-------------|--------------|------------|
| Start | "Build Agent initializing..." | 20% | t=0s |
| Pre-processing | "Build Agent: Input validated ✓" | 21% | t=0.5s |
| Reasoning | "Build Agent: I need to retrieve build data..." | 21% | t=1s |
| Tool #1 start | "🔍 Retrieving build data from match history..." | 24% | t=1.2s |
| Tool #1 complete | "✓ Build data retrieved successfully" | 26% | t=2s |
| Tool #2 start | "📊 Analyzing build efficiency and power spikes..." | 29% | t=3s |
| Tool #2 complete | "✓ Efficiency analysis complete" | 31% | t=4s |
| Tool #3 start | "💡 Generating situational recommendations..." | 34% | t=4.5s |
| Tool #3 complete | "✓ Recommendations generated" | 35% | t=5.5s |
| Post-processing | "Build Agent: Formatting final response..." | 35% | t=7s |
| Complete | "Build Agent analysis complete (3 tools used)" | 35% | t=8s |

Additional periodic chunk updates (every 10 chunks): "Build Agent generating insights... (N chunks)" with +1 progress up to 34.
## Key Technical Details
**Why Action Groups?**
- Provides Bedrock Agent with access to real-time data from DynamoDB
- Agent can make multiple tool calls in sequence based on reasoning
- Tools are defined via function schemas in SAM template
**Why Streaming?**
- Reduces perceived latency for end users
- Enables real-time progress updates via WebSocket
- Better user experience for long-running agent analysis
- Uses async iteration to process chunks as they arrive

**Why AWS Powertools?**
- Simplifies action group handler implementation
- Automatic request routing based on function name
- Built-in logging, tracing, and metrics
- Type-safe parameter handling

**Agentic Reasoning Flow**
1. Agent receives high-level prompt
2. Agent determines strategy: "To analyze builds, I need data first, then analysis, then recommendations"
3. Agent makes tool calls autonomously
4. Agent synthesizes tool outputs into coherent analysis
5. Agent streams final response in natural language

This architecture enables the Build Agent to intelligently orchestrate its own analysis workflow while providing real-time feedback to users through WebSocket updates.