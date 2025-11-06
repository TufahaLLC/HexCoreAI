// Time constants (in seconds)
export const THIRTY_DAYS_IN_SECONDS = 2_592_000;
export const NINETY_DAYS_IN_SECONDS = 7_776_000;
export const TWO_HOURS_IN_SECONDS = 7200;

// Conversion factors
export const MILLISECONDS_TO_SECONDS = 1000;
export const MILLISECONDS_PER_MINUTE = 60_000;
export const PERCENTAGE_MULTIPLIER = 100;
export const RADIX_DECIMAL = 10;

// Environment variable constants (should be defined at runtime)
export const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;
export const SESSIONS_TABLE = process.env.AGENT_SESSIONS_TABLE || "";
export const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || "";

// Session management constants
export const SESSION_TTL_HOURS = 24;

// String operations
export const SUBSTRING_FIRST_100 = 100;
export const SUBSTRING_LAST_50 = 50;
export const SUBSTRING_START_INDEX = 0;

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
export const MAX_RETRY_DELAY = 30_000;

// Riot API limits
export const RIOT_MAX_MATCH_COUNT = 10;

// Riot Queue IDs
export const QUEUE_RANKED_SOLO_DUO = 420; // 5v5 Ranked Solo games

// Game phase timing (in minutes)
export const EARLY_GAME_TIME_MINUTES = 10;
export const MID_GAME_TIME_MINUTES = 20;
export const LATE_GAME_TIME_MINUTES = 30;

// Time conversion for timeline data
export const SECONDS_PER_MINUTE = 60;
export const MILLISECONDS_PER_SECOND = 1000;
export const TIMESTAMP_MULTIPLIER =
  SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

// Session management
export const RANDOM_SUBSTRING_START = 2;
export const RANDOM_SUBSTRING_LENGTH = 6;
export const SECONDS_PER_HOUR = 3600;
export const MILLISECONDS_TO_SECONDS_DIVISOR = 1000;
export const RANDOM_STRING_RADIX = 36;

// External API benchmark constants
export const JUNGLE_ROAM_BENCHMARK = 8.5;
export const MIDDLE_ROAM_BENCHMARK = 3.2;
export const OTHER_ROAM_BENCHMARK = 1.5;
export const MAP_COVERAGE_BENCHMARK = 72.3;
export const RECALL_FREQUENCY_BENCHMARK = 5.2;
export const JUNGLE_JUNGLE_TIME_BENCHMARK = 18.5;
export const OTHER_JUNGLE_TIME_BENCHMARK = 5.2;
export const OBJECTIVE_SETUP_TIME_BENCHMARK = -45;

// Data processing constants
export const TOP_ITEMS_LIMIT = 6;
export const DEFAULT_CONFIDENCE = 0.8;
export const MAX_JITTER_MS = 200;

// Source priority weights
export const UGG_PRIORITY = 5;
export const LOLALYTICS_PRIORITY = 4;
export const OPGG_PRIORITY = 3;
export const DATA_DRAGON_PRIORITY = 2;
export const COMMUNITY_DRAGON_PRIORITY = 1;

// Cache and data processing constants
export const TIMESTAMP_TO_MILLISECONDS = 1000;
export const CACHE_TTL_MULTIPLIER = 1000;
export const STAT_SHARD_ADAPTIVE = 5008;
export const STAT_SHARD_ADAPTIVE_COUNT = 2;
export const STAT_SHARD_MAGIC_RESIST = 5002;
export const DYNAMODB_TTL_DIVISOR = 1000;
export const DEFAULT_CHAMPION_ID = 0;
export const DEFAULT_RANK_TIER = "IRON";
export const DEFAULT_RANK_DIVISION = "IV";

// Rune IDs for placeholder data
export const KEYSSTONE_PRESSOR = 8005;
export const PERK_OVERHEAL = 9111;
export const PERK_TRIUMPH = 9103;
export const PERK_LEGEND_ALACRITY = 8014;
export const PERK_SUDDEN_IMPACT = 8139;
export const PERK_TREASURE_HUNTER = 8135;

// Item IDs for placeholder data
export const ITEM_INFINITY_EDGE = 3031;
export const ITEM_RAPID_FIRECANNON = 3094;
export const ITEM_STATIKK_SHIV = 3087;

// Benchmark values
export const DEFAULT_WIN_RATE = 52.3;
export const DEFAULT_PICK_RATE = 15.7;

