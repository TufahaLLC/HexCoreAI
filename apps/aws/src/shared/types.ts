/**
 * HexCore AI - TypeScript Type Definitions
 *
 * This file contains internal data structure types for the application.
 * For external input/output validation, see schemas.ts which uses Zod.
 *
 * Organization:
 * - External validated types: Re-exported from schemas.ts (Zod-inferred)
 * - Riot API types: External API response structures (no validation)
 * - Internal data types: Application-specific data structures
 * - Agent result types: Internal processing results
 */

// ============================================================================
// External Validated Types (from Zod schemas)
// ============================================================================
// These types are inferred from Zod schemas and provide runtime validation
// at Lambda function boundaries (SQS, EventBridge, WebSocket, etc.)

export type {
  AgentAnalysisResult,
  AgentOrchestratorInput,
  ConnectionParams,
  EventBridgeMatchEvent,
  SQSMatchMessage,
  SynthesizerInput,
  WebSocketMessage,
} from "./schemas";

// ============================================================================
// Riot API Response Types
// ============================================================================
// These types represent external Riot Games API responses.
// No validation is applied as we trust the Riot API structure.
export type RiotMatchResponse = {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameType: string;
    queueId: number;
    gameVersion: string;
    platformId: string;
    participants: RiotParticipant[];
  };
};

export type RiotParticipant = {
  puuid: string;
  participantId: number;
  championName: string;
  teamPosition: string;
  teamId: number;
  win: boolean;
  summonerName?: string | null;
  riotIdGameName?: string | null;
  champLevel: number;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  goldEarned: number;
  goldSpent: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  wardsPlaced: number;
  wardsKilled: number;
  visionScore: number;
  visionWardsBoughtInGame?: number;
  largestKillingSpree: number;
  largestMultiKill: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  physicalDamageDealtToChampions: number;
  magicDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  totalDamageDealtToChampions: number;
  physicalDamageTaken: number;
  magicDamageTaken: number;
  trueDamageTaken: number;
  totalDamageTaken: number;
};

export type RiotSummonerResponse = {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

export type RiotLeagueEntry = {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  summonerName: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
};

export type RiotTimelineResponse = {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    frames: RiotTimelineFrame[];
  };
};

export type RiotTimelineFrame = {
  timestamp: number;
  participantFrames: Record<string, ParticipantFrame>;
  events: TimelineEvent[];
};

export type ParticipantFrame = {
  participantId: number;
  totalGold: number;
  level: number;
  currentGold: number;
  minionsKilled?: number;
  jungleMinionsKilled?: number;
  position?: {
    x: number;
    y: number;
  };
  damageStats?: {
    totalDamageDoneToChampions?: number;
    totalDamageTaken?: number;
  };
};

export type TimelineEvent = {
  type: string;
  timestamp: number;
  participantId?: number;
  itemId?: number;
  cost?: number;
  teamId?: number;
  killerTeamId?: number;
  killerId?: number;
  monsterType?: string;
  buildingType?: string;
};

// ============================================================================
// Internal Application Data Types
// ============================================================================
// These types represent internal data structures stored in DynamoDB
// and used throughout the application for match analysis.
export type MatchData = {
  dataKey: string;
  matchId: string;
  puuid: string;
  gameInfo?: GameInfoData;
  playerInfo?: PlayerInfoData;
  build?: BuildData;
  combat?: CombatData;
  vision?: VisionData;
  economy?: EconomyData;
  championMeta?: ChampionMetaData;
  teamComposition?: TeamCompositionData;
  rankInfo?: RankInfoData;
  expiresAt: number;
};

export type BuildData = {
  items: number[];
  itemTimeline: ItemPurchase[];
  goldPerMinute: number[];
};

export type ItemPurchase = {
  timestamp: number;
  itemId?: number;
  cost: number;
};

export type GameInfoData = {
  gameDuration: number;
  gameDurationMinutes: number;
  gameMode: string;
  gameType: string;
  queueId: number;
  gameVersion: string;
  platformId: string;
};

export type PlayerInfoData = {
  participantId: number;
  teamId: number;
  win: boolean;
  summonerName?: string | null;
  championLevel: number;
};

export type CombatData = {
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: Record<string, number>;
  damageReceived: Record<string, number>;
  largestKillingSpree: number;
  largestMultiKill: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
};

export type VisionData = {
  wardsPlaced: number;
  wardsDestroyed: number;
  visionScore: number;
  visionScorePerMinute: number;
  controlWardsBought: number;
};

