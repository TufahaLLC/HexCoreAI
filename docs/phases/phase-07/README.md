# Phase 7: AI Analysis Layer - AWS Bedrock Agents 🔄

## 📖 Table of Contents

- [Overview](#overview)
- [Architecture](#️-architecture)
- [Subphase Structure](#-subphase-structure)
- [Detailed Subphases](#-detailed-subphases)
  - [Subphase 7.1: Project Foundation](#subphase-71-project-foundation-)
  - [Subphase 7.2: Action Group Tools](#subphase-72-action-group-tools-)
  - [Subphase 7.3: Agent Orchestration](#subphase-73-agent-orchestration-)
  - [Subphase 7.4: Session Management](#subphase-74-session-management-)
  - [Subphase 7.5: Deployment & Validation](#subphase-75-deployment--validation-)
- [Progress Tracking](#-progress-tracking)
- [Implementation Roadmap](#-implementation-roadmap)
- [Related Documentation](#-related-documentation)

---

## Overview

Phase 7 implements the **AI Analysis Layer** using AWS Bedrock Agents with Action Groups and streaming invocation. This phase creates an advanced AI-powered analysis platform leveraging Claude 3.5 Sonnet for intelligent League of Legends match analysis.

**Total Tasks**: 17 tasks across 5 subphases  
**Current Status**: All subphases pending 🔄

---

## 🏗️ Architectural Evolution

### From Direct Lambda → Bedrock Agents

| **Aspect** | **Old (Direct Lambda)** | **New (Bedrock Agents)** |
|------------|-------------------------|--------------------------|
| **AI Capabilities** | Fixed logic, no reasoning | Advanced LLM reasoning with Claude 3.5 Sonnet |
| **Flexibility** | Code changes for new features | Update agent instructions & tools |
| **Transparency** | Black box processing | Real-time trace events (reasoning, tool calls) |
| **Maintenance** | Complex analysis code | Declarative instructions + simple tools |
| **User Experience** | Basic progress updates | Transparent multi-step processing |
| **Scalability** | Monolithic handlers | Modular tools + managed agents |

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Bedrock Agents                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Build Agent  │  │ Combat Agent │  │ Vision Agent │ ...   │
│  │ (Claude 3.5) │  │ (Claude 3.5) │  │ (Claude 3.5) │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐       │
│  │          Action Groups (Lambda Tools)            │       │
│  │  • getMatchBuildData  • analyzeDamageOutput      │       │
│  │  • analyzeBuildEff.   • evaluateTeamfight        │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Orchestrators (Lambda)                   │
│  • Invoke Bedrock Agents with streaming                     │
│  • Handle trace events (reasoning, tool calls)              │
│  • Send WebSocket progress updates                          │
│  • Track session lifecycle                                  │
└─────────────────────────────────────────────────────────────┘
```

---
## 📊 Subphase Structure

Phase 7 is organized into **5 subphases** for manageable implementation:

| **Subphase** | **Focus** | **Tasks** | **Status** | **Duration** |
|--------------|-----------|-----------|------------|--------------||
| **7.2** | Action Group Tools | 6 tasks | 🔄 Pending | 8-12 hours |
| **7.3** | Agent Orchestration | 7 tasks | 🔄 Pending | 8-12 hours |
| **7.4** | Session Management | 1 task | 🔄 Pending | 2-3 hours |
| **7.5** | Deployment & Validation | 1 task | 🔄 Pending | 3-4 hours |

**Total estimated Time**: 24-36 hours
---

## 🔍 Detailed Subphases

### Subphase 7.1: Project Foundation 🔄
{{ ... }}

**Purpose**: Set up infrastructure and dependencies for Bedrock Agents

**Status**: 🔄 **Pending** - Prerequisites for all subsequent work

**Tasks**:
1. 🔄 [Task 7.1: Update Dependencies & Directory Structure](./task-71-update-project-setup.md)
   - Add AWS Powertools for TypeScript
   - Add Bedrock SDK packages
   - Create action-groups/ and orchestrators/ directories
   
2. 🔄 [Task 7.2: Define Bedrock Agents in SAM Template](./task-72-define-bedrock-agents.md)
   - Define 6 Bedrock Agent resources
   - Configure action group Lambda functions
   - Set up IAM roles and permissions
   - Create agent aliases (prod/test)

**Deliverables**:
- Updated package.json with Bedrock dependencies
- New directory structure for action groups and orchestrators
- Complete SAM template with all Bedrock resources
- IAM roles for agent execution

**Dependencies**: None (start here)

**Estimated Time**: 2-3 hours

---

### Subphase 7.2: Action Group Tools 🔄

**Purpose**: Implement Lambda tools that Bedrock Agents can invoke

**Status**: 🔄 **Pending** - Core functionality for agent capabilities

**Tasks**:
1. 🔄 [Task 7.3: Build Agent Action Groups](./task-73-build-action-groups.md)
   - `getMatchBuildData` - Retrieve build data from DynamoDB
   - `analyzeBuildEfficiency` - Calculate efficiency metrics
   - `recommendItemAdaptations` - Generate situational recommendations

2. 🔄 [Task 7.4: Combat Agent Action Groups](./task-74-combat-action-groups.md)
   - `getMatchCombatData` - Retrieve combat statistics
   - `analyzeDamageOutput` - Analyze damage patterns
   - `evaluateTeamfightPerformance` - Evaluate teamfight effectiveness

3. 🔄 [Task 7.5: Vision Agent Action Groups](./task-75-vision-action-groups.md)
   - `getMatchVisionData` - Retrieve vision statistics
   - `analyzeVisionScore` - Analyze ward placement efficiency

4. 🔄 [Task 7.6: Economy Agent Action Groups](./task-76-economy-action-groups.md)
   - `getMatchEconomyData` - Retrieve economic data
   - `analyzeGoldEfficiency` - Analyze gold generation
   - `evaluateResourceManagement` - Evaluate CS and farming

5. 🔄 [Task 7.7: Champion Agent Action Groups](./task-77-champion-action-groups.md)
   - `getChampionPerformance` - Retrieve champion stats
   - `analyzeChampionMastery` - Analyze mastery level
   - `compareToChampionBenchmark` - Compare to global benchmarks

6. 🔄 [Task 7.8: Competitive Agent Action Groups](./task-78-competitive-action-groups.md)
   - `getRankProgressionData` - Retrieve ranked data
   - `analyzeRankTrends` - Analyze climb efficiency
   - `generateClimbingRecommendations` - Generate rank-specific advice

**Deliverables**:
- 6 action group Lambda handlers using AWS Powertools
- 17 total tool functions across all agents
- Comprehensive logging and error handling
- X-Ray tracing for debugging

**Dependencies**: Subphase 7.1 (SAM template and dependencies)

**Estimated Time**: 8-12 hours (1.5-2 hours per agent)

---

### Subphase 7.3: Agent Orchestration 🔄

**Purpose**: Implement streaming invocation with enhanced trace events

**Status**: 🔄 **Pending** - Enables transparent AI reasoning

**Tasks**:
1. 🔄 [Task 7.9: Create Enhanced Bedrock Client](./task-79-enhanced-bedrock-client.md)
   - Implement `invokeBedrockAgentWithTracing` function
   - Handle all trace event types (PreProcessing, Orchestration, PostProcessing)
   - Process rationale, tool invocations, and observations
   - Support configurable trace enablement (cost optimization)

2. 🔄 [Task 7.10: Build Agent Orchestrator](./task-710-build-orchestrator.md)
   - Progress range: 20-35%
   - Tools: Build data, efficiency analysis, recommendations

3. 🔄 [Task 7.11: Combat Agent Orchestrator](./task-711-combat-orchestrator.md)
   - Progress range: 35-50%
   - Tools: Combat stats, damage patterns, teamfight positioning

4. 🔄 [Task 7.12: Vision Agent Orchestrator](./task-712-vision-orchestrator.md)
   - Progress range: 50-65%
   - Tools: Vision data, ward placement, map awareness

5. 🔄 [Task 7.13: Economy Agent Orchestrator](./task-713-economy-orchestrator.md)
   - Progress range: 65-75%
   - Tools: Gold data, efficiency, farming patterns

6. 🔄 [Task 7.14: Champion Agent Orchestrator](./task-714-champion-orchestrator.md)
   - Progress range: 75-85%
   - Tools: Champion data, pool analysis, mastery

7. 🔄 [Task 7.15: Competitive Agent Orchestrator](./task-715-competitive-orchestrator.md)
   - Progress range: 85-90%
   - Tools: Rank data, climb efficiency, skill development

**Deliverables**:
- Shared Bedrock client with trace event processing
- 6 specialist agent orchestrator functions
- WebSocket messages showing:
  - Agent reasoning ("I need to retrieve build data...")
  - Tool invocations ("🔍 Retrieving build data...")
  - Tool completions ("✓ Build data retrieved successfully")
  - Progress updates (20-90% across all agents)
- Agent analyses returned to Step Functions for synthesis

**Dependencies**: Subphase 7.2 (action group tools must exist)

**Estimated Time**: 8-12 hours

---

### Subphase 7.4: Session Management 🔄

**Purpose**: Track and cleanup Bedrock Agent sessions

**Status**: 🔄 **Pending** - Prevents session accumulation

**Tasks**:
1. 🔄 [Task 7.17: Implement Session Tracking & Cleanup](./task-717-session-management.md)
   - Create AgentSessionsTable in DynamoDB with TTL
   - Implement session-manager utility
   - Register sessions on orchestrator start
   - Mark sessions complete/failed on finish
   - Auto-cleanup after 24 hours via TTL

**Deliverables**:
- DynamoDB table for session tracking
- Session manager utility functions
- Integration in all 6 orchestrators
- CloudWatch dashboard for session metrics
- Session cleanup verification script

**Dependencies**: Subphase 7.3 (orchestrators must exist)

**Estimated Time**: 2-3 hours

---

### Subphase 7.5: Deployment & Validation 🔄

**Purpose**: Deploy complete stack and validate end-to-end

**Status**: 🔄 **Pending** - Final integration testing

**Tasks**:
1. 🔄 [Task 7.18: Deploy & Test Bedrock Agents](./task-718-deployment-testing.md)
   - Deploy SAM template with all resources
   - Test individual action group tools
   - Test agent invocations with streaming
   - Validate WebSocket trace events
   - Monitor CloudWatch Logs and X-Ray traces
   - Verify session tracking and cleanup
   - Verify S3 and DynamoDB storage
   - Performance optimization

**Deliverables**:
- Fully deployed Bedrock Agents infrastructure
- Validated end-to-end analysis flow
- Test results for all 6 agents
- Performance metrics and optimization recommendations
- Deployment runbook

**Dependencies**: Subphases 7.1-7.4 (all components must be implemented)

**Estimated Time**: 3-4 hours

---

## 📈 Progress Tracking

### Overall Phase 7 Status

```
Subphase 7.1: ░░░░░░░░░░░░░░░░░░░░   0% (0/2 tasks) 🔄
Subphase 7.2: ░░░░░░░░░░░░░░░░░░░░   0% (0/6 tasks) 🔄
Subphase 7.3: ░░░░░░░░░░░░░░░░░░░░   0% (0/7 tasks) 🔄
Subphase 7.4: ░░░░░░░░░░░░░░░░░░░░   0% (0/1 task)  🔄
Subphase 7.5: ░░░░░░░░░░░░░░░░░░░░   0% (0/1 task)  🔄
────────────────────────────────────────────────────
Total:        ░░░░░░░░░░░░░░░░░░░░   0% (0/17 tasks)
```

### Component Status

| **Component** | **Subphase** | **Status** | **Blockers** |
|--------------|--------------|------------|--------------|
| Dependencies & Structure | 7.1 | 🔄 Pending | None - **Start Here** |
| SAM Template | 7.1 | 🔄 Pending | None |
| Build Action Groups | 7.2 | 🔄 Pending | Requires 7.1 |
| Combat Action Groups | 7.2 | 🔄 Pending | Requires 7.1 |
| Vision Action Groups | 7.2 | 🔄 Pending | Requires 7.1 |
| Economy Action Groups | 7.2 | 🔄 Pending | Requires 7.1 |
| Champion Action Groups | 7.2 | 🔄 Pending | Requires 7.1 |
| Competitive Action Groups | 7.2 | 🔄 Pending | Requires 7.1 |
| Bedrock Client | 7.3 | 🔄 Pending | Requires 7.2 |
| Build Orchestrator | 7.3 | 🔄 Pending | Requires 7.2, 7.9 |
| Combat Orchestrator | 7.3 | 🔄 Pending | Requires 7.2, 7.9 |
| Vision Orchestrator | 7.3 | 🔄 Pending | Requires 7.2, 7.9 |
| Economy Orchestrator | 7.3 | 🔄 Pending | Requires 7.2, 7.9 |
| Champion Orchestrator | 7.3 | 🔄 Pending | Requires 7.2, 7.9 |
| Competitive Orchestrator | 7.3 | 🔄 Pending | Requires 7.2, 7.9 |
| Session Management | 7.4 | 🔄 Pending | Requires 7.3 |
| Deployment & Testing | 7.5 | 🔄 Pending | Requires 7.1-7.4 |

---

## 🗺️ Implementation Roadmap

### Critical Path

```
START
  │
  ├─► Subphase 7.1: Foundation (2-3 hrs)
  │     ├─► Task 7.1: Dependencies
  │     └─► Task 7.2: SAM Template
  │
  ├─► Subphase 7.2: Action Groups (8-12 hrs)
  │     ├─► Task 7.3: Build Tools
  │     ├─► Task 7.4: Combat Tools
  │     ├─► Task 7.5: Vision Tools
  │     ├─► Task 7.6: Economy Tools
  │     ├─► Task 7.7: Champion Tools
  │     └─► Task 7.8: Competitive Tools
  │
  ├─► Subphase 7.3: Orchestration (8-12 hrs)
  │     ├─► Task 7.9: Bedrock Client
  │     ├─► Task 7.10: Build Orchestrator
  │     ├─► Task 7.11: Combat Orchestrator
  │     ├─► Task 7.12: Vision Orchestrator
  │     ├─► Task 7.13: Economy Orchestrator
  │     ├─► Task 7.14: Champion Orchestrator
  │     └─► Task 7.15: Competitive Orchestrator
  │
  ├─► Subphase 7.4: Session Mgmt (2-3 hrs)
  │     └─► Task 7.17: Session Tracking
  │
  └─► Subphase 7.5: Deployment (3-4 hrs)
        └─► Task 7.18: Deploy & Test
          │
        END ✅
```

### Recommended Approach

**Week 1**: Foundation & Action Groups
- Day 1: Subphase 7.1 (Foundation)
- Day 2-3: Subphase 7.2 (Action Groups - Build, Combat, Vision)
- Day 4: Subphase 7.2 (Action Groups - Economy, Champion, Competitive)

**Week 2**: Orchestration & Deployment
- Day 1: Subphase 7.3 (Orchestration)
- Day 2: Subphase 7.4 (Session Management)
- Day 3: Subphase 7.5 (Deployment & Testing)
- Day 4-5: Buffer for issues and optimization

---

## 🔗 Related Documentation

### Primary References
- **[Phase 7 Update Guide](../../phase_7_update.md)** - Complete implementation reference with code examples
- **[HexCore AI Architecture](../../HexCoreAi_architecture_design.md)** - Overall system design

### External Resources
- **[AWS Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)** - Official AWS documentation
- **[AWS Powertools TypeScript](https://docs.powertools.aws.dev/lambda/typescript/latest/)** - Logging, tracing, metrics
- **[Bedrock Agent Streaming](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-streaming.html)** - Trace events documentation

### Quick Navigation
- 📁 [All Phase 7 Tasks](.) - Browse all task files
- 🎯 [Start Here: Task 7.1](./task-71-update-project-setup.md) - First implementation task
- 📊 [Example: Build Action Groups](./task-73-build-action-groups.md) - Detailed implementation guide
- 🚀 [Example: Build Orchestrator](./task-710-build-orchestrator.md) - Streaming implementation guide