// HTTP Status Codes
export const RIOT_STATUS_UNAUTHORIZED = 401;
export const RIOT_STATUS_FORBIDDEN = 403;
export const RIOT_STATUS_TOO_MANY_REQUESTS = 429;
export const RIOT_STATUS_SERVICE_UNAVAILABLE = 503;
export const RATE_LIMIT_STATUS_CODES = new Set([
  RIOT_STATUS_TOO_MANY_REQUESTS,
  RIOT_STATUS_SERVICE_UNAVAILABLE,
]);
export const RIOT_UNAUTHORIZED_STATUS_CODES = new Set([
  RIOT_STATUS_UNAUTHORIZED,
  RIOT_STATUS_FORBIDDEN,
]);

export const AGENT_NAMES = [
  "BuildAgent",
  "CombatAgent",
  "VisionAgent",
  "EconomyAgent",
  "ChampionAgent",
  "CompetitiveAgent",
  "MacroAgent",
  "PositioningAgent",
  "TemporalAgent",
  "SynergyAgent",
  "AdaptationAgent",
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

// League of Legends Game Constants

// Gold thresholds (per minute)
export const GOLD_PER_MIN_EXCELLENT = 400;
export const GOLD_PER_MIN_GOOD = 350;
export const GOLD_PER_MIN_AVERAGE = 300;
export const GOLD_EFFICIENCY_THRESHOLD = 85;
export const UNSPENT_GOLD_THRESHOLD = 2000;

// CS (Creep Score) thresholds
export const CS_PER_MIN_EXCELLENT = 10;
export const CS_PER_MIN_GOOD = 8;
export const CS_PER_MIN_AVERAGE = 6;
export const MAX_THEORETICAL_CS_PER_MIN = 10.5;
export const FARMING_EFFICIENCY_THRESHOLD = 60;
export const SUPPORT_HIGH_CS_THRESHOLD = 4.0;

// Role-specific CS benchmarks
export const CS_TOP_EXCELLENT = 8.0;
export const CS_TOP_GOOD = 7.0;
export const CS_TOP_AVERAGE = 6.0;
export const CS_JUNGLE_EXCELLENT = 7.0;
export const CS_JUNGLE_GOOD = 6.0;
export const CS_JUNGLE_AVERAGE = 5.0;
export const CS_MIDDLE_EXCELLENT = 8.5;
export const CS_MIDDLE_GOOD = 7.5;
export const CS_MIDDLE_AVERAGE = 6.5;
export const CS_BOTTOM_EXCELLENT = 9.0;
export const CS_BOTTOM_GOOD = 8.0;
export const CS_BOTTOM_AVERAGE = 7.0;
export const CS_UTILITY_EXCELLENT = 3.0;
export const CS_UTILITY_GOOD = 2.0;
export const CS_UTILITY_AVERAGE = 1.0;

// KDA thresholds
export const KDA_S_TIER = 5.0;
export const KDA_A_TIER = 3.0;
export const KDA_B_TIER = 2.0;

// Kill participation thresholds
export const KILL_PARTICIPATION_EXCELLENT = 70;
export const KILL_PARTICIPATION_GOOD = 60;
export const KILL_PARTICIPATION_AVERAGE = 50;

// Vision score thresholds (per minute)
export const VISION_SCORE_PER_MIN_EXCELLENT = 2.0;
export const VISION_SCORE_PER_MIN_GOOD = 1.5;
export const VISION_SCORE_PER_MIN_AVERAGE = 1.0;

// Item and build constants
export const MAJOR_ITEM_COST_THRESHOLD = 1000;
export const BUILD_SIMILARITY_THRESHOLD = 75;

// Champion composition thresholds
export const AP_HEAVY_THRESHOLD = 3;
export const AD_HEAVY_THRESHOLD = 3;
export const HEAL_THRESHOLD = 2;
export const TANK_THRESHOLD = 2;

// Time markers (in minutes)
export const EARLY_GAME_END = 15;
export const MID_GAME_END = 30;

// Numeric constants for calculations
export const MINUTES_PER_HOUR = 60;
export const BASE_36_RADIX = 36;
export const RANDOM_STRING_START = 2;
export const RANDOM_STRING_LENGTH = 8;

// Quality and efficiency thresholds
export const QUALITY_BONUS_MAX = 10;
export const QUALITY_BONUS_DIVISOR = 100;
export const DECIMAL_PRECISION = 10;

// String manipulation constants
export const DEBUG_STRING_LENGTH = 100;
export const DEBUG_TAIL_LENGTH = 50;

// Placeholder values for external API integration
export const PLACEHOLDER_ITEM_GOLD_VALUE = 3000;
export const PLACEHOLDER_OPTIMAL_ITEM_GOLD_VALUE = 3200;
export const GOLD_EFFICIENCY_NEGATIVE_THRESHOLD = -10;

// Optimal recall timings (in minutes)
export const RECALL_TIMING_1 = 4;
export const RECALL_TIMING_2 = 8;
export const RECALL_TIMING_3 = 12;
export const RECALL_TIMING_4 = 16;
export const RECALL_TIMING_5 = 20;

// Combat and damage thresholds
export const DAMAGE_RATIO_EXCELLENT = 1.5;
export const DAMAGE_RATIO_GOOD = 1.0;
export const MIN_TOTAL_DAMAGE_OUTPUT = 15_000;
export const PHYSICAL_DAMAGE_HEAVY_THRESHOLD = 70;
export const MAGIC_DAMAGE_HEAVY_THRESHOLD = 70;

// Death thresholds
export const LOW_DEATH_THRESHOLD = 3;
export const HIGH_DEATH_THRESHOLD = 7;

// Assist multiplier
export const ASSIST_TO_KILL_RATIO = 2;
export const MIN_ASSIST_THRESHOLD = 5;

// Competitive Analysis - Rank thresholds
export const RANK_TOP_PERCENTILE = 1;
export const RANK_CHALLENGER_THRESHOLD = 10;
export const RANK_MASTER_THRESHOLD = 50;
export const RANK_DIAMOND_THRESHOLD = 100;

// Win rate thresholds (percentages)
export const WIN_RATE_EXCELLENT = 60;
export const WIN_RATE_GOOD = 55;
export const WIN_RATE_AVERAGE = 50;
export const WIN_RATE_POOR = 45;
export const WIN_RATE_BELOW_AVERAGE = 48;
export const WIN_RATE_IRON_BRONZE_TARGET = 52;
export const WIN_RATE_SILVER_GOLD_TARGET = 53;
export const WIN_RATE_PLATINUM_PLUS_TARGET = 54;

// Game count requirements
export const MIN_GAMES_FOR_ANALYSIS = 20;
export const GAMES_FOR_RELIABLE_DATA = 50;
export const GAMES_FOR_STATISTICAL_SIGNIFICANCE = 100;

// LP (League Points) thresholds
export const LP_GAIN_EXCELLENT = 20;
export const LP_GAIN_GOOD = 18;
export const LP_GAIN_HEALTHY_MIN = 18;
export const LP_GAIN_HEALTHY_MAX = 22;
export const LP_GAIN_AVERAGE = 15;
export const LP_LOSS_THRESHOLD = 15;
export const LP_CLIMB_POSITIVE = 2;
export const LP_CLIMB_NEGATIVE = -2;
export const LP_BUFFER_SAFE = 75;
export const LP_MAX = 100;

// Percentiles
export const PERCENTILE_TOP = 75;
export const PERCENTILE_MEDIAN = 50;
export const PERCENTILE_BOTTOM = 25;

// Champion pool recommendations
export const CHAMPION_POOL_MIN = 2;
export const CHAMPION_POOL_IDEAL_MIN = 3;
export const CHAMPION_POOL_IDEAL_MAX = 4;
export const CHAMPION_POOL_MAX = 5;

// Rank climb benchmarks (games to climb)
export const GAMES_TO_CLIMB_IRON = 40;
export const GAMES_TO_CLIMB_BRONZE = 50;
export const GAMES_TO_CLIMB_SILVER = 60;
export const GAMES_TO_CLIMB_GOLD_PLUS = 70;

// Performance consistency thresholds
export const KDA_CONSISTENCY_EXCELLENT = 1.0;
export const KDA_CONSISTENCY_GOOD = 1.5;
export const CS_CONSISTENCY_EXCELLENT = 30;
export const CS_CONSISTENCY_GOOD = 50;
export const KDA_MINIMUM_HEALTHY = 2.5;

// Promotion readiness score weights
export const READINESS_WIN_RATE_WEIGHT = 0.4;
export const READINESS_KDA_WEIGHT = 0.3;
export const READINESS_CS_WEIGHT = 0.2;
export const READINESS_LP_WEIGHT = 0.1;
export const READINESS_KDA_TARGET = 5.0;
export const READINESS_CS_TARGET = 250;
export const READINESS_SCORE_READY = 75;
export const READINESS_SCORE_NEARLY_READY = 60;
export const READINESS_SCORE_NEEDS_IMPROVEMENT = 45;

// Build Analysis - Item cost tiers
export const BASIC_ITEM_COST = 1000;
export const COMPONENT_ITEM_COST = 1300;
export const LEGENDARY_ITEM_COST = 2800;
export const MYTHIC_ITEM_COST = 3200;

// Power spike timings (in minutes)
export const FIRST_ITEM_SPIKE = 10;
export const TWO_ITEM_SPIKE = 15;
export const THREE_ITEM_SPIKE = 20;
export const FULL_BUILD_TIME = 30;

// Build thresholds
export const MAX_ITEM_SLOTS = 6;
export const BOOTS_SLOT = 1;
export const BUILD_EFFICIENCY_EXCELLENT = 90;
export const BUILD_EFFICIENCY_GOOD = 80;

// Item timing thresholds (in minutes)
export const EARLY_FIRST_ITEM = 8;
export const AVERAGE_FIRST_ITEM = 10;
export const LATE_FIRST_ITEM = 12;

// External API Client - Retry delays (in milliseconds)
export const RETRY_DELAY_SHORT = 1000;
export const RETRY_DELAY_MEDIUM = 2000;
export const RETRY_DELAY_LONG = 5000;

// Timeout values (in milliseconds)
export const API_TIMEOUT_SHORT = 5000;
export const API_TIMEOUT_MEDIUM = 10_000;
export const API_TIMEOUT_LONG = 30_000;

// Cache TTL (in seconds)
export const CACHE_TTL_SHORT = 300; // 5 minutes
export const CACHE_TTL_MEDIUM = 1800; // 30 minutes
export const CACHE_TTL_LONG = 3600; // 1 hour

// Rate limiting
export const RATE_LIMIT_REQUESTS_PER_SECOND = 20;
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 100;

// Vision Analysis - Vision score thresholds (total)
export const VISION_SCORE_EXCELLENT_TOTAL = 50;
export const VISION_SCORE_GOOD_TOTAL = 40;
export const VISION_SCORE_AVERAGE_TOTAL = 30;

// Ward thresholds
export const WARDS_PLACED_EXCELLENT = 20;
export const WARDS_PLACED_GOOD = 15;
export const WARDS_PLACED_AVERAGE = 10;

// Control ward thresholds
export const CONTROL_WARDS_EXCELLENT = 10;
export const CONTROL_WARDS_GOOD = 7;
export const CONTROL_WARDS_AVERAGE = 5;

// Vision denial
export const WARDS_CLEARED_EXCELLENT = 10;
export const WARDS_CLEARED_GOOD = 7;
export const WARDS_CLEARED_AVERAGE = 5;

// Map divisions
export const MAP_QUADRANTS = 4;
export const WARD_DURATION_SECONDS = 90;
export const CONTROL_WARD_COST = 75;

// Champion Analysis - Mastery levels
export const MASTERY_LEVEL_MAX = 7;
export const MASTERY_LEVEL_PROFICIENT = 5;
export const MASTERY_LEVEL_COMPETENT = 3;

// Mastery points
export const MASTERY_POINTS_LEVEL_5 = 21_600;
export const MASTERY_POINTS_LEVEL_6 = 50_000;
export const MASTERY_POINTS_LEVEL_7 = 100_000;

// Per-champion thresholds
export const CHAMPION_GAMES_MIN = 10;
export const CHAMPION_GAMES_PROFICIENT = 30;
export const CHAMPION_GAMES_MASTERY = 50;

// Champion-specific win rates
export const CHAMPION_WIN_RATE_EXCELLENT = 60;
export const CHAMPION_WIN_RATE_GOOD = 55;

// Riot API - API versions
export const RIOT_API_VERSION = 4;
export const DATA_DRAGON_VERSION = 13;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Match history limits
export const MATCH_HISTORY_DEFAULT = 20;
export const MATCH_HISTORY_MAX = 100;

// Temporal Analysis - Game phases
export const LATE_GAME_START = 30;
export const GAME_MAX_DURATION = 60;
export const TIME_WINDOW_MINUTES = 5;

// Session Management
export const SESSION_TIMEOUT_SECONDS = 3600; // 1 hour
export const SESSION_CLEANUP_INTERVAL = 300; // 5 minutes
export const MAX_CONCURRENT_SESSIONS = 100;

// Analysis quality
export const MIN_ANALYSIS_LENGTH = 50;
export const IDEAL_ANALYSIS_LENGTH = 200;

// Exponentiation for variance calculations
export const VARIANCE_EXPONENT = 2;

// Item ID constants (placeholder values for external API integration)
export const ITEM_ID_PHANTOM_DANCER = 3046;
export const ITEM_ID_INFINITY_EDGE = 3031;
export const ITEM_ID_RAPID_FIRECANNON = 3094;
export const ITEM_ID_BERSERKER_GREAVES = 3006;
export const ITEM_ID_MORTAL_REMINDER = 3033;
export const ITEM_ID_MAW_OF_MALMORTIUS = 3156;
export const ITEM_ID_GUARDIAN_ANGEL = 3026;
export const ITEM_ID_MERCURIAL_SCIMITAR = 3139;
export const ITEM_ID_QUICKSILVER_SASH = 3140; // QSS component
export const ITEM_ID_DORANS_BLADE = 1055;
export const ITEM_ID_HEALTH_POTION = 2003;

// Build path phases
export const BUILD_PHASE_EARLY = "early";
export const BUILD_PHASE_MID = "mid";
export const BUILD_PHASE_LATE = "late";