export type EconomyData = {
  totalGold: number;
  goldSpent: number;
  csPerMinute: number;
  goldEfficiency: number;
  goldPerMinute: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  csAtEnd: number;
};

export type ChampionMetaData = {
  champion: string;
  championId: number;
  role: string;
  tier: string;
  winRate: number;
};

export type TeamCompositionData = {
  allies: TeamMemberData[];
  enemies: TeamMemberData[];
};

export type TeamMemberData = {
  championName: string;
  role: string;
};

export type RankInfoData = {
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
};

// ============================================================================
// Agent Input/Output Types
// ============================================================================
// These types represent the input and output structures for agent Lambda functions.
// Used for internal agent orchestration and Step Functions integration.

export type AgentInput = {
  keys: string[];
  sessionId: string;
  matchId: string;
  puuid: string;
  region?: string;
  year?: number;
};

export type AgentResult = {
  agentName: string;
  status: "success" | "failed" | "partial";
  analysis:
    | BuildAnalysisResult
    | CombatAnalysisResult
    | VisionAnalysisResult
    | EconomyAnalysisResult
    | ChampionAnalysisResult
    | CompetitiveAnalysisResult
    | MacroAnalysisResult
    | PositioningAnalysisResult
    | TemporalAnalysisResult
    | SynergyAnalysisResult
    | AdaptationAnalysisResult;
  timestamp: number;
  metadata?: {
    tokensUsed?: number;
    executionTimeMs?: number;
    retryCount?: number;
  };
};

// ============================================================================
// Agent Analysis Result Types
// ============================================================================
// These types represent the detailed analysis results produced by each
// specialized agent. Used internally for processing and synthesis.
export type BuildAnalysisResult = {
  buildEfficiencyScore: number;
  preferredItems: number[];
  itemTiming: Array<{ itemId: number; minute: number }>;
  goldEfficiency: number;
  recommendations: string[];
};

export type CombatAnalysisResult = {
  kdaRatio: number;
  kills: number;
  deaths: number;
  assists: number;
  damageProfile: {
    totalDealt: number;
    totalReceived: number;
    damageRatio: number;
  };
  recommendations: string[];
};

export type VisionAnalysisResult = {
  visionScore: number;
  wardsPlaced: number;
  wardsDestroyed: number;
  visionEfficiency: number;
  recommendations: string[];
};

export type EconomyAnalysisResult = {
  goldPerMinute: number;
  csPerMinute: number;
  goldEfficiency: number;
  economyScore: number;
  recommendations: string[];
};

export type ChampionAnalysisResult = {
  champion: string;
  role: string;
  tier: string;
  winRate: number;
  performanceScore: number;
  metaAlignment: string;
  recommendations: string[];
};

export type CompetitiveAnalysisResult = {
  rankTier: string;
  competitiveScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  recommendations: string[];
};

export type MacroAnalysisResult = {
  roamingEfficiency: number;
  objectiveControl: number;
  mapPressureScore: number;
  strategicDecisionQuality: number;
  recommendations: string[];
};

export type PositioningAnalysisResult = {
  lanePositioningScore: number;
  teamfightPositioningScore: number;
  riskScore: number;
  safetyScore: number;
  recommendations: string[];
};

export type TemporalAnalysisResult = {
  earlyGameScore: number;
  midGameScore: number;
  lateGameScore: number;
  powerSpikeUtilization: number;
  scalingEfficiency: number;
  recommendations: string[];
};

export type SynergyAnalysisResult = {
  teamSynergyScore: number;
  championPairingScore: number;
  coordinationScore: number;
  duoSynergyScore: number;
  recommendations: string[];
};

export type AdaptationAnalysisResult = {
  buildAdaptationScore: number;
  playstyleFlexibility: number;
  strategicPivotingScore: number;
  situationalAwareness: number;
  recommendations: string[];
};

// ============================================================================
// Type Aliases for Convenience
// ============================================================================
// Convenient union type for all possible agent analysis results

export type AnyAgentAnalysisResult =
  | BuildAnalysisResult
  | CombatAnalysisResult
  | VisionAnalysisResult
  | EconomyAnalysisResult
  | ChampionAnalysisResult
  | CompetitiveAnalysisResult
  | MacroAnalysisResult
  | PositioningAnalysisResult
  | TemporalAnalysisResult
  | SynergyAnalysisResult
  | AdaptationAnalysisResult;
