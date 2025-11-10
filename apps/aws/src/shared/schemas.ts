/**
 * HexCore AI - Zod Schemas for Type-Safe Validation
 *
 * This file defines all Zod schemas used for validating Lambda function inputs
 * across the HexCore AI architecture. These schemas are used with AWS Lambda
 * Powertools Parser utility to ensure type safety and early validation.
 *
 * @see {@link https://zod.dev/ Zod Documentation}
 * @see {@link https://docs.powertools.aws.dev/lambda/typescript/latest/utilities/parser/ AWS Lambda Powertools Parser}
 */

import { z } from "zod";
import {
  AGENT_NAMES,
  AGENT_RESULT_STATUSES,
  EVENT_DETAIL_TYPE,
  EVENT_SOURCE,
  FOUR_DIGIT_YEAR_REGEX,
  MATCH_YEAR_MAX,
  MATCH_YEAR_MIN,
  MIN_ARRAY_LENGTH,
  PROGRESS_PERCENTAGE_MAX,
  PROGRESS_PERCENTAGE_MIN,
  REGIONS,
  SCHEMA_VERSION,
  WEB_SOCKET_STATUSES,
} from "./constants";

// ============================================================================
// WebSocket Schemas
// ============================================================================

/**
 * Validates query parameters when clients connect to the WebSocket API.
 * Used by: WebSocketConnectFunction
 */
export const connectionParamsSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  gameName: z.string().min(MIN_ARRAY_LENGTH, "Game name is required"),
  tagLine: z.string().min(MIN_ARRAY_LENGTH, "Tag line is required"),
  region: z.enum(REGIONS, {
    errorMap: () => ({ message: "Region must be americas, europe, or asia" }),
  }),
  year: z
    .string()
    .regex(FOUR_DIGIT_YEAR_REGEX, "Year must be a 4-digit number"),
});

export type ConnectionParams = z.infer<typeof connectionParamsSchema>;

/**
 * Validates outgoing WebSocket messages sent to clients.
 * Used by: All functions that send WebSocket updates
 */
export const webSocketMessageSchema = z.object({
  status: z.enum(WEB_SOCKET_STATUSES),
  message: z.string().min(MIN_ARRAY_LENGTH, "Message is required"),
  progress: z
    .number()
    .int()
    .min(PROGRESS_PERCENTAGE_MIN)
    .max(PROGRESS_PERCENTAGE_MAX)
    .optional(),
  agent: z.enum(AGENT_NAMES).optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.number().int().positive().optional(),
});

export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;

// ============================================================================
// SQS Message Schemas
// ============================================================================

/**
 * Validates messages sent to the Match Queue for processing.
 * Used by: MatchProcessorFunction
 */
export const sqsMatchMessageSchema = z.object({
  matchId: z.string().min(MIN_ARRAY_LENGTH, "Match ID is required"),
  puuid: z.string().min(MIN_ARRAY_LENGTH, "PUUID is required"),
  region: z.enum(REGIONS),
  year: z
    .number()
    .int()
    .min(MATCH_YEAR_MIN)
    .max(MATCH_YEAR_MAX, "Year must be between 2020 and 2030"),
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
});

export type SQSMatchMessage = z.infer<typeof sqsMatchMessageSchema>;

// ============================================================================
// EventBridge Schemas
// ============================================================================

/**
 * Validates EventBridge events that trigger the Step Functions state machine.
 * Used by: All Agent Orchestrator Functions (via Step Functions)
 */
export const eventBridgeMatchEventSchema = z.object({
  source: z.literal(EVENT_SOURCE),
  "detail-type": z.literal(EVENT_DETAIL_TYPE),
  detail: z.object({
    keys: z
      .array(z.string())
      .min(MIN_ARRAY_LENGTH, "At least one data key is required"),
    sessionId: z.string().uuid("Session ID must be a valid UUID"),
    matchId: z.string().min(MIN_ARRAY_LENGTH, "Match ID is required"),
    puuid: z.string().min(MIN_ARRAY_LENGTH, "PUUID is required"),
    region: z.enum(REGIONS),
    year: z.number().int(),
    schemaVersion: z.literal(SCHEMA_VERSION),
  }),
});

