// Time constants (in seconds)
export const THIRTY_DAYS_IN_SECONDS = 2_592_000;
export const NINETY_DAYS_IN_SECONDS = 7_776_000;
export const TWO_HOURS_IN_SECONDS = 7200;

// Conversion factors
export const MILLISECONDS_TO_SECONDS = 1000;
export const MILLISECONDS_PER_MINUTE = 60_000;
export const PERCENTAGE_MULTIPLIER = 100;

// Agent calculation constants
export const MIN_DEATHS_FOR_KDA = 1;

// Date constants
export const YEAR_START_MONTH = 1; // January
export const YEAR_START_DAY = 1;
export const YEAR_END_MONTH = 12; // December
export const YEAR_END_DAY = 31;

// Retry configuration
export const DEFAULT_MAX_RETRIES = 5;
export const BACKOFF_BASE_MS = 1000;
export const BACKOFF_MULTIPLIER = 2;
export const BACKOFF_JITTER_RANGE_MS = 1000;

// HTTP Status Codes
export const RIOT_STATUS_TOO_MANY_REQUESTS = 429;
export const RIOT_STATUS_SERVICE_UNAVAILABLE = 503;
export const RATE_LIMIT_STATUS_CODES = new Set([
  RIOT_STATUS_TOO_MANY_REQUESTS,
  RIOT_STATUS_SERVICE_UNAVAILABLE,
]);

export const AGENT_NAMES = [
  "BuildAgent",
  "CombatAgent",
  "VisionAgent",
  "EconomyAgent",
  "ChampionAgent",
  "CompetitiveAgent",
  "Synthesizer",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

// Status values for validation schemas
export const WEB_SOCKET_STATUSES = [
  "started",
  "processing",
  "completed",
  "error",
] as const;

export const AGENT_RESULT_STATUSES = ["success", "failed", "partial"] as const;

export type WebSocketStatus = (typeof WEB_SOCKET_STATUSES)[number];
export type AgentResultStatus = (typeof AGENT_RESULT_STATUSES)[number];

// Region values for validation schemas
export const REGIONS = ["americas", "europe", "asia"] as const;
export type Region = (typeof REGIONS)[number];

// Schema constants
export const SCHEMA_VERSION = "1.0" as const;
export const EVENT_SOURCE = "hexcore.match.processor" as const;
export const EVENT_DETAIL_TYPE = "match.filtered.ready" as const;

// Magic numbers for validation
export const FOUR_DIGIT_YEAR_REGEX = /^\d{4}$/;
export const PROGRESS_PERCENTAGE_MIN = 0;
export const PROGRESS_PERCENTAGE_MAX = 100;
export const MATCH_YEAR_MIN = 2020;
export const MATCH_YEAR_MAX = 2030;
export const MIN_ARRAY_LENGTH = 1;