export type EventBridgeMatchEvent = z.infer<typeof eventBridgeMatchEventSchema>;

// ============================================================================
// Agent Orchestrator Schemas
// ============================================================================

/**
 * Validates input to individual agent orchestrator Lambda functions.
 * Used by: BuildAgent, CombatAgent, VisionAgent, EconomyAgent, ChampionAgent, CompetitiveAgent
 */
export const agentOrchestratorInputSchema = z.object({
  keys: z
    .array(z.string())
    .min(MIN_ARRAY_LENGTH, "At least one data key is required"),
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  matchId: z.string().min(MIN_ARRAY_LENGTH, "Match ID is required"),
  puuid: z.string().min(MIN_ARRAY_LENGTH, "PUUID is required"),
  region: z.enum(REGIONS).optional(),
  year: z.number().int().optional(),
});

export type AgentOrchestratorInput = z.infer<
  typeof agentOrchestratorInputSchema
>;

/**
 * Validates the output from agent orchestrator functions.
 * Used by: SynthesizerFunction (validates inputs from all agents)
 */
export const agentAnalysisResultSchema = z.object({
  agentName: z.enum(AGENT_NAMES),
  status: z.enum(AGENT_RESULT_STATUSES),
  analysis: z.string().min(MIN_ARRAY_LENGTH, "Analysis text is required"),
  timestamp: z.number().int().positive(),
  metadata: z
    .object({
      tokensUsed: z.number().int().optional(),
      executionTimeMs: z.number().int().optional(),
      retryCount: z.number().int().optional(),
    })
    .optional(),
});

export type AgentAnalysisResult = z.infer<typeof agentAnalysisResultSchema>;

// ============================================================================
// Synthesizer Schemas
// ============================================================================

/**
 * Validates the aggregated input to the Synthesizer function.
 * Used by: SynthesizerFunction
 */
export const synthesizerInputSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  matchId: z.string().min(MIN_ARRAY_LENGTH, "Match ID is required"),
  puuid: z.string().min(MIN_ARRAY_LENGTH, "PUUID is required"),
  agentResults: z
    .array(agentAnalysisResultSchema)
    .min(MIN_ARRAY_LENGTH, "At least one agent result is required"),
});

export type SynthesizerInput = z.infer<typeof synthesizerInputSchema>;

// ============================================================================
// Bedrock Action Group Tool Schemas
// ============================================================================

/**
 * Validates parameters for the GetMatchData action group tool.
 * Used by: Action Group Tool Lambda functions
 */
export const getMatchDataToolSchema = z.object({
  dataKey: z.string().min(MIN_ARRAY_LENGTH, "Data key is required"),
});

export type GetMatchDataTool = z.infer<typeof getMatchDataToolSchema>;

/**
 * Validates parameters for the GetPlayerStats action group tool.
 * Used by: Action Group Tool Lambda functions
 */
export const getPlayerStatsToolSchema = z.object({
  puuid: z.string().min(MIN_ARRAY_LENGTH, "PUUID is required"),
  matchId: z.string().min(MIN_ARRAY_LENGTH, "Match ID is required"),
});

export type GetPlayerStatsTool = z.infer<typeof getPlayerStatsToolSchema>;

/**
 * Validates parameters for the GetChampionInfo action group tool.
 * Used by: Action Group Tool Lambda functions
 */
export const getChampionInfoToolSchema = z.object({
  championName: z.string().min(MIN_ARRAY_LENGTH, "Champion name is required"),
  matchId: z.string().min(MIN_ARRAY_LENGTH, "Match ID is required"),
});

export type GetChampionInfoTool = z.infer<typeof getChampionInfoToolSchema>;
